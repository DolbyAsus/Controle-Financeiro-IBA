-- Pagamentos são lançamentos financeiros recentes: ano corrente e ano anterior
-- completo. A validação fica em trigger para proteger chamadas diretas à API.
create or replace function private.assert_payment_date_window()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  maximum_date date := (now() at time zone 'America/Sao_Paulo')::date;
  minimum_date date;
begin
  minimum_date := make_date(extract(year from maximum_date)::integer - 1, 1, 1);
  if new.payment_date < minimum_date or new.payment_date > maximum_date then
    raise exception 'A data do pagamento deve estar entre % e %', minimum_date, maximum_date;
  end if;
  return new;
end;
$$;

drop trigger if exists payment_date_window on public.payments;
create trigger payment_date_window
before insert or update of payment_date on public.payments
for each row execute function private.assert_payment_date_window();

-- A alteração e a exclusão de parcelas devem recalcular a despesa vinculada,
-- assim como já ocorria ao inserir uma nova parcela.
create or replace function private.sync_expense_payment_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_expense_id uuid := coalesce(new.expense_id, old.expense_id);
  total_paid numeric(14,2);
  expense_total numeric(14,2);
begin
  select coalesce(sum(amount), 0)
  into total_paid
  from public.payments
  where expense_id = target_expense_id;

  select approved_value
  into expense_total
  from public.expenses
  where id = target_expense_id
  for update;

  update public.expenses
  set paid_value = total_paid,
      remaining_value = greatest(expense_total - total_paid, 0),
      status = case
        when total_paid >= expense_total then 'paga'::public.expense_status
        when total_paid > 0 then 'parcialmente_paga'::public.expense_status
        else 'aprovada'::public.expense_status
      end
  where id = target_expense_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists payment_sync on public.payments;
create trigger payment_sync
after insert or update or delete on public.payments
for each row execute function private.sync_expense_payment_status();

create or replace function private.can_manage_project_admin(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select private.is_global_admin()
    or private.current_project_role(target_project_id) = 'admin'::public.user_role
$$;

create or replace function private.update_payment(
  target_payment_id uuid,
  target_amount numeric,
  target_payment_date date,
  target_payment_method text default null,
  receipt_url text default null,
  payment_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payment public.payments;
  expense public.expenses;
begin
  if target_amount is null or target_amount <= 0 or target_payment_date is null then
    raise exception 'Valor e data de pagamento são obrigatórios';
  end if;

  select * into payment
  from public.payments
  where id = target_payment_id
  for update;

  if not found or not private.has_project_access(payment.project_id) then
    raise exception 'Pagamento não encontrado';
  end if;
  if not private.can_manage_project_finance(payment.project_id) then
    raise exception 'Sem permissão para editar pagamento neste projeto';
  end if;

  select * into expense
  from public.expenses
  where id = payment.expense_id
  for update;

  if expense.status = 'cancelada'::public.expense_status then
    raise exception 'Não é possível editar pagamento de despesa cancelada';
  end if;
  if target_amount > expense.remaining_value + payment.amount then
    raise exception 'O pagamento não pode ser maior que o saldo da despesa';
  end if;

  update public.payments
  set amount = target_amount,
      payment_date = target_payment_date,
      payment_method = nullif(trim(target_payment_method), ''),
      drive_receipt_url = nullif(trim(receipt_url), ''),
      notes = nullif(trim(payment_notes), '')
  where id = payment.id;
end;
$$;

create or replace function private.delete_payment(target_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payment public.payments;
  expense public.expenses;
begin
  select * into payment
  from public.payments
  where id = target_payment_id
  for update;

  if not found or not private.has_project_access(payment.project_id) then
    raise exception 'Pagamento não encontrado';
  end if;
  if not private.can_manage_project_admin(payment.project_id) then
    raise exception 'Somente Administrador do projeto ou Administrador global pode excluir pagamento';
  end if;

  select * into expense
  from public.expenses
  where id = payment.expense_id
  for update;

  if expense.status = 'cancelada'::public.expense_status then
    raise exception 'Não é possível excluir pagamento de despesa cancelada';
  end if;

  delete from public.payments where id = payment.id;
end;
$$;

create or replace function public.update_payment(
  target_payment_id uuid,
  target_amount numeric,
  target_payment_date date,
  target_payment_method text default null,
  receipt_url text default null,
  payment_notes text default null
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.update_payment(
    target_payment_id,
    target_amount,
    target_payment_date,
    target_payment_method,
    receipt_url,
    payment_notes
  )
$$;

create or replace function public.delete_payment(target_payment_id uuid)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.delete_payment(target_payment_id)
$$;

revoke all on function private.assert_payment_date_window(), private.can_manage_project_admin(uuid), private.update_payment(uuid, numeric, date, text, text, text), private.delete_payment(uuid) from public, anon, authenticated;
grant execute on function private.update_payment(uuid, numeric, date, text, text, text), private.delete_payment(uuid) to authenticated;
revoke all on function public.update_payment(uuid, numeric, date, text, text, text), public.delete_payment(uuid) from public, anon;
grant execute on function public.update_payment(uuid, numeric, date, text, text, text), public.delete_payment(uuid) to authenticated;
