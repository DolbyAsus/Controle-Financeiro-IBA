-- Gestão Financeira de Projetos da Igreja — schema inicial
-- Todas as regras de fluxo financeiro relevantes são aplicadas no banco.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;

create type public.user_role as enum ('admin', 'financeiro', 'aprovador', 'visualizador');
create type public.active_status as enum ('ativo', 'inativo');
create type public.project_status as enum ('planejado', 'em_andamento', 'pausado', 'concluido', 'cancelado');
create type public.category_type as enum ('entrada', 'saida', 'ambos');
create type public.quotation_status as enum ('recebida', 'em_analise', 'aprovada_para_orcamento', 'nao_selecionada', 'cancelada', 'vencida');
create type public.budget_status as enum ('fornecedor_pendente', 'aguardando_aprovacao_financeira', 'aprovado_como_despesa', 'reprovado', 'cancelado');
create type public.expense_status as enum ('aprovada', 'parcialmente_paga', 'paga', 'cancelada');
create type public.income_status as enum ('recebida', 'cancelada');

create table public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  church_id uuid not null references public.churches(id),
  name text not null check (char_length(trim(name)) >= 2),
  email text not null unique,
  phone text,
  church_function text,
  role public.user_role not null default 'visualizador',
  status public.active_status not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),
  name text not null,
  description text,
  project_type text,
  start_date date,
  expected_end_date date,
  status public.project_status not null default 'planejado',
  main_responsible text,
  notes text,
  created_by uuid references public.users_profile(id),
  updated_by uuid references public.users_profile(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (church_id, name)
);

create table public.project_stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  code text,
  name text not null,
  description text,
  sort_order integer not null default 0 check (sort_order >= 0),
  planned_budget numeric(14,2) not null default 0 check (planned_budget >= 0),
  expected_start_date date,
  expected_end_date date,
  status public.active_status not null default 'ativo',
  notes text,
  created_by uuid references public.users_profile(id),
  updated_by uuid references public.users_profile(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name),
  unique (project_id, sort_order)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  name text not null,
  type public.category_type not null,
  description text,
  status public.active_status not null default 'ativo',
  created_by uuid references public.users_profile(id),
  updated_by uuid references public.users_profile(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),
  name text not null,
  person_type text check (person_type in ('pessoa_fisica', 'pessoa_juridica', 'outro')),
  document text,
  main_contact text,
  phone text,
  email text,
  address text,
  main_category_id uuid references public.categories(id),
  status text not null default 'ativo' check (status in ('ativo', 'inativo', 'bloqueado')),
  notes text,
  created_by uuid references public.users_profile(id),
  updated_by uuid references public.users_profile(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  stage_id uuid not null references public.project_stages(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  title text not null,
  description text,
  proponent_name text not null,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  proponent_phone text,
  proponent_email text,
  total_value numeric(14,2) not null check (total_value > 0),
  execution_deadline text,
  quotation_date date,
  proposal_valid_until date,
  payment_method text,
  payment_terms text,
  included_scope text,
  excluded_scope text,
  warranty text,
  notes text,
  drive_document_url text,
  status public.quotation_status not null default 'recebida',
  created_by uuid references public.users_profile(id),
  updated_by uuid references public.users_profile(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  stage_id uuid not null references public.project_stages(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  quotation_id uuid not null unique references public.quotations(id) on delete restrict,
  title text not null,
  description text,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  free_recipient text,
  budget_value numeric(14,2) not null check (budget_value > 0),
  payment_method text,
  payment_terms text,
  expected_date date,
  competence text,
  drive_document_url text,
  choice_justification text not null,
  quotation_approved_by uuid not null references public.users_profile(id),
  quotation_approved_at timestamptz not null default now(),
  status public.budget_status not null,
  created_by uuid references public.users_profile(id),
  updated_by uuid references public.users_profile(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (competence is null or competence ~ '^\\d{4}-(0[1-9]|1[0-2])$')
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  stage_id uuid not null references public.project_stages(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  budget_id uuid not null unique references public.budgets(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  free_recipient text,
  description text not null,
  approved_value numeric(14,2) not null check (approved_value > 0),
  paid_value numeric(14,2) not null default 0 check (paid_value >= 0),
  remaining_value numeric(14,2) not null check (remaining_value >= 0),
  expected_date date,
  competence text,
  status public.expense_status not null default 'aprovada',
  drive_document_url text,
  approved_by uuid not null references public.users_profile(id),
  approved_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (supplier_id is not null or nullif(trim(free_recipient), '') is not null),
  check (competence is null or competence ~ '^\\d{4}-(0[1-9]|1[0-2])$')
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null,
  payment_method text,
  drive_receipt_url text,
  registered_by uuid not null references public.users_profile(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.income_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  category_id uuid references public.categories(id) on delete restrict,
  received_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  status public.income_status not null default 'recebida',
  origin text not null,
  description text,
  payment_method text,
  competence text,
  drive_receipt_url text,
  registered_by uuid not null references public.users_profile(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (competence is null or competence ~ '^\\d{4}-(0[1-9]|1[0-2])$')
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references public.churches(id),
  project_id uuid references public.projects(id) on delete restrict,
  user_id uuid references public.users_profile(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  notes text,
  created_at timestamptz not null default now()
);

insert into public.churches (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Igreja Batista da Aliança');

insert into public.projects (id, church_id, name, description, project_type, status)
values (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Colégio Batista',
  'Projeto inicial da comissão de obras.',
  'Obra',
  'em_andamento'
);

-- Perfil automático: metadados são usados apenas para o nome de exibição;
-- o papel sempre nasce como visualizador e nunca vem do JWT/metadados.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare church_uuid uuid;
begin
  select id into church_uuid from public.churches where name = 'Igreja Batista da Aliança' limit 1;
  if church_uuid is null then raise exception 'A igreja inicial precisa existir antes de criar usuários'; end if;
  insert into public.users_profile (id, church_id, name, email)
  values (
    new.id,
    church_uuid,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create index quotations_project_status_idx on public.quotations (project_id, status, created_at desc);
create index budgets_project_status_idx on public.budgets (project_id, status, expected_date);
create index expenses_project_status_idx on public.expenses (project_id, status, expected_date);
create index payments_project_date_idx on public.payments (project_id, payment_date desc);
create index incomes_project_date_idx on public.income_entries (project_id, received_date desc);
create index audit_logs_project_created_idx on public.audit_logs (project_id, created_at desc);

create function private.current_user_church_id()
returns uuid language sql stable security definer set search_path = public, pg_temp as $$
  select church_id from public.users_profile where id = (select auth.uid()) and status = 'ativo'
$$;

create function private.current_user_role()
returns public.user_role language sql stable security definer set search_path = public, pg_temp as $$
  select role from public.users_profile where id = (select auth.uid()) and status = 'ativo'
$$;

create function private.can_manage_finance()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select private.current_user_role() in ('admin', 'financeiro')
$$;

create function private.can_manage_quotation()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select private.current_user_role() in ('admin', 'financeiro', 'aprovador')
$$;

create function private.has_project_access(target_project_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.projects p
    where p.id = target_project_id and p.church_id = private.current_user_church_id()
  )
$$;

revoke all on all functions in schema private from public;
grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

create function private.set_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function private.derive_expected_competence()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.expected_date is not null then new.competence := to_char(new.expected_date, 'YYYY-MM'); end if;
  return new;
end;
$$;

create function private.derive_received_competence()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.received_date is not null then new.competence := to_char(new.received_date, 'YYYY-MM'); end if;
  return new;
end;
$$;

create function private.assert_project_relations()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare row_data jsonb := to_jsonb(new);
begin
  if not exists (select 1 from public.project_stages where id = (row_data->>'stage_id')::uuid and project_id = (row_data->>'project_id')::uuid) then
    raise exception 'A etapa precisa pertencer ao projeto informado';
  end if;
  if not exists (select 1 from public.categories where id = (row_data->>'category_id')::uuid and project_id = (row_data->>'project_id')::uuid) then
    raise exception 'A categoria precisa pertencer ao projeto informado';
  end if;
  if row_data ? 'supplier_id' and row_data->>'supplier_id' is not null and not exists (
    select 1 from public.suppliers s join public.projects p on p.id = (row_data->>'project_id')::uuid
    where s.id = (row_data->>'supplier_id')::uuid and s.church_id = p.church_id
  ) then raise exception 'O fornecedor precisa pertencer à igreja do projeto'; end if;
  return new;
end;
$$;

create function private.assert_income_category()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.category_id is not null and not exists (
    select 1 from public.categories where id = new.category_id and project_id = new.project_id and type in ('entrada', 'ambos')
  ) then raise exception 'A categoria da entrada deve pertencer ao projeto e aceitar entradas'; end if;
  return new;
end;
$$;

create function private.audit_row_change()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare new_data jsonb; old_data jsonb; entity uuid; project uuid; church uuid;
begin
  new_data := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  old_data := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  entity := coalesce((new_data->>'id')::uuid, (old_data->>'id')::uuid);
  project := coalesce((new_data->>'project_id')::uuid, (old_data->>'project_id')::uuid);
  church := coalesce((new_data->>'church_id')::uuid, (old_data->>'church_id')::uuid, private.current_user_church_id());
  insert into public.audit_logs (church_id, project_id, user_id, action, entity_type, entity_id, old_value, new_value)
  values (church, project, auth.uid(), lower(tg_op), tg_table_name, entity, old_data, new_data);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create function private.prevent_orphan_quotation_approval()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.status = 'aprovada_para_orcamento' and not exists (
    select 1 from public.budgets where quotation_id = new.id
  ) then
    raise exception 'Aprovação de cotação deve criar o orçamento correspondente';
  end if;
  return new;
end;
$$;

create function private.sync_expense_payment_status()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare total_paid numeric(14,2); expense_total numeric(14,2);
begin
  select coalesce(sum(amount), 0) into total_paid from public.payments where expense_id = new.expense_id;
  select approved_value into expense_total from public.expenses where id = new.expense_id for update;
  update public.expenses set
    paid_value = total_paid,
    remaining_value = greatest(expense_total - total_paid, 0),
    status = case when total_paid >= expense_total then 'paga' when total_paid > 0 then 'parcialmente_paga' else 'aprovada' end
  where id = new.expense_id;
  return new;
end;
$$;

create trigger set_church_updated_at before update on public.churches for each row execute function private.set_updated_at();
create trigger set_profile_updated_at before update on public.users_profile for each row execute function private.set_updated_at();
create trigger set_project_updated_at before update on public.projects for each row execute function private.set_updated_at();
create trigger set_stage_updated_at before update on public.project_stages for each row execute function private.set_updated_at();
create trigger set_category_updated_at before update on public.categories for each row execute function private.set_updated_at();
create trigger set_supplier_updated_at before update on public.suppliers for each row execute function private.set_updated_at();
create trigger set_quotation_updated_at before update on public.quotations for each row execute function private.set_updated_at();
create trigger set_budget_updated_at before update on public.budgets for each row execute function private.set_updated_at();
create trigger set_expense_updated_at before update on public.expenses for each row execute function private.set_updated_at();
create trigger set_payment_updated_at before update on public.payments for each row execute function private.set_updated_at();
create trigger set_income_updated_at before update on public.income_entries for each row execute function private.set_updated_at();
create trigger quotation_relations before insert or update on public.quotations for each row execute function private.assert_project_relations();
create trigger budget_relations before insert or update on public.budgets for each row execute function private.assert_project_relations();
create trigger expense_relations before insert or update on public.expenses for each row execute function private.assert_project_relations();
create trigger income_category before insert or update on public.income_entries for each row execute function private.assert_income_category();
create trigger budget_competence before insert or update on public.budgets for each row execute function private.derive_expected_competence();
create trigger expense_competence before insert or update on public.expenses for each row execute function private.derive_expected_competence();
create trigger income_competence before insert or update on public.income_entries for each row execute function private.derive_received_competence();
create trigger quotation_approval_requires_budget before update on public.quotations for each row execute function private.prevent_orphan_quotation_approval();
create trigger payment_sync after insert on public.payments for each row execute function private.sync_expense_payment_status();

create function private.approve_quotation(target_quotation_id uuid, justification text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare q public.quotations; budget_id uuid;
begin
  if not private.can_manage_quotation() then raise exception 'Sem permissão para aprovar cotação'; end if;
  if nullif(trim(justification), '') is null then raise exception 'A justificativa da escolha é obrigatória'; end if;
  select * into q from public.quotations where id = target_quotation_id for update;
  if not found or not private.has_project_access(q.project_id) then raise exception 'Cotação não encontrada'; end if;
  if q.status not in ('recebida', 'em_analise') then raise exception 'Esta cotação não pode ser aprovada no status atual'; end if;
  insert into public.budgets (project_id, stage_id, category_id, quotation_id, title, description, supplier_id, budget_value, payment_method, payment_terms, drive_document_url, choice_justification, quotation_approved_by, status, created_by, updated_by)
  values (q.project_id, q.stage_id, q.category_id, q.id, q.title, q.description, q.supplier_id, q.total_value, q.payment_method, q.payment_terms, q.drive_document_url, trim(justification), auth.uid(), case when q.supplier_id is null then 'fornecedor_pendente' else 'aguardando_aprovacao_financeira' end, auth.uid(), auth.uid())
  returning id into budget_id;
  update public.quotations set status = 'aprovada_para_orcamento', updated_by = auth.uid() where id = q.id;
  return budget_id;
end;
$$;

create function private.resolve_budget_recipient(target_budget_id uuid, target_supplier_id uuid default null, recipient text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare b public.budgets;
begin
  if not private.can_manage_finance() then raise exception 'Sem permissão para definir destinatário'; end if;
  select * into b from public.budgets where id = target_budget_id for update;
  if not found or not private.has_project_access(b.project_id) then raise exception 'Orçamento não encontrado'; end if;
  if b.status <> 'fornecedor_pendente' then raise exception 'O orçamento não possui fornecedor pendente'; end if;
  if target_supplier_id is null and nullif(trim(recipient), '') is null then raise exception 'Informe fornecedor ou destinatário livre'; end if;
  if target_supplier_id is not null and not exists (select 1 from public.suppliers s join public.projects p on p.id = b.project_id where s.id = target_supplier_id and s.church_id = p.church_id) then raise exception 'Fornecedor inválido'; end if;
  update public.budgets set supplier_id = target_supplier_id, free_recipient = nullif(trim(recipient), ''), status = 'aguardando_aprovacao_financeira', updated_by = auth.uid() where id = b.id;
end;
$$;

create function private.approve_budget_as_expense(target_budget_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare b public.budgets; expense_id uuid;
begin
  if not private.can_manage_finance() then raise exception 'Somente Financeiro ou Administrador aprova orçamento'; end if;
  select * into b from public.budgets where id = target_budget_id for update;
  if not found or not private.has_project_access(b.project_id) then raise exception 'Orçamento não encontrado'; end if;
  if b.status <> 'aguardando_aprovacao_financeira' then raise exception 'O orçamento não está pronto para aprovação financeira'; end if;
  if b.supplier_id is null and nullif(trim(b.free_recipient), '') is null then raise exception 'Informe fornecedor ou destinatário livre antes de aprovar'; end if;
  insert into public.expenses (project_id, stage_id, category_id, budget_id, supplier_id, free_recipient, description, approved_value, remaining_value, expected_date, competence, drive_document_url, approved_by, notes)
  values (b.project_id, b.stage_id, b.category_id, b.id, b.supplier_id, b.free_recipient, coalesce(b.description, b.title), b.budget_value, b.budget_value, b.expected_date, b.competence, b.drive_document_url, auth.uid(), null)
  returning id into expense_id;
  update public.budgets set status = 'aprovado_como_despesa', updated_by = auth.uid() where id = b.id;
  return expense_id;
end;
$$;

create function private.register_payment(target_expense_id uuid, target_amount numeric, target_payment_date date, target_payment_method text default null, receipt_url text default null, payment_notes text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare e public.expenses; payment_id uuid;
begin
  if not private.can_manage_finance() then raise exception 'Sem permissão para registrar pagamento'; end if;
  if target_amount is null or target_amount <= 0 or target_payment_date is null then raise exception 'Valor e data de pagamento são obrigatórios'; end if;
  select * into e from public.expenses where id = target_expense_id for update;
  if not found or not private.has_project_access(e.project_id) then raise exception 'Despesa não encontrada'; end if;
  if e.status in ('cancelada', 'paga') then raise exception 'Não é possível registrar pagamento para esta despesa'; end if;
  if target_amount > e.remaining_value then raise exception 'O pagamento não pode ser maior que o saldo da despesa'; end if;
  insert into public.payments (expense_id, project_id, amount, payment_date, payment_method, drive_receipt_url, registered_by, notes)
  values (e.id, e.project_id, target_amount, target_payment_date, target_payment_method, receipt_url, auth.uid(), payment_notes)
  returning id into payment_id;
  return payment_id;
end;
$$;

create function private.cancel_expense(target_expense_id uuid, justification text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare e public.expenses; has_payments boolean;
begin
  if not private.can_manage_finance() then raise exception 'Sem permissão para cancelar despesa'; end if;
  if nullif(trim(justification), '') is null then raise exception 'A justificativa do cancelamento é obrigatória'; end if;
  select * into e from public.expenses where id = target_expense_id for update;
  if not found or not private.has_project_access(e.project_id) then raise exception 'Despesa não encontrada'; end if;
  select exists(select 1 from public.payments where expense_id = e.id) into has_payments;
  if has_payments and private.current_user_role() <> 'admin' then raise exception 'Somente Administrador pode cancelar despesa com pagamentos'; end if;
  update public.expenses set status = 'cancelada', notes = concat_ws(E'\\n', notes, 'Cancelamento: ' || trim(justification)) where id = e.id;
end;
$$;

revoke all on function private.approve_quotation(uuid, text), private.resolve_budget_recipient(uuid, uuid, text), private.approve_budget_as_expense(uuid), private.register_payment(uuid, numeric, date, text, text, text), private.cancel_expense(uuid, text) from public;
grant execute on function private.approve_quotation(uuid, text), private.resolve_budget_recipient(uuid, uuid, text), private.approve_budget_as_expense(uuid), private.register_payment(uuid, numeric, date, text, text, text), private.cancel_expense(uuid, text) to authenticated;

-- RPCs públicos finos: a lógica privilegiada permanece no schema privado e
-- cada função privada valida sessão, igreja e perfil antes de alterar dados.
create function public.approve_quotation(target_quotation_id uuid, justification text)
returns uuid language sql security invoker set search_path = public, private, pg_temp as $$
  select private.approve_quotation(target_quotation_id, justification)
$$;
create function public.resolve_budget_recipient(target_budget_id uuid, target_supplier_id uuid default null, recipient text default null)
returns void language sql security invoker set search_path = public, private, pg_temp as $$
  select private.resolve_budget_recipient(target_budget_id, target_supplier_id, recipient)
$$;
create function public.approve_budget_as_expense(target_budget_id uuid)
returns uuid language sql security invoker set search_path = public, private, pg_temp as $$
  select private.approve_budget_as_expense(target_budget_id)
$$;
create function public.register_payment(target_expense_id uuid, target_amount numeric, target_payment_date date, target_payment_method text default null, receipt_url text default null, payment_notes text default null)
returns uuid language sql security invoker set search_path = public, private, pg_temp as $$
  select private.register_payment(target_expense_id, target_amount, target_payment_date, target_payment_method, receipt_url, payment_notes)
$$;
create function public.cancel_expense(target_expense_id uuid, justification text)
returns void language sql security invoker set search_path = public, private, pg_temp as $$
  select private.cancel_expense(target_expense_id, justification)
$$;
revoke all on function public.approve_quotation(uuid, text), public.resolve_budget_recipient(uuid, uuid, text), public.approve_budget_as_expense(uuid), public.register_payment(uuid, numeric, date, text, text, text), public.cancel_expense(uuid, text) from public, anon;
grant execute on function public.approve_quotation(uuid, text), public.resolve_budget_recipient(uuid, uuid, text), public.approve_budget_as_expense(uuid), public.register_payment(uuid, numeric, date, text, text, text), public.cancel_expense(uuid, text) to authenticated;

create view public.view_expense_payment_status with (security_invoker = true) as
select e.id, e.project_id, e.approved_value, e.paid_value, e.remaining_value, e.status, e.expected_date
from public.expenses e;

create view public.view_project_dashboard with (security_invoker = true) as
select p.id as project_id,
  coalesce((select sum(i.amount) from public.income_entries i where i.project_id = p.id and i.status = 'recebida'), 0) as received_income,
  coalesce((select sum(e.approved_value) from public.expenses e where e.project_id = p.id and e.status <> 'cancelada'), 0) as approved_expenses,
  coalesce((select sum(e.paid_value) from public.expenses e where e.project_id = p.id and e.status <> 'cancelada'), 0) as paid_expenses,
  coalesce((select sum(e.remaining_value) from public.expenses e where e.project_id = p.id and e.status <> 'cancelada'), 0) as outstanding_expenses,
  (select count(*) from public.quotations q where q.project_id = p.id and q.status in ('recebida', 'em_analise')) as quotations_in_review,
  (select count(*) from public.budgets b where b.project_id = p.id and b.status in ('fornecedor_pendente', 'aguardando_aprovacao_financeira')) as pending_budgets
from public.projects p;

grant select on public.view_expense_payment_status, public.view_project_dashboard to authenticated;

alter table public.churches enable row level security;
alter table public.users_profile enable row level security;
alter table public.projects enable row level security;
alter table public.project_stages enable row level security;
alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.quotations enable row level security;
alter table public.budgets enable row level security;
alter table public.expenses enable row level security;
alter table public.payments enable row level security;
alter table public.income_entries enable row level security;
alter table public.audit_logs enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.churches, public.users_profile, public.projects, public.project_stages, public.categories, public.suppliers, public.quotations, public.budgets, public.expenses, public.payments, public.income_entries, public.audit_logs to authenticated;
grant insert, update on public.projects to authenticated;
grant insert, update on public.project_stages, public.categories, public.suppliers, public.quotations, public.income_entries to authenticated;

create policy church_read on public.churches for select to authenticated using (id = private.current_user_church_id());
create policy profile_read on public.users_profile for select to authenticated using (church_id = private.current_user_church_id());
create policy project_read on public.projects for select to authenticated using (church_id = private.current_user_church_id());
create policy project_write on public.projects for all to authenticated using (private.current_user_role() = 'admin' and church_id = private.current_user_church_id()) with check (private.current_user_role() = 'admin' and church_id = private.current_user_church_id());
create policy stage_read on public.project_stages for select to authenticated using (private.has_project_access(project_id));
create policy stage_write on public.project_stages for all to authenticated using (private.can_manage_finance() and private.has_project_access(project_id)) with check (private.can_manage_finance() and private.has_project_access(project_id));
create policy category_read on public.categories for select to authenticated using (private.has_project_access(project_id));
create policy category_write on public.categories for all to authenticated using (private.can_manage_finance() and private.has_project_access(project_id)) with check (private.can_manage_finance() and private.has_project_access(project_id));
create policy supplier_read on public.suppliers for select to authenticated using (church_id = private.current_user_church_id());
create policy supplier_write on public.suppliers for all to authenticated using (private.can_manage_finance() and church_id = private.current_user_church_id()) with check (private.can_manage_finance() and church_id = private.current_user_church_id());
create policy quotation_read on public.quotations for select to authenticated using (private.has_project_access(project_id));
create policy quotation_write on public.quotations for all to authenticated using (private.can_manage_quotation() and private.has_project_access(project_id)) with check (private.can_manage_quotation() and private.has_project_access(project_id));
create policy budget_read on public.budgets for select to authenticated using (private.has_project_access(project_id));
create policy expense_read on public.expenses for select to authenticated using (private.has_project_access(project_id));
create policy payment_read on public.payments for select to authenticated using (private.has_project_access(project_id));
create policy income_read on public.income_entries for select to authenticated using (private.has_project_access(project_id));
create policy income_write on public.income_entries for all to authenticated using (private.can_manage_finance() and private.has_project_access(project_id)) with check (private.can_manage_finance() and private.has_project_access(project_id));
create policy audit_read on public.audit_logs for select to authenticated using (church_id = private.current_user_church_id());

create trigger audit_church after insert or update or delete on public.churches for each row execute function private.audit_row_change();
create trigger audit_profile after insert or update or delete on public.users_profile for each row execute function private.audit_row_change();
create trigger audit_project after insert or update or delete on public.projects for each row execute function private.audit_row_change();
create trigger audit_stage after insert or update or delete on public.project_stages for each row execute function private.audit_row_change();
create trigger audit_category after insert or update or delete on public.categories for each row execute function private.audit_row_change();
create trigger audit_supplier after insert or update or delete on public.suppliers for each row execute function private.audit_row_change();
create trigger audit_quotation after insert or update or delete on public.quotations for each row execute function private.audit_row_change();
create trigger audit_budget after insert or update or delete on public.budgets for each row execute function private.audit_row_change();
create trigger audit_expense after insert or update or delete on public.expenses for each row execute function private.audit_row_change();
create trigger audit_payment after insert or update or delete on public.payments for each row execute function private.audit_row_change();
create trigger audit_income after insert or update or delete on public.income_entries for each row execute function private.audit_row_change();
