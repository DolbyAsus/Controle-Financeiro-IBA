-- Uma despesa representa um compromisso com exatamente um destinatário.
-- O pagamento mantém esse vínculo por meio da despesa, sem duplicar dados do
-- fornecedor em cada parcela.
alter table public.budgets
  add constraint budgets_single_recipient_check
  check (supplier_id is null or nullif(trim(free_recipient), '') is null);

alter table public.expenses
  add constraint expenses_single_recipient_check
  check (supplier_id is null or nullif(trim(free_recipient), '') is null);

-- Despesas podem ser originadas de um orçamento aprovado ou de lançamento
-- manual. O orçamento, quando existir, continua único para a despesa.
alter table public.expenses
  alter column budget_id drop not null;

-- A interface apresenta fornecedor e destinatário livre como alternativas,
-- mas a regra também precisa existir no banco para chamadas diretas à API.
create or replace function private.resolve_budget_recipient(
  target_budget_id uuid,
  target_supplier_id uuid default null,
  recipient text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  budget public.budgets;
  normalized_recipient text := nullif(trim(recipient), '');
begin
  if not private.can_manage_finance() then
    raise exception 'Sem permissão para definir destinatário';
  end if;

  if target_supplier_id is null and normalized_recipient is null then
    raise exception 'Informe um fornecedor ou destinatário livre';
  end if;

  if target_supplier_id is not null and normalized_recipient is not null then
    raise exception 'Escolha somente um fornecedor ou destinatário livre';
  end if;

  select * into budget
  from public.budgets
  where id = target_budget_id
  for update;

  if not found or not private.has_project_access(budget.project_id) then
    raise exception 'Orçamento não encontrado';
  end if;

  if budget.status <> 'fornecedor_pendente'::public.budget_status then
    raise exception 'O orçamento não possui fornecedor pendente';
  end if;

  if target_supplier_id is not null and not exists (
    select 1
    from public.suppliers supplier
    join public.projects project on project.id = budget.project_id
    where supplier.id = target_supplier_id
      and supplier.church_id = project.church_id
  ) then
    raise exception 'Fornecedor inválido';
  end if;

  update public.budgets
  set supplier_id = target_supplier_id,
      free_recipient = normalized_recipient,
      status = 'aguardando_aprovacao_financeira'::public.budget_status,
      updated_by = auth.uid()
  where id = budget.id;
end;
$$;

create or replace function private.create_manual_expense(
  target_project_id uuid,
  target_stage_id uuid,
  target_category_id uuid,
  target_supplier_id uuid default null,
  recipient text default null,
  target_description text default null,
  target_value numeric default null,
  target_expected_date date default null,
  document_url text default null,
  expense_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_recipient text := nullif(trim(recipient), '');
  expense_id uuid;
begin
  if not private.can_manage_finance() then
    raise exception 'Sem permissão para cadastrar despesa';
  end if;

  if not private.has_project_access(target_project_id) then
    raise exception 'Projeto não encontrado';
  end if;

  if nullif(trim(target_description), '') is null then
    raise exception 'A descrição da despesa é obrigatória';
  end if;

  if target_value is null or target_value <= 0 then
    raise exception 'Informe um valor de despesa maior que zero';
  end if;

  if target_supplier_id is null and normalized_recipient is null then
    raise exception 'Informe um fornecedor ou destinatário livre';
  end if;

  if target_supplier_id is not null and normalized_recipient is not null then
    raise exception 'Escolha somente um fornecedor ou destinatário livre';
  end if;

  if not exists (
    select 1 from public.project_stages
    where id = target_stage_id and project_id = target_project_id and status = 'ativo'
  ) then
    raise exception 'A etapa precisa estar ativa e pertencer ao projeto informado';
  end if;

  if not exists (
    select 1 from public.categories
    where id = target_category_id
      and project_id = target_project_id
      and status = 'ativo'
      and type in ('saida', 'ambos')
  ) then
    raise exception 'A categoria precisa estar ativa, pertencer ao projeto e aceitar saídas';
  end if;

  if target_supplier_id is not null and not exists (
    select 1
    from public.suppliers supplier
    join public.projects project on project.id = target_project_id
    where supplier.id = target_supplier_id
      and supplier.church_id = project.church_id
      and supplier.status = 'ativo'
  ) then
    raise exception 'Fornecedor inválido ou inativo';
  end if;

  insert into public.expenses (
    project_id, stage_id, category_id, supplier_id, free_recipient,
    description, approved_value, paid_value, remaining_value,
    expected_date, drive_document_url, approved_by, notes
  ) values (
    target_project_id, target_stage_id, target_category_id, target_supplier_id, normalized_recipient,
    trim(target_description), target_value, 0, target_value,
    target_expected_date, document_url, auth.uid(), nullif(trim(expense_notes), '')
  ) returning id into expense_id;

  return expense_id;
end;
$$;

create or replace function public.create_manual_expense(
  target_project_id uuid,
  target_stage_id uuid,
  target_category_id uuid,
  target_supplier_id uuid default null,
  recipient text default null,
  target_description text default null,
  target_value numeric default null,
  target_expected_date date default null,
  document_url text default null,
  expense_notes text default null
)
returns uuid
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.create_manual_expense(
    target_project_id,
    target_stage_id,
    target_category_id,
    target_supplier_id,
    recipient,
    target_description,
    target_value,
    target_expected_date,
    document_url,
    expense_notes
  )
$$;

revoke all on function private.create_manual_expense(uuid, uuid, uuid, uuid, text, text, numeric, date, text, text) from public;
revoke all on function public.create_manual_expense(uuid, uuid, uuid, uuid, text, text, numeric, date, text, text) from public, anon;
grant execute on function public.create_manual_expense(uuid, uuid, uuid, uuid, text, text, numeric, date, text, text) to authenticated;
