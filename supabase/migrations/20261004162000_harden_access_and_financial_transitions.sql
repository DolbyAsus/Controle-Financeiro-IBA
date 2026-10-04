-- Correções de segurança antes da homologação com dados reais.
-- A escrita continua passando pelo usuário autenticado, mas o banco passa a
-- proteger ator, transições de cotação e relações estruturais diretamente.

drop policy if exists profile_read on public.users_profile;
create policy profile_read_self_or_admin on public.users_profile for select to authenticated
  using (id = auth.uid() or (private.current_user_role() = 'admin' and church_id = private.current_user_church_id()));

-- A criação continua permitida às funções do app, mas transições financeiras
-- não podem ser manipuladas diretamente pela Data API.
drop policy if exists quotation_write on public.quotations;
create policy quotation_insert on public.quotations for insert to authenticated
  with check (private.can_manage_quotation() and private.has_project_access(project_id));
revoke update on table public.quotations from authenticated;

drop policy if exists income_write on public.income_entries;
create policy income_insert on public.income_entries for insert to authenticated
  with check (private.can_manage_finance() and private.has_project_access(project_id));
revoke update on table public.income_entries from authenticated;

drop policy if exists audit_read on public.audit_logs;
create policy audit_read_finance_managers on public.audit_logs for select to authenticated
  using (private.can_manage_finance());

create function private.assert_google_drive_url()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare url text := to_jsonb(new)->>tg_argv[0];
begin
  if url is not null and nullif(trim(url), '') is not null
    and trim(url) !~* '^https://(drive|docs)\.google\.com(/|$)' then
    raise exception 'Use apenas links HTTPS do Google Drive';
  end if;
  return new;
end;
$$;

create function private.keep_stage_category_project()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.project_id is distinct from old.project_id then
    raise exception 'Não é permitido mover uma etapa ou categoria para outro projeto';
  end if;
  return new;
end;
$$;

create function private.force_financial_actors()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_table_name = 'income_entries' then
    new.registered_by := auth.uid();
  elsif tg_op = 'INSERT' then
    new.created_by := auth.uid(); new.updated_by := auth.uid();
  else
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

create function private.protect_quotation_lifecycle()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then return new; end if;
  if old.status in ('aprovada_para_orcamento', 'nao_selecionada', 'cancelada', 'vencida') then
    raise exception 'Não é permitido alterar uma cotação encerrada';
  end if;
  if new.status in ('nao_selecionada', 'cancelada')
    and current_setting('app.quotation_finish', true) is distinct from 'true' then
    raise exception 'O encerramento de cotação exige justificativa';
  end if;
  return new;
end;
$$;

create trigger protect_stage_project before update on public.project_stages for each row execute function private.keep_stage_category_project();
create trigger protect_category_project before update on public.categories for each row execute function private.keep_stage_category_project();
create trigger quotation_actor before insert or update on public.quotations for each row execute function private.force_financial_actors();
create trigger income_actor before insert or update on public.income_entries for each row execute function private.force_financial_actors();
create trigger quotation_drive_url before insert or update on public.quotations for each row execute function private.assert_google_drive_url('drive_document_url');
create trigger budget_drive_url before insert or update on public.budgets for each row execute function private.assert_google_drive_url('drive_document_url');
create trigger expense_drive_url before insert or update on public.expenses for each row execute function private.assert_google_drive_url('drive_document_url');
create trigger payment_drive_url before insert or update on public.payments for each row execute function private.assert_google_drive_url('drive_receipt_url');
create trigger income_drive_url before insert or update on public.income_entries for each row execute function private.assert_google_drive_url('drive_receipt_url');
create trigger quotation_lifecycle before update on public.quotations for each row execute function private.protect_quotation_lifecycle();

create function private.finish_quotation(target_quotation_id uuid, target_status public.quotation_status, justification text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare quotation public.quotations;
begin
  if not private.can_manage_quotation() then raise exception 'Sem permissão para encerrar cotação'; end if;
  if target_status not in ('nao_selecionada', 'cancelada') then raise exception 'Status de encerramento inválido'; end if;
  if nullif(trim(justification), '') is null then raise exception 'A justificativa é obrigatória'; end if;
  select * into quotation from public.quotations where id = target_quotation_id for update;
  if not found or not private.has_project_access(quotation.project_id) then raise exception 'Cotação não encontrada'; end if;
  if quotation.status not in ('recebida', 'em_analise') then raise exception 'Apenas cotações em análise podem ser encerradas'; end if;
  perform set_config('app.quotation_finish', 'true', true);
  update public.quotations set status = target_status,
    notes = concat_ws(E'\n', quotation.notes, case when target_status = 'cancelada' then 'Cancelamento: ' else 'Não selecionada: ' end || trim(justification)),
    updated_by = auth.uid() where id = quotation.id;
end;
$$;
create function public.finish_quotation(target_quotation_id uuid, target_status public.quotation_status, justification text)
returns void language sql security invoker set search_path = public, private, pg_temp as $$
  select private.finish_quotation(target_quotation_id, target_status, justification)
$$;
revoke all on function private.finish_quotation(uuid, public.quotation_status, text), public.finish_quotation(uuid, public.quotation_status, text) from public, anon;
grant execute on function private.finish_quotation(uuid, public.quotation_status, text), public.finish_quotation(uuid, public.quotation_status, text) to authenticated;

create or replace function private.manage_user_profile(target_user_id uuid, target_role public.user_role, target_status public.active_status)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare target_profile public.users_profile; active_admins integer;
begin
  if private.current_user_role() <> 'admin' then raise exception 'Somente Administrador pode gerenciar usuários'; end if;
  if target_user_id = auth.uid() then raise exception 'Use outro Administrador para alterar o próprio perfil'; end if;
  select * into target_profile from public.users_profile where id = target_user_id for update;
  if not found or target_profile.church_id <> private.current_user_church_id() then raise exception 'Usuário não encontrado na igreja atual'; end if;
  if target_profile.role = 'admin' and target_profile.status = 'ativo' and (target_role <> 'admin' or target_status <> 'ativo') then
    select count(*) into active_admins from public.users_profile where church_id = target_profile.church_id and role = 'admin' and status = 'ativo';
    if active_admins <= 1 then raise exception 'A igreja precisa manter ao menos um Administrador ativo'; end if;
  end if;
  update public.users_profile set role = target_role, status = target_status where id = target_user_id;
end;
$$;
