-- Rejeita cotações abertas antes de tornar o fornecedor indisponível. A
-- operação acontece na mesma transação da atualização do fornecedor para não
-- deixar cotações em análise apontando para uma relação inválida.

create or replace function private.assert_project_relations()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  row_data jsonb := to_jsonb(new);
  row_project_id uuid := (row_data->>'project_id')::uuid;
  row_supplier_id uuid := nullif(row_data->>'supplier_id', '')::uuid;
  row_status text := row_data->>'status';
begin
  if not exists (
    select 1 from public.project_stages
    where id = (row_data->>'stage_id')::uuid
      and project_id = row_project_id
      and (
        tg_table_name <> 'quotations'
        or row_status <> 'em_analise'
        or status = 'ativo'::public.active_status
      )
  ) then
    raise exception 'A etapa precisa estar ativa e pertencer ao projeto informado';
  end if;

  if not exists (
    select 1 from public.categories
    where id = (row_data->>'category_id')::uuid
      and project_id = row_project_id
      and (
        tg_table_name <> 'quotations'
        or row_status <> 'em_analise'
        or status = 'ativo'::public.active_status
      )
  ) then
    raise exception 'A categoria precisa estar ativa e pertencer ao projeto informado';
  end if;

  if row_supplier_id is not null and not exists (
    select 1
    from public.suppliers supplier
    join public.projects project on project.id = row_project_id
    where supplier.id = row_supplier_id
      and supplier.church_id = project.church_id
  ) then
    raise exception 'O fornecedor precisa pertencer à igreja do projeto';
  end if;

  if tg_table_name = 'quotations'
    and row_status = 'em_analise'
    and row_supplier_id is not null
    and not exists (
      select 1
      from public.project_suppliers project_supplier
      join public.suppliers supplier on supplier.id = project_supplier.supplier_id
      where project_supplier.project_id = row_project_id
        and project_supplier.supplier_id = row_supplier_id
        and project_supplier.status = 'ativo'::public.active_status
        and supplier.status = 'ativo'
    ) then
    raise exception 'Fornecedor inválido ou inativo para este projeto';
  end if;

  return new;
end;
$$;

create or replace function private.update_supplier(
  target_supplier_id uuid,
  target_project_id uuid,
  supplier_name text,
  supplier_person_type text,
  supplier_document text,
  supplier_main_contact text,
  supplier_phone text,
  supplier_email text,
  supplier_address text,
  supplier_main_category_id uuid,
  supplier_status text,
  supplier_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  supplier public.suppliers;
  active_project_links integer;
  deactivation_reason text;
begin
  select * into supplier
  from public.suppliers
  where id = target_supplier_id
  for update;

  if not found or supplier.church_id <> private.current_user_church_id() then
    raise exception 'Fornecedor não encontrado';
  end if;

  if not private.is_global_admin() then
    if target_project_id is null
      or not private.can_manage_project_finance(target_project_id)
      or not exists (
        select 1
        from public.project_suppliers project_supplier
        where project_supplier.project_id = target_project_id
          and project_supplier.supplier_id = supplier.id
          and project_supplier.status = 'ativo'::public.active_status
      ) then
      raise exception 'Sem permissão para alterar este fornecedor';
    end if;

    select count(*) into active_project_links
    from public.project_suppliers
    where supplier_id = supplier.id
      and status = 'ativo'::public.active_status;

    if active_project_links > 1 then
      raise exception 'Somente o Administrador geral pode alterar um fornecedor compartilhado';
    end if;
  end if;

  if nullif(trim(supplier_name), '') is null then
    raise exception 'O nome do fornecedor é obrigatório';
  end if;
  if supplier_person_type is not null
    and supplier_person_type not in ('pessoa_fisica', 'pessoa_juridica', 'outro') then
    raise exception 'Tipo de pessoa inválido';
  end if;
  if supplier_status not in ('ativo', 'inativo', 'bloqueado') then
    raise exception 'Status de fornecedor inválido';
  end if;
  if supplier_main_category_id is not null and not exists (
    select 1
    from public.categories category
    join public.projects project on project.id = category.project_id
    where category.id = supplier_main_category_id
      and project.church_id = supplier.church_id
      and (target_project_id is null or category.project_id = target_project_id)
      and category.status = 'ativo'::public.active_status
  ) then
    raise exception 'A categoria principal não está ativa no projeto informado';
  end if;

  if supplier.status = 'ativo' and supplier_status <> 'ativo' then
    deactivation_reason := case supplier_status
      when 'bloqueado' then
        'Cotação rejeitada automaticamente porque o fornecedor vinculado foi bloqueado.'
      else
        'Cotação rejeitada automaticamente porque o fornecedor vinculado foi desativado.'
    end;

    perform set_config('app.quotation_rejection', 'true', true);

    update public.quotations quotation
    set status = 'reprovada'::public.quotation_status,
        rejection_justification = deactivation_reason,
        rejected_by = (select auth.uid()),
        rejected_at = now(),
        notes = concat_ws(
          E'\n',
          quotation.notes,
          'Reprovação: ' || deactivation_reason
        ),
        updated_by = (select auth.uid())
    where quotation.supplier_id = supplier.id
      and quotation.status = 'em_analise'::public.quotation_status;
  end if;

  update public.suppliers
  set name = trim(supplier_name),
      person_type = supplier_person_type,
      document = nullif(trim(supplier_document), ''),
      main_contact = nullif(trim(supplier_main_contact), ''),
      phone = nullif(trim(supplier_phone), ''),
      email = nullif(trim(supplier_email), ''),
      address = nullif(trim(supplier_address), ''),
      main_category_id = supplier_main_category_id,
      status = supplier_status,
      notes = nullif(trim(supplier_notes), ''),
      updated_by = (select auth.uid())
  where id = supplier.id;
end;
$$;

revoke all on function private.update_supplier(
  uuid, uuid, text, text, text, text, text, text, text, uuid, text, text
) from public, anon;

grant execute on function private.update_supplier(
  uuid, uuid, text, text, text, text, text, text, text, uuid, text, text
) to authenticated;
