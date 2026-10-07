-- A despesa cancelada permanece como trilha de auditoria, mas deixa de
-- participar de qualquer total financeiro. Pagamentos históricos continuam
-- visíveis, porém não podem ser alterados depois do cancelamento.

create or replace function private.cancel_expense(target_expense_id uuid, justification text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  expense public.expenses;
  has_payments boolean;
begin
  if nullif(trim(justification), '') is null
    or char_length(trim(justification)) > 2000 then
    raise exception 'A justificativa do cancelamento é obrigatória e deve ter no máximo 2000 caracteres';
  end if;

  select * into expense
  from public.expenses
  where id = target_expense_id
  for update;

  if not found or not private.has_project_access(expense.project_id) then
    raise exception 'Despesa não encontrada';
  end if;
  if not private.can_manage_project_finance(expense.project_id) then
    raise exception 'Sem permissão para cancelar despesa neste projeto';
  end if;
  if expense.status = 'cancelada'::public.expense_status then
    raise exception 'A despesa já está cancelada';
  end if;

  select exists(
    select 1 from public.payments where expense_id = expense.id
  ) into has_payments;

  if has_payments and not private.can_manage_project_admin(expense.project_id) then
    raise exception 'Somente Administrador do projeto ou Administrador global pode cancelar despesa com pagamentos';
  end if;

  update public.expenses
  set status = 'cancelada',
      notes = concat_ws(E'\n', notes, 'Cancelamento: ' || trim(justification))
  where id = expense.id;
end;
$$;
