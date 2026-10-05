-- Corrige a inferência de tipo do CASE usado ao criar o orçamento.
-- Sem os casts explícitos, o PostgreSQL produz text e rejeita a inserção
-- na coluna status, que usa o enum public.budget_status.

create or replace function private.approve_quotation(target_quotation_id uuid, justification text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  q public.quotations;
  budget_id uuid;
begin
  if not private.can_manage_quotation() then
    raise exception 'Sem permissão para aprovar cotação';
  end if;

  if nullif(trim(justification), '') is null then
    raise exception 'A justificativa da escolha é obrigatória';
  end if;

  select * into q
  from public.quotations
  where id = target_quotation_id
  for update;

  if not found or not private.has_project_access(q.project_id) then
    raise exception 'Cotação não encontrada';
  end if;

  if q.status not in ('recebida', 'em_analise') then
    raise exception 'Esta cotação não pode ser aprovada no status atual';
  end if;

  insert into public.budgets (
    project_id,
    stage_id,
    category_id,
    quotation_id,
    title,
    description,
    supplier_id,
    budget_value,
    payment_method,
    payment_terms,
    drive_document_url,
    choice_justification,
    quotation_approved_by,
    status,
    created_by,
    updated_by
  ) values (
    q.project_id,
    q.stage_id,
    q.category_id,
    q.id,
    q.title,
    q.description,
    q.supplier_id,
    q.total_value,
    q.payment_method,
    q.payment_terms,
    q.drive_document_url,
    trim(justification),
    auth.uid(),
    case
      when q.supplier_id is null then 'fornecedor_pendente'::public.budget_status
      else 'aguardando_aprovacao_financeira'::public.budget_status
    end,
    auth.uid(),
    auth.uid()
  )
  returning id into budget_id;

  update public.quotations
  set status = 'aprovada_para_orcamento',
      updated_by = auth.uid()
  where id = q.id;

  return budget_id;
end;
$$;

-- As constraints iniciais preservaram duas barras no padrão regular e,
-- por isso, rejeitavam valores válidos produzidos pelos próprios triggers.
-- A classe numérica evita depender de escapes de barra invertida.
alter table public.budgets
  drop constraint if exists budgets_competence_check,
  add constraint budgets_competence_check
    check (competence is null or competence ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');

alter table public.expenses
  drop constraint if exists expenses_competence_check,
  add constraint expenses_competence_check
    check (competence is null or competence ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');

alter table public.income_entries
  drop constraint if exists income_entries_competence_check,
  add constraint income_entries_competence_check
    check (competence is null or competence ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');

-- A mesma inferência de text ocorria ao sincronizar o status da despesa
-- depois de um pagamento parcial ou integral.
create or replace function private.sync_expense_payment_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  total_paid numeric(14,2);
  expense_total numeric(14,2);
begin
  select coalesce(sum(amount), 0)
  into total_paid
  from public.payments
  where expense_id = new.expense_id;

  select approved_value
  into expense_total
  from public.expenses
  where id = new.expense_id
  for update;

  update public.expenses
  set paid_value = total_paid,
      remaining_value = greatest(expense_total - total_paid, 0),
      status = case
        when total_paid >= expense_total then 'paga'::public.expense_status
        when total_paid > 0 then 'parcialmente_paga'::public.expense_status
        else 'aprovada'::public.expense_status
      end
  where id = new.expense_id;

  return new;
end;
$$;
