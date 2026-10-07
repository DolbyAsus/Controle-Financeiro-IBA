-- Edição de registros financeiros com autorização por projeto e preservação
-- dos campos derivados (valores pagos, saldo e status de pagamento).
create or replace function private.assert_drive_document_url(target_url text)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare normalized_url text := nullif(trim(target_url), '');
begin
  if normalized_url is not null
    and normalized_url !~ '^https://(drive|docs)\.google\.com/' then
    raise exception 'Use apenas links HTTPS do Google Drive';
  end if;
  if normalized_url is not null and char_length(normalized_url) > 1000 then
    raise exception 'O link do documento aceita no máximo 1000 caracteres';
  end if;
  return normalized_url;
end;
$$;

create or replace function private.update_expense(
  target_expense_id uuid,
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
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  expense public.expenses;
  normalized_recipient text := nullif(trim(recipient), '');
  normalized_description text := nullif(trim(target_description), '');
  normalized_notes text := nullif(trim(expense_notes), '');
  normalized_document_url text;
begin
  select * into expense from public.expenses where id = target_expense_id for update;
  if not found or not private.has_project_access(expense.project_id) then
    raise exception 'Despesa não encontrada';
  end if;
  if not private.can_manage_project_finance(expense.project_id) then
    raise exception 'Sem permissão para editar despesa neste projeto';
  end if;
  if expense.status = 'cancelada'::public.expense_status then
    raise exception 'Não é possível editar despesa cancelada';
  end if;
  if normalized_description is null or char_length(normalized_description) > 2000 then
    raise exception 'A descrição da despesa é obrigatória e aceita no máximo 2000 caracteres';
  end if;
  if target_value is null or target_value <= 0 then
    raise exception 'Informe um valor de despesa maior que zero';
  end if;
  if target_value < expense.paid_value then
    raise exception 'O valor da despesa não pode ser menor que o total já pago';
  end if;
  if normalized_recipient is not null and char_length(normalized_recipient) > 160 then
    raise exception 'O destinatário aceita no máximo 160 caracteres';
  end if;
  if normalized_notes is not null and char_length(normalized_notes) > 2000 then
    raise exception 'As observações aceitam no máximo 2000 caracteres';
  end if;
  if target_supplier_id is null and normalized_recipient is null then
    raise exception 'Informe um fornecedor ou destinatário livre';
  end if;
  if target_supplier_id is not null and normalized_recipient is not null then
    raise exception 'Escolha somente um fornecedor ou destinatário livre';
  end if;
  if not exists (
    select 1 from public.project_stages
    where id = target_stage_id and project_id = expense.project_id and status = 'ativo'
  ) then
    raise exception 'A etapa precisa estar ativa e pertencer ao projeto informado';
  end if;
  if not exists (
    select 1 from public.categories
    where id = target_category_id and project_id = expense.project_id
      and status = 'ativo' and type in ('saida', 'ambos')
  ) then
    raise exception 'A categoria precisa estar ativa, pertencer ao projeto e aceitar saídas';
  end if;
  if target_supplier_id is not null and not exists (
    select 1
    from public.project_suppliers ps
    join public.suppliers s on s.id = ps.supplier_id
    where ps.project_id = expense.project_id
      and ps.supplier_id = target_supplier_id
      and ps.status = 'ativo' and s.status = 'ativo'
  ) then
    raise exception 'Fornecedor inválido ou inativo';
  end if;

  normalized_document_url := private.assert_drive_document_url(document_url);
  update public.expenses
  set stage_id = target_stage_id,
      category_id = target_category_id,
      supplier_id = target_supplier_id,
      free_recipient = normalized_recipient,
      description = normalized_description,
      approved_value = target_value,
      remaining_value = target_value - expense.paid_value,
      expected_date = target_expected_date,
      drive_document_url = normalized_document_url,
      notes = normalized_notes,
      status = case
        when expense.paid_value >= target_value then 'paga'::public.expense_status
        when expense.paid_value > 0 then 'parcialmente_paga'::public.expense_status
        else 'aprovada'::public.expense_status
      end
  where id = expense.id;
end;
$$;

create or replace function private.update_income_entry(
  target_income_id uuid,
  target_category_id uuid default null,
  target_received_date date default null,
  target_amount numeric default null,
  target_origin text default null,
  target_description text default null,
  target_payment_method text default null,
  receipt_url text default null,
  income_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  entry public.income_entries;
  normalized_origin text := nullif(trim(target_origin), '');
  normalized_description text := nullif(trim(target_description), '');
  normalized_method text := nullif(trim(target_payment_method), '');
  normalized_notes text := nullif(trim(income_notes), '');
  normalized_document_url text;
begin
  select * into entry from public.income_entries where id = target_income_id for update;
  if not found or not private.has_project_access(entry.project_id) then
    raise exception 'Entrada não encontrada';
  end if;
  if not private.can_manage_project_finance(entry.project_id) then
    raise exception 'Sem permissão para editar entrada neste projeto';
  end if;
  if target_received_date is null or target_amount is null or target_amount <= 0 then
    raise exception 'Data e valor de entrada são obrigatórios';
  end if;
  if normalized_origin is null or char_length(normalized_origin) > 160 then
    raise exception 'A origem é obrigatória e aceita no máximo 160 caracteres';
  end if;
  if normalized_description is not null and char_length(normalized_description) > 2000 then
    raise exception 'A descrição aceita no máximo 2000 caracteres';
  end if;
  if normalized_method is not null and char_length(normalized_method) > 160 then
    raise exception 'A forma de recebimento aceita no máximo 160 caracteres';
  end if;
  if normalized_notes is not null and char_length(normalized_notes) > 2000 then
    raise exception 'As observações aceitam no máximo 2000 caracteres';
  end if;
  if target_category_id is not null and not exists (
    select 1 from public.categories
    where id = target_category_id and project_id = entry.project_id
      and status = 'ativo' and type in ('entrada', 'ambos')
  ) then
    raise exception 'A categoria precisa estar ativa, pertencer ao projeto e aceitar entradas';
  end if;

  normalized_document_url := private.assert_drive_document_url(receipt_url);
  update public.income_entries
  set category_id = target_category_id,
      received_date = target_received_date,
      amount = target_amount,
      origin = normalized_origin,
      description = normalized_description,
      payment_method = normalized_method,
      drive_receipt_url = normalized_document_url,
      notes = normalized_notes
  where id = entry.id;
end;
$$;

create or replace function private.update_pending_budget(
  target_budget_id uuid,
  target_stage_id uuid,
  target_category_id uuid,
  target_supplier_id uuid default null,
  recipient text default null,
  target_title text default null,
  target_description text default null,
  target_value numeric default null,
  target_payment_method text default null,
  target_payment_terms text default null,
  target_expected_date date default null,
  document_url text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  budget public.budgets;
  normalized_recipient text := nullif(trim(recipient), '');
  normalized_title text := nullif(trim(target_title), '');
  normalized_description text := nullif(trim(target_description), '');
  normalized_method text := nullif(trim(target_payment_method), '');
  normalized_terms text := nullif(trim(target_payment_terms), '');
  normalized_document_url text;
  next_status public.budget_status;
begin
  select * into budget from public.budgets where id = target_budget_id for update;
  if not found or not private.has_project_access(budget.project_id) then
    raise exception 'Orçamento não encontrado';
  end if;
  if not private.can_manage_project_finance(budget.project_id) then
    raise exception 'Sem permissão para editar orçamento neste projeto';
  end if;
  if budget.status not in ('fornecedor_pendente', 'aguardando_aprovacao_financeira') then
    raise exception 'Somente orçamentos pendentes podem ser editados';
  end if;
  if normalized_title is null or char_length(normalized_title) > 160 then
    raise exception 'O título é obrigatório e aceita no máximo 160 caracteres';
  end if;
  if target_value is null or target_value <= 0 then
    raise exception 'Informe um valor de orçamento maior que zero';
  end if;
  if normalized_description is not null and char_length(normalized_description) > 2000 then
    raise exception 'A descrição aceita no máximo 2000 caracteres';
  end if;
  if normalized_recipient is not null and char_length(normalized_recipient) > 160 then
    raise exception 'O destinatário aceita no máximo 160 caracteres';
  end if;
  if normalized_method is not null and char_length(normalized_method) > 160 then
    raise exception 'A forma de pagamento aceita no máximo 160 caracteres';
  end if;
  if normalized_terms is not null and char_length(normalized_terms) > 500 then
    raise exception 'As condições de pagamento aceitam no máximo 500 caracteres';
  end if;
  if target_supplier_id is not null and normalized_recipient is not null then
    raise exception 'Escolha somente um fornecedor ou destinatário livre';
  end if;
  if not exists (
    select 1 from public.project_stages
    where id = target_stage_id and project_id = budget.project_id and status = 'ativo'
  ) then
    raise exception 'A etapa precisa estar ativa e pertencer ao projeto informado';
  end if;
  if not exists (
    select 1 from public.categories
    where id = target_category_id and project_id = budget.project_id
      and status = 'ativo' and type in ('saida', 'ambos')
  ) then
    raise exception 'A categoria precisa estar ativa, pertencer ao projeto e aceitar saídas';
  end if;
  if target_supplier_id is not null and not exists (
    select 1
    from public.project_suppliers ps
    join public.suppliers s on s.id = ps.supplier_id
    where ps.project_id = budget.project_id
      and ps.supplier_id = target_supplier_id
      and ps.status = 'ativo' and s.status = 'ativo'
  ) then
    raise exception 'Fornecedor inválido ou inativo';
  end if;

  normalized_document_url := private.assert_drive_document_url(document_url);
  next_status := case when target_supplier_id is null and normalized_recipient is null
    then 'fornecedor_pendente'::public.budget_status
    else 'aguardando_aprovacao_financeira'::public.budget_status
  end;
  update public.budgets
  set stage_id = target_stage_id,
      category_id = target_category_id,
      supplier_id = target_supplier_id,
      free_recipient = normalized_recipient,
      title = normalized_title,
      description = normalized_description,
      budget_value = target_value,
      payment_method = normalized_method,
      payment_terms = normalized_terms,
      expected_date = target_expected_date,
      drive_document_url = normalized_document_url,
      status = next_status,
      updated_by = auth.uid()
  where id = budget.id;
end;
$$;

create or replace function public.update_expense(
  target_expense_id uuid, target_stage_id uuid, target_category_id uuid,
  target_supplier_id uuid, recipient text, target_description text,
  target_value numeric, target_expected_date date, document_url text, expense_notes text
)
returns void language sql security invoker set search_path = public, private, pg_temp as $$
  select private.update_expense(target_expense_id, target_stage_id, target_category_id, target_supplier_id, recipient, target_description, target_value, target_expected_date, document_url, expense_notes)
$$;

create or replace function public.update_income_entry(
  target_income_id uuid, target_category_id uuid, target_received_date date,
  target_amount numeric, target_origin text, target_description text,
  target_payment_method text, receipt_url text, income_notes text
)
returns void language sql security invoker set search_path = public, private, pg_temp as $$
  select private.update_income_entry(target_income_id, target_category_id, target_received_date, target_amount, target_origin, target_description, target_payment_method, receipt_url, income_notes)
$$;

create or replace function public.update_pending_budget(
  target_budget_id uuid, target_stage_id uuid, target_category_id uuid,
  target_supplier_id uuid, recipient text, target_title text, target_description text,
  target_value numeric, target_payment_method text, target_payment_terms text,
  target_expected_date date, document_url text
)
returns void language sql security invoker set search_path = public, private, pg_temp as $$
  select private.update_pending_budget(target_budget_id, target_stage_id, target_category_id, target_supplier_id, recipient, target_title, target_description, target_value, target_payment_method, target_payment_terms, target_expected_date, document_url)
$$;

revoke all on function private.assert_drive_document_url(text), private.update_expense(uuid, uuid, uuid, uuid, text, text, numeric, date, text, text), private.update_income_entry(uuid, uuid, date, numeric, text, text, text, text, text), private.update_pending_budget(uuid, uuid, uuid, uuid, text, text, text, numeric, text, text, date, text) from public, anon, authenticated;
grant execute on function private.update_expense(uuid, uuid, uuid, uuid, text, text, numeric, date, text, text), private.update_income_entry(uuid, uuid, date, numeric, text, text, text, text, text), private.update_pending_budget(uuid, uuid, uuid, uuid, text, text, text, numeric, text, text, date, text) to authenticated;
revoke all on function public.update_expense(uuid, uuid, uuid, uuid, text, text, numeric, date, text, text), public.update_income_entry(uuid, uuid, date, numeric, text, text, text, text, text), public.update_pending_budget(uuid, uuid, uuid, uuid, text, text, text, numeric, text, text, date, text) from public, anon;
grant execute on function public.update_expense(uuid, uuid, uuid, uuid, text, text, numeric, date, text, text), public.update_income_entry(uuid, uuid, date, numeric, text, text, text, text, text), public.update_pending_budget(uuid, uuid, uuid, uuid, text, text, text, numeric, text, text, date, text) to authenticated;
