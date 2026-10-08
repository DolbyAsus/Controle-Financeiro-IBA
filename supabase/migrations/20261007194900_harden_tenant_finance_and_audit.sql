-- Fechamento de segurança e gargalos de dados.
--
-- Esta migração reforça o isolamento entre igrejas, serializa alterações que
-- poderiam remover o último administrador, move gravações compostas para RPCs
-- atômicas e reduz a exposição de dados pessoais no histórico de auditoria.

-- ---------------------------------------------------------------------------
-- 1. Isolamento multi-tenant e autorização por recurso
-- ---------------------------------------------------------------------------

-- O fluxo antigo foi substituído por approve_quotation/reject_quotation. As
-- funções permaneceram revogadas no catálogo e ainda referenciavam valores já
-- renomeados do enum quotation_status, o que quebrava o lint do banco.
drop function if exists public.finish_quotation(
  uuid, public.quotation_status, text
);
drop function if exists private.finish_quotation(
  uuid, public.quotation_status, text
);

create or replace function private.has_project_access(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects project
    where project.id = target_project_id
      and project.church_id = private.current_user_church_id()
      and (
        private.is_global_admin()
        or exists (
          select 1
          from public.project_memberships membership
          where membership.project_id = project.id
            and membership.user_id = (select auth.uid())
            and membership.status = 'ativo'::public.active_status
        )
      )
  )
$$;

create or replace function private.can_manage_project_finance(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_project_access(target_project_id)
    and (
      private.is_global_admin()
      or private.current_project_role(target_project_id) in (
        'admin'::public.user_role,
        'financeiro'::public.user_role
      )
    )
$$;

create or replace function private.can_manage_project_quotation(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_project_access(target_project_id)
    and (
      private.is_global_admin()
      or private.current_project_role(target_project_id) in (
        'admin'::public.user_role,
        'financeiro'::public.user_role,
        'aprovador'::public.user_role
      )
    )
$$;

create or replace function private.can_manage_project_admin(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_project_access(target_project_id)
    and (
      private.is_global_admin()
      or private.current_project_role(target_project_id) = 'admin'::public.user_role
    )
$$;

create or replace function private.can_manage_project_users(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_manage_project_admin(target_project_id)
$$;

create or replace function private.can_view_user_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users_profile target_profile
    where target_profile.id = target_user_id
      and target_profile.church_id = private.current_user_church_id()
      and (
        target_profile.id = (select auth.uid())
        or private.is_global_admin()
        or exists (
          select 1
          from public.project_memberships target_membership
          where target_membership.user_id = target_profile.id
            and private.current_project_role(target_membership.project_id) = 'admin'::public.user_role
        )
      )
  )
$$;

drop policy if exists profile_read_self_or_admin on public.users_profile;
drop policy if exists profile_read_self_global_or_managed_project on public.users_profile;
create policy profile_read_self_global_or_managed_project
on public.users_profile for select to authenticated
using (private.can_view_user_profile(id));

drop policy if exists supplier_read_for_project_access on public.suppliers;
create policy supplier_read_for_project_access
on public.suppliers for select to authenticated
using (
  church_id = private.current_user_church_id()
  and (
    private.is_global_admin()
    or exists (
      select 1
      from public.project_suppliers project_supplier
      where project_supplier.supplier_id = suppliers.id
        and project_supplier.status = 'ativo'::public.active_status
        and private.has_project_access(project_supplier.project_id)
    )
  )
);

drop policy if exists audit_read_finance_managers on public.audit_logs;
drop policy if exists audit_read_for_project_finance_or_global_admin on public.audit_logs;
create policy audit_read_for_project_finance_or_global_admin
on public.audit_logs for select to authenticated
using (
  church_id = private.current_user_church_id()
  and (
    private.is_global_admin()
    or (
      project_id is not null
      and private.has_project_access(project_id)
      and private.current_project_role(project_id) in (
        'admin'::public.user_role,
        'financeiro'::public.user_role
      )
    )
  )
);

-- Policies FOR ALL também participam do SELECT e duplicavam as verificações
-- de leitura. As operações permitidas pelo app são declaradas separadamente.
drop policy if exists project_write on public.projects;
create policy project_insert
on public.projects for insert to authenticated
with check (
  private.is_global_admin()
  and church_id = private.current_user_church_id()
);
create policy project_update
on public.projects for update to authenticated
using (
  private.is_global_admin()
  and church_id = private.current_user_church_id()
)
with check (
  private.is_global_admin()
  and church_id = private.current_user_church_id()
);

drop policy if exists stage_write on public.project_stages;
create policy stage_insert
on public.project_stages for insert to authenticated
with check (private.can_manage_project_finance(project_id));
create policy stage_update
on public.project_stages for update to authenticated
using (private.can_manage_project_finance(project_id))
with check (private.can_manage_project_finance(project_id));

drop policy if exists category_write on public.categories;
create policy category_insert
on public.categories for insert to authenticated
with check (private.can_manage_project_finance(project_id));
create policy category_update
on public.categories for update to authenticated
using (private.can_manage_project_finance(project_id))
with check (private.can_manage_project_finance(project_id));

-- A escrita nestas tabelas já foi revogada de authenticated e ocorre apenas
-- pelas RPCs SECURITY DEFINER que validam igreja, projeto e papel.
drop policy if exists supplier_write_global_admin on public.suppliers;
drop policy if exists project_supplier_manage_global_admin
  on public.project_suppliers;

-- ---------------------------------------------------------------------------
-- 2. Continuidade administrativa sob concorrência
-- ---------------------------------------------------------------------------

create or replace function private.manage_user_profile(
  target_user_id uuid,
  target_role public.user_role,
  target_status public.active_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_profile public.users_profile;
  active_admins integer;
begin
  if private.current_user_role() <> 'admin'::public.user_role then
    raise exception 'Somente Administrador pode gerenciar usuários';
  end if;
  if target_user_id = (select auth.uid()) then
    raise exception 'Use outro Administrador para alterar o próprio perfil';
  end if;

  select * into target_profile
  from public.users_profile
  where id = target_user_id;

  if not found or target_profile.church_id <> private.current_user_church_id() then
    raise exception 'Usuário não encontrado na igreja atual';
  end if;

  -- Todas as alterações de administradores da mesma igreja usam a mesma trava.
  perform 1
  from public.churches
  where id = target_profile.church_id
  for update;

  select * into target_profile
  from public.users_profile
  where id = target_user_id
  for update;

  if target_profile.role = 'admin'::public.user_role
    and target_profile.status = 'ativo'::public.active_status
    and (
      target_role <> 'admin'::public.user_role
      or target_status <> 'ativo'::public.active_status
    )
  then
    select count(*) into active_admins
    from public.users_profile
    where church_id = target_profile.church_id
      and role = 'admin'::public.user_role
      and status = 'ativo'::public.active_status;

    if active_admins <= 1 then
      raise exception 'A igreja precisa manter ao menos um Administrador ativo';
    end if;
  end if;

  update public.users_profile
  set role = target_role,
      status = target_status
  where id = target_user_id;
end;
$$;

create or replace function private.manage_project_membership(
  target_project_id uuid,
  target_user_id uuid,
  target_role public.user_role,
  target_status public.active_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_church_id uuid;
  target_profile_church_id uuid;
  existing_membership public.project_memberships;
  active_project_admins integer;
  caller_is_global_admin boolean := private.is_global_admin();
begin
  -- A linha do projeto serializa mudanças de administradores neste projeto.
  select church_id into project_church_id
  from public.projects
  where id = target_project_id
    and church_id = private.current_user_church_id()
  for update;

  if not found or not private.can_manage_project_users(target_project_id) then
    raise exception 'Sem permissão para gerenciar usuários deste projeto';
  end if;

  select church_id into target_profile_church_id
  from public.users_profile
  where id = target_user_id;

  if not found or target_profile_church_id <> project_church_id then
    raise exception 'Usuário ou projeto inválido para esta igreja';
  end if;

  select * into existing_membership
  from public.project_memberships
  where project_id = target_project_id
    and user_id = target_user_id
  for update;

  if not caller_is_global_admin and not found then
    raise exception 'Somente o Administrador geral pode incluir novos usuários no projeto';
  end if;

  if not caller_is_global_admin
    and existing_membership.role = 'admin'::public.user_role
    and existing_membership.status = 'ativo'::public.active_status
    and (
      target_role <> 'admin'::public.user_role
      or target_status <> 'ativo'::public.active_status
    )
  then
    select count(*) into active_project_admins
    from public.project_memberships
    where project_id = target_project_id
      and role = 'admin'::public.user_role
      and status = 'ativo'::public.active_status;

    if active_project_admins <= 1 then
      raise exception 'O projeto precisa manter ao menos um Administrador ativo';
    end if;
  end if;

  insert into public.project_memberships (
    project_id, user_id, role, status, created_by, updated_by
  ) values (
    target_project_id, target_user_id, target_role, target_status,
    (select auth.uid()), (select auth.uid())
  )
  on conflict (project_id, user_id) do update
  set role = excluded.role,
      status = excluded.status,
      updated_by = (select auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Fornecedores: criação, vínculo e edição atômicos
-- ---------------------------------------------------------------------------

create or replace function private.create_supplier_with_project(
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
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_church_id uuid := private.current_user_church_id();
  supplier_id uuid;
begin
  if caller_church_id is null then
    raise exception 'Sessão inválida';
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

  if target_project_id is null then
    if not private.is_global_admin() then
      raise exception 'Selecione um projeto para cadastrar o fornecedor';
    end if;
  elsif not private.can_manage_project_finance(target_project_id) then
    raise exception 'Sem permissão para cadastrar fornecedor neste projeto';
  end if;

  if supplier_main_category_id is not null and not exists (
    select 1
    from public.categories category
    join public.projects project on project.id = category.project_id
    where category.id = supplier_main_category_id
      and project.church_id = caller_church_id
      and (target_project_id is null or category.project_id = target_project_id)
      and category.status = 'ativo'::public.active_status
  ) then
    raise exception 'A categoria principal não está ativa no projeto informado';
  end if;

  insert into public.suppliers (
    church_id, name, person_type, document, main_contact, phone, email,
    address, main_category_id, status, notes, created_by, updated_by
  ) values (
    caller_church_id, trim(supplier_name), supplier_person_type,
    nullif(trim(supplier_document), ''), nullif(trim(supplier_main_contact), ''),
    nullif(trim(supplier_phone), ''), nullif(trim(supplier_email), ''),
    nullif(trim(supplier_address), ''), supplier_main_category_id,
    supplier_status, nullif(trim(supplier_notes), ''),
    (select auth.uid()), (select auth.uid())
  ) returning id into supplier_id;

  if target_project_id is not null then
    insert into public.project_suppliers (
      project_id, supplier_id, status, created_by, updated_by
    ) values (
      target_project_id, supplier_id, 'ativo'::public.active_status,
      (select auth.uid()), (select auth.uid())
    );
  end if;

  return supplier_id;
end;
$$;

create or replace function private.link_supplier_to_project(
  target_project_id uuid,
  target_supplier_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_manage_project_finance(target_project_id) then
    raise exception 'Sem permissão para vincular fornecedor neste projeto';
  end if;
  if not exists (
    select 1
    from public.suppliers supplier
    join public.projects project on project.id = target_project_id
    where supplier.id = target_supplier_id
      and supplier.church_id = project.church_id
      and supplier.church_id = private.current_user_church_id()
      and supplier.status = 'ativo'
  ) then
    raise exception 'Fornecedor inválido ou inativo para este projeto';
  end if;

  insert into public.project_suppliers (
    project_id, supplier_id, status, created_by, updated_by
  ) values (
    target_project_id, target_supplier_id, 'ativo'::public.active_status,
    (select auth.uid()), (select auth.uid())
  )
  on conflict (project_id, supplier_id) do update
  set status = 'ativo'::public.active_status,
      updated_by = (select auth.uid());
end;
$$;

create or replace function private.get_unlinked_project_suppliers(
  target_project_id uuid
)
returns table (id uuid, name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.can_manage_project_finance(target_project_id) then
    raise exception 'Sem permissão para consultar fornecedores deste projeto';
  end if;

  return query
  select supplier.id, supplier.name
  from public.suppliers supplier
  join public.projects project on project.id = target_project_id
  where supplier.church_id = project.church_id
    and supplier.status = 'ativo'
    and not exists (
      select 1
      from public.project_suppliers project_supplier
      where project_supplier.project_id = target_project_id
        and project_supplier.supplier_id = supplier.id
        and project_supplier.status = 'ativo'::public.active_status
    )
  order by supplier.name, supplier.id;
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

create or replace function public.create_supplier_with_project(
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
returns uuid
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.create_supplier_with_project(
    target_project_id, supplier_name, supplier_person_type, supplier_document,
    supplier_main_contact, supplier_phone, supplier_email, supplier_address,
    supplier_main_category_id, supplier_status, supplier_notes
  )
$$;

create or replace function public.link_supplier_to_project(
  target_project_id uuid,
  target_supplier_id uuid
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.link_supplier_to_project(target_project_id, target_supplier_id)
$$;

create or replace function public.get_unlinked_project_suppliers(
  target_project_id uuid
)
returns table (id uuid, name text)
language sql
stable
security invoker
set search_path = public, private, pg_temp
as $$
  select * from private.get_unlinked_project_suppliers(target_project_id)
$$;

create or replace function public.update_supplier(
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
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.update_supplier(
    target_supplier_id, target_project_id, supplier_name, supplier_person_type,
    supplier_document, supplier_main_contact, supplier_phone, supplier_email,
    supplier_address, supplier_main_category_id, supplier_status, supplier_notes
  )
$$;

revoke insert, update, delete on public.suppliers from authenticated;
revoke insert, update, delete on public.project_suppliers from authenticated;

-- ---------------------------------------------------------------------------
-- 4. Cotações: relações ativas e edição transacional por RPC
-- ---------------------------------------------------------------------------

create or replace function private.assert_project_relations()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  row_data jsonb := to_jsonb(new);
  row_project_id uuid := (row_data->>'project_id')::uuid;
  row_supplier_id uuid := nullif(row_data->>'supplier_id', '')::uuid;
begin
  if not exists (
    select 1 from public.project_stages
    where id = (row_data->>'stage_id')::uuid
      and project_id = row_project_id
      and (tg_table_name <> 'quotations' or status = 'ativo'::public.active_status)
  ) then
    raise exception 'A etapa precisa estar ativa e pertencer ao projeto informado';
  end if;

  if not exists (
    select 1 from public.categories
    where id = (row_data->>'category_id')::uuid
      and project_id = row_project_id
      and (tg_table_name <> 'quotations' or status = 'ativo'::public.active_status)
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

create or replace function private.update_quotation(
  target_quotation_id uuid,
  target_project_id uuid,
  target_stage_id uuid,
  target_category_id uuid,
  target_title text,
  target_description text,
  target_proponent_name text,
  target_supplier_id uuid,
  target_proponent_phone text,
  target_proponent_email text,
  target_total_value numeric,
  target_execution_deadline text,
  target_quotation_date date,
  target_proposal_valid_until date,
  target_payment_method text,
  target_payment_terms text,
  target_included_scope text,
  target_excluded_scope text,
  target_warranty text,
  target_notes text,
  target_drive_document_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  quotation public.quotations;
begin
  select * into quotation
  from public.quotations
  where id = target_quotation_id
  for update;

  if not found or not private.can_manage_project_quotation(quotation.project_id) then
    raise exception 'Cotação não encontrada ou sem permissão';
  end if;
  if quotation.status <> 'em_analise'::public.quotation_status then
    raise exception 'Apenas cotações em análise podem ser editadas';
  end if;
  if not private.can_manage_project_quotation(target_project_id) then
    raise exception 'Sem permissão para mover a cotação para este projeto';
  end if;
  if nullif(trim(target_title), '') is null
    or nullif(trim(target_proponent_name), '') is null then
    raise exception 'Título e proponente são obrigatórios';
  end if;
  if target_total_value is null or target_total_value <= 0 then
    raise exception 'Informe um valor total maior que zero';
  end if;
  if target_quotation_date is not null
    and target_proposal_valid_until is not null
    and target_proposal_valid_until < target_quotation_date then
    raise exception 'A validade da proposta deve ser posterior à data da cotação';
  end if;

  -- Os gatilhos de relação, URL, ator e ciclo de vida validam a atualização.
  update public.quotations
  set project_id = target_project_id,
      stage_id = target_stage_id,
      category_id = target_category_id,
      title = trim(target_title),
      description = nullif(trim(target_description), ''),
      proponent_name = trim(target_proponent_name),
      supplier_id = target_supplier_id,
      proponent_phone = nullif(trim(target_proponent_phone), ''),
      proponent_email = nullif(trim(target_proponent_email), ''),
      total_value = target_total_value,
      execution_deadline = nullif(trim(target_execution_deadline), ''),
      quotation_date = target_quotation_date,
      proposal_valid_until = target_proposal_valid_until,
      payment_method = nullif(trim(target_payment_method), ''),
      payment_terms = nullif(trim(target_payment_terms), ''),
      included_scope = nullif(trim(target_included_scope), ''),
      excluded_scope = nullif(trim(target_excluded_scope), ''),
      warranty = nullif(trim(target_warranty), ''),
      notes = nullif(trim(target_notes), ''),
      drive_document_url = nullif(trim(target_drive_document_url), ''),
      updated_by = (select auth.uid())
  where id = quotation.id;
end;
$$;

create or replace function public.update_quotation(
  target_quotation_id uuid,
  target_project_id uuid,
  target_stage_id uuid,
  target_category_id uuid,
  target_title text,
  target_description text,
  target_proponent_name text,
  target_supplier_id uuid,
  target_proponent_phone text,
  target_proponent_email text,
  target_total_value numeric,
  target_execution_deadline text,
  target_quotation_date date,
  target_proposal_valid_until date,
  target_payment_method text,
  target_payment_terms text,
  target_included_scope text,
  target_excluded_scope text,
  target_warranty text,
  target_notes text,
  target_drive_document_url text
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.update_quotation(
    target_quotation_id, target_project_id, target_stage_id, target_category_id,
    target_title, target_description, target_proponent_name, target_supplier_id,
    target_proponent_phone, target_proponent_email, target_total_value,
    target_execution_deadline, target_quotation_date,
    target_proposal_valid_until, target_payment_method, target_payment_terms,
    target_included_scope, target_excluded_scope, target_warranty, target_notes,
    target_drive_document_url
  )
$$;

-- ---------------------------------------------------------------------------
-- 5. Agregações exatas no banco, sem o limite de linhas da Data API
-- ---------------------------------------------------------------------------

create or replace function public.get_project_financial_summary(
  target_project_id uuid,
  target_start_date date,
  target_end_date date
)
returns table (
  received_income numeric,
  paid_expenses numeric,
  approved_expenses numeric,
  outstanding_expenses numeric,
  quotations_in_review bigint,
  supplier_pending_budgets bigint,
  approval_pending_budgets bigint,
  payments_count bigint
)
language sql
stable
security invoker
set search_path = public, private, pg_temp
as $$
  with bounds as (
    select
      case
        when extract(day from target_start_date) = 1
          then to_char(target_start_date, 'YYYY-MM')
        else to_char(target_start_date + interval '1 month', 'YYYY-MM')
      end as competence_start,
      to_char(target_end_date, 'YYYY-MM') as competence_end
  ),
  income_totals as (
    select coalesce(sum(income.amount), 0) as received_income
    from public.income_entries income
    where income.project_id = target_project_id
      and income.status = 'recebida'::public.income_status
      and income.received_date between target_start_date and target_end_date
  ),
  payment_totals as (
    select
      coalesce(sum(payment.amount), 0) as paid_expenses,
      count(*) as payments_count
    from public.payments payment
    join public.expenses expense on expense.id = payment.expense_id
    where payment.project_id = target_project_id
      and expense.status <> 'cancelada'::public.expense_status
      and payment.payment_date between target_start_date and target_end_date
  ),
  expense_totals as (
    select
      coalesce(sum(expense.approved_value), 0) as approved_expenses,
      coalesce(sum(expense.remaining_value), 0) as outstanding_expenses
    from public.expenses expense
    cross join bounds
    where expense.project_id = target_project_id
      and expense.status <> 'cancelada'::public.expense_status
      and (
        expense.expected_date between target_start_date and target_end_date
        or (
          expense.expected_date is null
          and bounds.competence_start <= bounds.competence_end
          and expense.competence between bounds.competence_start and bounds.competence_end
        )
      )
  ),
  quotation_totals as (
    select count(*) as quotations_in_review
    from public.quotations quotation
    where quotation.project_id = target_project_id
      and quotation.status = 'em_analise'::public.quotation_status
  ),
  budget_totals as (
    select
      count(*) filter (
        where budget.status = 'fornecedor_pendente'::public.budget_status
      ) as supplier_pending_budgets,
      count(*) filter (
        where budget.status = 'aguardando_aprovacao_financeira'::public.budget_status
      ) as approval_pending_budgets
    from public.budgets budget
    where budget.project_id = target_project_id
  )
  select
    income_totals.received_income,
    payment_totals.paid_expenses,
    expense_totals.approved_expenses,
    expense_totals.outstanding_expenses,
    quotation_totals.quotations_in_review,
    budget_totals.supplier_pending_budgets,
    budget_totals.approval_pending_budgets,
    payment_totals.payments_count
  from income_totals
  cross join payment_totals
  cross join expense_totals
  cross join quotation_totals
  cross join budget_totals
  where private.has_project_access(target_project_id)
    and target_start_date is not null
    and target_end_date is not null
    and target_start_date <= target_end_date
$$;

create or replace function public.get_expense_status_summary(
  target_project_id uuid
)
returns table (
  partial_count bigint,
  partial_outstanding numeric,
  paid_count bigint,
  paid_total numeric,
  open_count bigint,
  open_outstanding numeric
)
language sql
stable
security invoker
set search_path = public, private, pg_temp
as $$
  select
    count(*) filter (where expense.status = 'parcialmente_paga'::public.expense_status),
    coalesce(sum(expense.remaining_value) filter (
      where expense.status = 'parcialmente_paga'::public.expense_status
    ), 0),
    count(*) filter (where expense.status = 'paga'::public.expense_status),
    coalesce(sum(expense.paid_value) filter (
      where expense.status = 'paga'::public.expense_status
    ), 0),
    count(*) filter (where expense.status = 'aprovada'::public.expense_status),
    coalesce(sum(expense.remaining_value) filter (
      where expense.status = 'aprovada'::public.expense_status
    ), 0)
  from public.expenses expense
  where target_project_id is null or expense.project_id = target_project_id
$$;

-- ---------------------------------------------------------------------------
-- 6. Auditoria minimizada e privilégios por coluna
-- ---------------------------------------------------------------------------

create or replace function private.redact_audit_payload(
  payload jsonb,
  entity_type text
)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when payload is null then null
    else payload - (
      array[
        'document', 'phone', 'email', 'address', 'main_contact',
        'proponent_name', 'proponent_phone', 'proponent_email',
        'free_recipient', 'main_responsible', 'origin',
        'drive_document_url', 'drive_receipt_url', 'notes', 'description',
        'included_scope', 'excluded_scope', 'payment_terms', 'church_function'
      ]::text[]
      || case
        when entity_type in ('users_profile', 'suppliers')
          then array['name']::text[]
        else array[]::text[]
      end
    )
  end
$$;

create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_data jsonb;
  old_data jsonb;
  entity uuid;
  project uuid;
  church uuid;
begin
  new_data := case
    when tg_op = 'DELETE' then null
    else private.redact_audit_payload(to_jsonb(new), tg_table_name)
  end;
  old_data := case
    when tg_op = 'INSERT' then null
    else private.redact_audit_payload(to_jsonb(old), tg_table_name)
  end;
  entity := coalesce((new_data->>'id')::uuid, (old_data->>'id')::uuid);
  project := coalesce((new_data->>'project_id')::uuid, (old_data->>'project_id')::uuid);
  church := coalesce(
    (new_data->>'church_id')::uuid,
    (old_data->>'church_id')::uuid
  );

  if church is null and project is not null then
    select project_row.church_id into church
    from public.projects project_row
    where project_row.id = project;
  end if;

  church := coalesce(church, private.current_user_church_id());

  insert into public.audit_logs (
    church_id, project_id, user_id, action, entity_type, entity_id,
    old_value, new_value
  ) values (
    church, project, (select auth.uid()), lower(tg_op), tg_table_name, entity,
    old_data, new_data
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke select on public.audit_logs from authenticated;
grant select (
  id, church_id, project_id, user_id, action, entity_type, entity_id, notes,
  created_at
) on public.audit_logs to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Índices dos filtros, relações e exclusões mais frequentes
-- ---------------------------------------------------------------------------

create index if not exists payments_expense_id_idx
  on public.payments (expense_id);
create index if not exists quotations_supplier_id_idx
  on public.quotations (supplier_id) where supplier_id is not null;
create index if not exists budgets_supplier_id_idx
  on public.budgets (supplier_id) where supplier_id is not null;
create index if not exists expenses_supplier_id_idx
  on public.expenses (supplier_id) where supplier_id is not null;
create index if not exists quotations_stage_id_idx
  on public.quotations (stage_id);
create index if not exists quotations_category_id_idx
  on public.quotations (category_id);
create index if not exists budgets_stage_id_idx
  on public.budgets (stage_id);
create index if not exists budgets_category_id_idx
  on public.budgets (category_id);
create index if not exists expenses_stage_id_idx
  on public.expenses (stage_id);
create index if not exists expenses_category_id_idx
  on public.expenses (category_id);
create index if not exists incomes_category_id_idx
  on public.income_entries (category_id) where category_id is not null;
create index if not exists incomes_project_status_date_idx
  on public.income_entries (project_id, status, received_date desc);
create index if not exists expenses_active_project_expected_date_idx
  on public.expenses (project_id, expected_date)
  include (approved_value, remaining_value)
  where status <> 'cancelada'::public.expense_status
    and expected_date is not null;
create index if not exists expenses_active_project_competence_idx
  on public.expenses (project_id, competence)
  include (approved_value, remaining_value)
  where status <> 'cancelada'::public.expense_status
    and expected_date is null;

-- Índices de cobertura das FKs evitam varreduras e locks prolongados ao
-- validar alterações/exclusões nas tabelas referenciadas.
create index if not exists audit_logs_church_id_idx
  on public.audit_logs (church_id);
create index if not exists audit_logs_user_id_idx
  on public.audit_logs (user_id);
create index if not exists budgets_created_by_idx
  on public.budgets (created_by);
create index if not exists budgets_quotation_approved_by_idx
  on public.budgets (quotation_approved_by);
create index if not exists budgets_updated_by_idx
  on public.budgets (updated_by);
create index if not exists categories_created_by_idx
  on public.categories (created_by);
create index if not exists categories_updated_by_idx
  on public.categories (updated_by);
create index if not exists expenses_approved_by_idx
  on public.expenses (approved_by);
create index if not exists income_entries_registered_by_idx
  on public.income_entries (registered_by);
create index if not exists payments_registered_by_idx
  on public.payments (registered_by);
create index if not exists project_memberships_created_by_idx
  on public.project_memberships (created_by);
create index if not exists project_memberships_updated_by_idx
  on public.project_memberships (updated_by);
create index if not exists project_stages_created_by_idx
  on public.project_stages (created_by);
create index if not exists project_stages_updated_by_idx
  on public.project_stages (updated_by);
create index if not exists project_suppliers_created_by_idx
  on public.project_suppliers (created_by);
create index if not exists project_suppliers_updated_by_idx
  on public.project_suppliers (updated_by);
create index if not exists projects_created_by_idx
  on public.projects (created_by);
create index if not exists projects_updated_by_idx
  on public.projects (updated_by);
create index if not exists quotations_created_by_idx
  on public.quotations (created_by);
create index if not exists quotations_rejected_by_idx
  on public.quotations (rejected_by);
create index if not exists quotations_updated_by_idx
  on public.quotations (updated_by);
create index if not exists suppliers_church_id_idx
  on public.suppliers (church_id);
create index if not exists suppliers_created_by_idx
  on public.suppliers (created_by);
create index if not exists suppliers_main_category_id_idx
  on public.suppliers (main_category_id);
create index if not exists suppliers_updated_by_idx
  on public.suppliers (updated_by);
create index if not exists users_profile_church_id_idx
  on public.users_profile (church_id);

-- ---------------------------------------------------------------------------
-- 8. Grants explícitos para a Data API
-- ---------------------------------------------------------------------------

revoke all on function private.create_supplier_with_project(uuid, text, text, text, text, text, text, text, uuid, text, text),
  private.link_supplier_to_project(uuid, uuid),
  private.get_unlinked_project_suppliers(uuid),
  private.update_supplier(uuid, uuid, text, text, text, text, text, text, text, uuid, text, text),
  private.update_quotation(uuid, uuid, uuid, uuid, text, text, text, uuid, text, text, numeric, text, date, date, text, text, text, text, text, text, text),
  private.redact_audit_payload(jsonb, text)
from public, anon;

grant execute on function private.create_supplier_with_project(uuid, text, text, text, text, text, text, text, uuid, text, text),
  private.link_supplier_to_project(uuid, uuid),
  private.get_unlinked_project_suppliers(uuid),
  private.update_supplier(uuid, uuid, text, text, text, text, text, text, text, uuid, text, text),
  private.update_quotation(uuid, uuid, uuid, uuid, text, text, text, uuid, text, text, numeric, text, date, date, text, text, text, text, text, text, text)
to authenticated;

revoke all on function public.create_supplier_with_project(uuid, text, text, text, text, text, text, text, uuid, text, text),
  public.link_supplier_to_project(uuid, uuid),
  public.get_unlinked_project_suppliers(uuid),
  public.update_supplier(uuid, uuid, text, text, text, text, text, text, text, uuid, text, text),
  public.update_quotation(uuid, uuid, uuid, uuid, text, text, text, uuid, text, text, numeric, text, date, date, text, text, text, text, text, text, text),
  public.get_project_financial_summary(uuid, date, date),
  public.get_expense_status_summary(uuid)
from public, anon;

grant execute on function public.create_supplier_with_project(uuid, text, text, text, text, text, text, text, uuid, text, text),
  public.link_supplier_to_project(uuid, uuid),
  public.get_unlinked_project_suppliers(uuid),
  public.update_supplier(uuid, uuid, text, text, text, text, text, text, text, uuid, text, text),
  public.update_quotation(uuid, uuid, uuid, uuid, text, text, text, uuid, text, text, numeric, text, date, date, text, text, text, text, text, text, text),
  public.get_project_financial_summary(uuid, date, date),
  public.get_expense_status_summary(uuid)
to authenticated;

-- SECURITY DEFINER nunca deve resolver objetos em schemas graváveis por
-- usuários. A regra também cobre as funções privilegiadas das migrações
-- anteriores, sem depender de uma lista de assinaturas mantida à mão.
do $hardening$
declare
  secured_function text;
begin
  for secured_function in
    select pg_catalog.format(
      '%I.%I(%s)',
      namespace.nspname,
      procedure.proname,
      pg_catalog.pg_get_function_identity_arguments(procedure.oid)
    )
    from pg_catalog.pg_proc procedure
    join pg_catalog.pg_namespace namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname in ('public', 'private')
      and procedure.prosecdef
      and not exists (
        select 1
        from pg_catalog.pg_depend dependency
        where dependency.classid = 'pg_catalog.pg_proc'::regclass
          and dependency.objid = procedure.oid
          and dependency.deptype = 'e'
      )
  loop
    execute pg_catalog.format(
      'alter function %s set search_path = %L',
      secured_function,
      ''
    );
  end loop;
end
$hardening$;

-- Novas funções só entram na Data API após concessão explícita.
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges in schema private
  revoke execute on functions from public, anon, authenticated;
