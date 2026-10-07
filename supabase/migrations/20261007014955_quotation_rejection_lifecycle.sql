-- O fluxo de cotação passa a ter somente três estados operacionais:
-- Em análise, Aprovada e Reprovada. Estados encerrados não podem ser alterados.

do $$
begin
  if exists (
    select 1
    from pg_enum enum_value
    join pg_type enum_type on enum_type.oid = enum_value.enumtypid
    join pg_namespace enum_schema on enum_schema.oid = enum_type.typnamespace
    where enum_schema.nspname = 'public'
      and enum_type.typname = 'quotation_status'
      and enum_value.enumlabel = 'aprovada_para_orcamento'
  ) then
    alter type public.quotation_status rename value 'aprovada_para_orcamento' to 'aprovada';
  end if;

  if exists (
    select 1
    from pg_enum enum_value
    join pg_type enum_type on enum_type.oid = enum_value.enumtypid
    join pg_namespace enum_schema on enum_schema.oid = enum_type.typnamespace
    where enum_schema.nspname = 'public'
      and enum_type.typname = 'quotation_status'
      and enum_value.enumlabel = 'nao_selecionada'
  ) then
    alter type public.quotation_status rename value 'nao_selecionada' to 'reprovada';
  end if;
end;
$$;

alter table public.quotations
  add column if not exists rejection_justification text,
  add column if not exists rejected_by uuid references public.users_profile(id),
  add column if not exists rejected_at timestamptz;

alter table public.quotations
  alter column status set default 'em_analise'::public.quotation_status;

-- O gatilho de orçamento existente precisa ser atualizado antes que qualquer
-- cotação seja alterada, pois a enumeração acima já mudou de nome.
create or replace function private.prevent_orphan_quotation_approval()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = 'aprovada'::public.quotation_status and not exists (
    select 1 from public.budgets where quotation_id = new.id
  ) then
    raise exception 'Aprovação de cotação deve criar o orçamento correspondente';
  end if;
  return new;
end;
$$;

-- A alteração preserva o histórico das cotações já existentes. O ator original
-- não é substituído por uma execução de migração.
alter table public.quotations disable trigger quotation_actor;
alter table public.quotations disable trigger quotation_lifecycle;

update public.quotations
set
  status = case
    when status = 'recebida'::public.quotation_status then 'em_analise'::public.quotation_status
    when status in ('cancelada'::public.quotation_status, 'vencida'::public.quotation_status) then 'reprovada'::public.quotation_status
    else status
  end,
  rejection_justification = case
    when status in ('cancelada'::public.quotation_status, 'vencida'::public.quotation_status, 'reprovada'::public.quotation_status)
      then coalesce(nullif(trim(notes), ''), 'Cotação reprovada durante a atualização do fluxo.')
    else rejection_justification
  end,
  rejected_at = case
    when status in ('cancelada'::public.quotation_status, 'vencida'::public.quotation_status, 'reprovada'::public.quotation_status)
      then coalesce(rejected_at, updated_at, created_at)
    else rejected_at
  end,
  rejected_by = case
    when status in ('cancelada'::public.quotation_status, 'vencida'::public.quotation_status, 'reprovada'::public.quotation_status)
      then coalesce(rejected_by, updated_by, created_by)
    else rejected_by
  end
where status in (
  'recebida'::public.quotation_status,
  'cancelada'::public.quotation_status,
  'vencida'::public.quotation_status
)
or (
  status = 'reprovada'::public.quotation_status
  and (
    nullif(trim(rejection_justification), '') is null
    or rejected_at is null
  )
);

alter table public.quotations enable trigger quotation_actor;
alter table public.quotations enable trigger quotation_lifecycle;

alter table public.quotations
  drop constraint if exists quotation_status_current,
  add constraint quotation_status_current
    check (status in ('em_analise'::public.quotation_status, 'aprovada'::public.quotation_status, 'reprovada'::public.quotation_status)),
  drop constraint if exists quotation_rejection_details,
  add constraint quotation_rejection_details
    check (
      status <> 'reprovada'::public.quotation_status
      or nullif(trim(rejection_justification), '') is not null
    );

create or replace function private.protect_quotation_lifecycle()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.status in ('aprovada'::public.quotation_status, 'reprovada'::public.quotation_status) then
    raise exception 'Não é permitido alterar uma cotação encerrada';
  end if;
  if new.status = 'reprovada'::public.quotation_status then
    if current_setting('app.quotation_rejection', true) is distinct from 'true' then
      raise exception 'A reprovação de cotação exige justificativa';
    end if;
    if nullif(trim(new.rejection_justification), '') is null or new.rejected_by is null or new.rejected_at is null then
      raise exception 'A reprovação de cotação exige justificativa e responsável';
    end if;
  end if;
  return new;
end;
$$;

drop policy if exists quotation_insert on public.quotations;
create policy quotation_insert
on public.quotations for insert to authenticated
with check (
  private.can_manage_project_quotation(project_id)
  and status = 'em_analise'::public.quotation_status
);

create or replace function private.approve_quotation(target_quotation_id uuid, justification text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  quotation public.quotations;
  budget_id uuid;
begin
  if nullif(trim(justification), '') is null then
    raise exception 'A justificativa da escolha é obrigatória';
  end if;

  select * into quotation from public.quotations where id = target_quotation_id for update;
  if not found or not private.has_project_access(quotation.project_id) then
    raise exception 'Cotação não encontrada';
  end if;
  if not private.can_manage_project_quotation(quotation.project_id) then
    raise exception 'Sem permissão para aprovar cotação neste projeto';
  end if;
  if quotation.status <> 'em_analise'::public.quotation_status then
    raise exception 'Esta cotação não pode ser aprovada no status atual';
  end if;

  insert into public.budgets (
    project_id, stage_id, category_id, quotation_id, title, description,
    supplier_id, budget_value, payment_method, payment_terms,
    drive_document_url, choice_justification, quotation_approved_by,
    status, created_by, updated_by
  ) values (
    quotation.project_id, quotation.stage_id, quotation.category_id,
    quotation.id, quotation.title, quotation.description, quotation.supplier_id,
    quotation.total_value, quotation.payment_method, quotation.payment_terms,
    quotation.drive_document_url, trim(justification), auth.uid(),
    case when quotation.supplier_id is null then 'fornecedor_pendente'::public.budget_status
         else 'aguardando_aprovacao_financeira'::public.budget_status end,
    auth.uid(), auth.uid()
  ) returning id into budget_id;

  update public.quotations
  set status = 'aprovada'::public.quotation_status,
      updated_by = auth.uid()
  where id = quotation.id;

  return budget_id;
end;
$$;

create or replace function private.reject_quotation(target_quotation_id uuid, justification text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare quotation public.quotations;
begin
  if nullif(trim(justification), '') is null then
    raise exception 'A justificativa da reprovação é obrigatória';
  end if;

  select * into quotation from public.quotations where id = target_quotation_id for update;
  if not found or not private.has_project_access(quotation.project_id) then
    raise exception 'Cotação não encontrada';
  end if;
  if not private.can_manage_project_quotation(quotation.project_id) then
    raise exception 'Sem permissão para reprovar cotação neste projeto';
  end if;
  if quotation.status <> 'em_analise'::public.quotation_status then
    raise exception 'Apenas cotações em análise podem ser reprovadas';
  end if;

  perform set_config('app.quotation_rejection', 'true', true);
  update public.quotations
  set status = 'reprovada'::public.quotation_status,
      rejection_justification = trim(justification),
      rejected_by = auth.uid(),
      rejected_at = now(),
      notes = concat_ws(E'\n', quotation.notes, 'Reprovação: ' || trim(justification)),
      updated_by = auth.uid()
  where id = quotation.id;
end;
$$;

create or replace function public.reject_quotation(target_quotation_id uuid, justification text)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.reject_quotation(target_quotation_id, justification)
$$;

revoke all on function private.reject_quotation(uuid, text), public.reject_quotation(uuid, text) from public, anon;
grant execute on function private.reject_quotation(uuid, text), public.reject_quotation(uuid, text) to authenticated;

revoke all on function private.finish_quotation(uuid, public.quotation_status, text), public.finish_quotation(uuid, public.quotation_status, text) from public, anon, authenticated;
