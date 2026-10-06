-- Funções operacionais passam a depender da função no projeto, mantendo o
-- Administrador global como exceção controlada.
create or replace function private.can_manage_project_finance(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select private.is_global_admin()
    or private.current_project_role(target_project_id) in ('admin'::public.user_role, 'financeiro'::public.user_role)
$$;

create or replace function private.can_manage_project_quotation(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select private.is_global_admin()
    or private.current_project_role(target_project_id) in ('admin'::public.user_role, 'financeiro'::public.user_role, 'aprovador'::public.user_role)
$$;

revoke all on function private.can_manage_project_finance(uuid), private.can_manage_project_quotation(uuid) from public, anon;
grant execute on function private.can_manage_project_finance(uuid), private.can_manage_project_quotation(uuid) to authenticated;

drop policy if exists stage_write on public.project_stages;
create policy stage_write
on public.project_stages for all to authenticated
using (private.can_manage_project_finance(project_id))
with check (private.can_manage_project_finance(project_id));

drop policy if exists category_write on public.categories;
create policy category_write
on public.categories for all to authenticated
using (private.can_manage_project_finance(project_id))
with check (private.can_manage_project_finance(project_id));

drop policy if exists quotation_insert on public.quotations;
create policy quotation_insert
on public.quotations for insert to authenticated
with check (private.can_manage_project_quotation(project_id) and status in ('recebida', 'em_analise'));

drop policy if exists income_insert on public.income_entries;
create policy income_insert
on public.income_entries for insert to authenticated
with check (private.can_manage_project_finance(project_id) and status = 'recebida');

-- As transições financeiras são executadas por funções privilegiadas. A regra
-- de função do projeto precisa existir nelas também, pois não basta proteger
-- somente a camada de interface.
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
  if quotation.status not in ('recebida', 'em_analise') then
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

  update public.quotations set status = 'aprovada_para_orcamento', updated_by = auth.uid()
  where id = quotation.id;
  return budget_id;
end;
$$;

create or replace function private.finish_quotation(
  target_quotation_id uuid,
  target_status public.quotation_status,
  justification text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare quotation public.quotations;
begin
  if target_status not in ('nao_selecionada', 'cancelada') then
    raise exception 'Status de encerramento inválido';
  end if;
  if nullif(trim(justification), '') is null then
    raise exception 'A justificativa é obrigatória';
  end if;
  select * into quotation from public.quotations where id = target_quotation_id for update;
  if not found or not private.has_project_access(quotation.project_id) then
    raise exception 'Cotação não encontrada';
  end if;
  if not private.can_manage_project_quotation(quotation.project_id) then
    raise exception 'Sem permissão para encerrar cotação neste projeto';
  end if;
  if quotation.status not in ('recebida', 'em_analise') then
    raise exception 'Apenas cotações em análise podem ser encerradas';
  end if;
  perform set_config('app.quotation_finish', 'true', true);
  update public.quotations
  set status = target_status,
      notes = concat_ws(E'\n', quotation.notes,
        case when target_status = 'cancelada' then 'Cancelamento: ' else 'Não selecionada: ' end || trim(justification)),
      updated_by = auth.uid()
  where id = quotation.id;
end;
$$;

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
  if target_supplier_id is null and normalized_recipient is null then
    raise exception 'Informe um fornecedor ou destinatário livre';
  end if;
  if target_supplier_id is not null and normalized_recipient is not null then
    raise exception 'Escolha somente um fornecedor ou destinatário livre';
  end if;
  select * into budget from public.budgets where id = target_budget_id for update;
  if not found or not private.has_project_access(budget.project_id) then
    raise exception 'Orçamento não encontrado';
  end if;
  if not private.can_manage_project_finance(budget.project_id) then
    raise exception 'Sem permissão para definir destinatário neste projeto';
  end if;
  if budget.status <> 'fornecedor_pendente'::public.budget_status then
    raise exception 'O orçamento não possui fornecedor pendente';
  end if;
  if target_supplier_id is not null and not exists (
    select 1 from public.project_suppliers project_supplier
    join public.suppliers supplier on supplier.id = project_supplier.supplier_id
    where project_supplier.project_id = budget.project_id
      and project_supplier.supplier_id = target_supplier_id
      and project_supplier.status = 'ativo'
      and supplier.status = 'ativo'
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

create or replace function private.approve_budget_as_expense(target_budget_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare budget public.budgets; expense_id uuid;
begin
  select * into budget from public.budgets where id = target_budget_id for update;
  if not found or not private.has_project_access(budget.project_id) then
    raise exception 'Orçamento não encontrado';
  end if;
  if not private.can_manage_project_finance(budget.project_id) then
    raise exception 'Somente Financeiro ou Administrador do projeto aprova orçamento';
  end if;
  if budget.status <> 'aguardando_aprovacao_financeira' then
    raise exception 'O orçamento não está pronto para aprovação financeira';
  end if;
  if budget.supplier_id is null and nullif(trim(budget.free_recipient), '') is null then
    raise exception 'Informe fornecedor ou destinatário livre antes de aprovar';
  end if;
  insert into public.expenses (
    project_id, stage_id, category_id, budget_id, supplier_id, free_recipient,
    description, approved_value, remaining_value, expected_date, competence,
    drive_document_url, approved_by, notes
  ) values (
    budget.project_id, budget.stage_id, budget.category_id, budget.id,
    budget.supplier_id, budget.free_recipient, coalesce(budget.description, budget.title),
    budget.budget_value, budget.budget_value, budget.expected_date, budget.competence,
    budget.drive_document_url, auth.uid(), null
  ) returning id into expense_id;
  update public.budgets set status = 'aprovado_como_despesa', updated_by = auth.uid()
  where id = budget.id;
  return expense_id;
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
declare normalized_recipient text := nullif(trim(recipient), ''); expense_id uuid;
begin
  if not private.has_project_access(target_project_id) then
    raise exception 'Projeto não encontrado';
  end if;
  if not private.can_manage_project_finance(target_project_id) then
    raise exception 'Sem permissão para cadastrar despesa neste projeto';
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
  if not exists (select 1 from public.project_stages where id = target_stage_id and project_id = target_project_id and status = 'ativo') then
    raise exception 'A etapa precisa estar ativa e pertencer ao projeto informado';
  end if;
  if not exists (
    select 1 from public.categories
    where id = target_category_id and project_id = target_project_id
      and status = 'ativo' and type in ('saida', 'ambos')
  ) then
    raise exception 'A categoria precisa estar ativa, pertencer ao projeto e aceitar saídas';
  end if;
  if target_supplier_id is not null and not exists (
    select 1 from public.project_suppliers project_supplier
    join public.suppliers supplier on supplier.id = project_supplier.supplier_id
    where project_supplier.project_id = target_project_id
      and project_supplier.supplier_id = target_supplier_id
      and project_supplier.status = 'ativo'
      and supplier.status = 'ativo'
  ) then
    raise exception 'Fornecedor inválido ou inativo';
  end if;
  insert into public.expenses (
    project_id, stage_id, category_id, supplier_id, free_recipient,
    description, approved_value, paid_value, remaining_value,
    expected_date, drive_document_url, approved_by, notes
  ) values (
    target_project_id, target_stage_id, target_category_id, target_supplier_id,
    normalized_recipient, trim(target_description), target_value, 0, target_value,
    target_expected_date, document_url, auth.uid(), nullif(trim(expense_notes), '')
  ) returning id into expense_id;
  return expense_id;
end;
$$;

create or replace function private.register_payment(
  target_expense_id uuid,
  target_amount numeric,
  target_payment_date date,
  target_payment_method text default null,
  receipt_url text default null,
  payment_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare expense public.expenses; payment_id uuid;
begin
  if target_amount is null or target_amount <= 0 or target_payment_date is null then
    raise exception 'Valor e data de pagamento são obrigatórios';
  end if;
  select * into expense from public.expenses where id = target_expense_id for update;
  if not found or not private.has_project_access(expense.project_id) then
    raise exception 'Despesa não encontrada';
  end if;
  if not private.can_manage_project_finance(expense.project_id) then
    raise exception 'Sem permissão para registrar pagamento neste projeto';
  end if;
  if expense.status in ('cancelada', 'paga') then
    raise exception 'Não é possível registrar pagamento para esta despesa';
  end if;
  if target_amount > expense.remaining_value then
    raise exception 'O pagamento não pode ser maior que o saldo da despesa';
  end if;
  insert into public.payments (
    expense_id, project_id, amount, payment_date, payment_method,
    drive_receipt_url, registered_by, notes
  ) values (
    expense.id, expense.project_id, target_amount, target_payment_date,
    target_payment_method, receipt_url, auth.uid(), payment_notes
  ) returning id into payment_id;
  return payment_id;
end;
$$;

create or replace function private.cancel_expense(target_expense_id uuid, justification text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare expense public.expenses; has_payments boolean;
begin
  if nullif(trim(justification), '') is null then
    raise exception 'A justificativa do cancelamento é obrigatória';
  end if;
  select * into expense from public.expenses where id = target_expense_id for update;
  if not found or not private.has_project_access(expense.project_id) then
    raise exception 'Despesa não encontrada';
  end if;
  if not private.can_manage_project_finance(expense.project_id) then
    raise exception 'Sem permissão para cancelar despesa neste projeto';
  end if;
  select exists(select 1 from public.payments where expense_id = expense.id) into has_payments;
  if has_payments and not private.is_global_admin() then
    raise exception 'Somente Administrador global pode cancelar despesa com pagamentos';
  end if;
  update public.expenses
  set status = 'cancelada',
      notes = concat_ws(E'\n', notes, 'Cancelamento: ' || trim(justification))
  where id = expense.id;
end;
$$;
