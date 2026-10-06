-- Acesso por projeto e fornecedores vinculados a cada projeto.
--
-- O papel em users_profile continua identificando o Administrador global da
-- igreja. Para todos os demais usuários, a permissão operacional será
-- concedida exclusivamente em project_memberships. project_suppliers mantém
-- um único cadastro de fornecedor que pode ser reutilizado em vários projetos.

create table public.project_memberships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  user_id uuid not null references public.users_profile(id) on delete cascade,
  role public.user_role not null default 'visualizador',
  status public.active_status not null default 'ativo',
  created_by uuid references public.users_profile(id) on delete set null,
  updated_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table public.project_suppliers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  status public.active_status not null default 'ativo',
  notes text,
  created_by uuid references public.users_profile(id) on delete set null,
  updated_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, supplier_id),
  check (notes is null or char_length(notes) <= 2000)
);

create index project_memberships_user_active_idx
  on public.project_memberships (user_id, status, project_id);
create index project_memberships_project_active_idx
  on public.project_memberships (project_id, status, user_id);
create index project_suppliers_project_active_idx
  on public.project_suppliers (project_id, status, supplier_id);
create index project_suppliers_supplier_idx
  on public.project_suppliers (supplier_id, project_id);

-- Fornecedores já usados por documentos financeiros ou associados a uma
-- categoria existente são vinculados ao respectivo projeto. Fornecedores sem
-- uso permanecem no cadastro mestre e poderão ser associados explicitamente.
insert into public.project_suppliers (project_id, supplier_id, status)
select distinct relation.project_id, relation.supplier_id, 'ativo'::public.active_status
from (
  select quotation.project_id, quotation.supplier_id
  from public.quotations quotation
  join public.suppliers supplier on supplier.id = quotation.supplier_id
  union
  select budget.project_id, budget.supplier_id
  from public.budgets budget
  join public.suppliers supplier on supplier.id = budget.supplier_id
  union
  select expense.project_id, expense.supplier_id
  from public.expenses expense
  join public.suppliers supplier on supplier.id = expense.supplier_id
  union
  select category.project_id, supplier.id
  from public.suppliers supplier
  join public.categories category on category.id = supplier.main_category_id
  where supplier.main_category_id is not null
) relation
on conflict (project_id, supplier_id) do nothing;

create or replace function private.is_global_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select private.current_user_role() = 'admin'::public.user_role
$$;

create or replace function private.current_project_role(target_project_id uuid)
returns public.user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select membership.role
  from public.project_memberships membership
  join public.projects project on project.id = membership.project_id
  where membership.project_id = target_project_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'ativo'::public.active_status
    and project.church_id = private.current_user_church_id()
  limit 1
$$;

create or replace function private.has_project_access(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select private.is_global_admin()
    or exists (
      select 1
      from public.project_memberships membership
      join public.projects project on project.id = membership.project_id
      where membership.project_id = target_project_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'ativo'::public.active_status
        and project.church_id = private.current_user_church_id()
    )
$$;

create or replace function private.assert_project_membership_church()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.projects project
    join public.users_profile profile on profile.id = new.user_id
    where project.id = new.project_id
      and project.church_id = profile.church_id
  ) then
    raise exception 'O usuário e o projeto precisam pertencer à mesma igreja';
  end if;
  return new;
end;
$$;

create or replace function private.assert_project_supplier_church()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.projects project
    join public.suppliers supplier on supplier.id = new.supplier_id
    where project.id = new.project_id
      and project.church_id = supplier.church_id
  ) then
    raise exception 'O fornecedor e o projeto precisam pertencer à mesma igreja';
  end if;
  return new;
end;
$$;

create trigger set_project_membership_updated_at
before update on public.project_memberships
for each row execute function private.set_updated_at();

create trigger set_project_supplier_updated_at
before update on public.project_suppliers
for each row execute function private.set_updated_at();

create trigger check_project_membership_church
before insert or update on public.project_memberships
for each row execute function private.assert_project_membership_church();

create trigger check_project_supplier_church
before insert or update on public.project_suppliers
for each row execute function private.assert_project_supplier_church();

-- O gatilho de auditoria existente identifica automaticamente project_id em
-- ambas as tabelas e registra concessões, revogações e associações.
create trigger audit_project_membership
after insert or update or delete on public.project_memberships
for each row execute function private.audit_row_change();

create trigger audit_project_supplier
after insert or update or delete on public.project_suppliers
for each row execute function private.audit_row_change();

alter table public.project_memberships enable row level security;
alter table public.project_suppliers enable row level security;

grant select, insert, update, delete on public.project_memberships to authenticated;
grant select, insert, update, delete on public.project_suppliers to authenticated;

revoke all on function private.is_global_admin() from public, anon;
revoke all on function private.current_project_role(uuid) from public, anon;
revoke all on function private.assert_project_membership_church() from public, anon, authenticated;
revoke all on function private.assert_project_supplier_church() from public, anon, authenticated;
grant execute on function private.is_global_admin(), private.current_project_role(uuid) to authenticated;

-- Somente Administradores globais gerenciam vínculos nesta primeira etapa.
-- A administração delegada por projeto será disponibilizada com a interface
-- própria, na etapa seguinte, sem abrir políticas provisórias.
create policy project_membership_read_self_or_global_admin
on public.project_memberships for select to authenticated
using (user_id = (select auth.uid()) or private.is_global_admin());

create policy project_membership_manage_global_admin
on public.project_memberships for all to authenticated
using (private.is_global_admin())
with check (private.is_global_admin());

create policy project_supplier_read_for_project_access
on public.project_suppliers for select to authenticated
using (private.has_project_access(project_id));

create policy project_supplier_manage_global_admin
on public.project_suppliers for all to authenticated
using (private.is_global_admin())
with check (private.is_global_admin());

-- Substitui o escopo "toda a igreja" por acesso explícito a projeto.
drop policy if exists project_read on public.projects;
create policy project_read
on public.projects for select to authenticated
using (private.has_project_access(id));

drop policy if exists project_write on public.projects;
create policy project_write
on public.projects for all to authenticated
using (private.is_global_admin() and church_id = private.current_user_church_id())
with check (private.is_global_admin() and church_id = private.current_user_church_id());

-- Um fornecedor só é visível quando está associado a ao menos um projeto que
-- o usuário pode abrir. O Administrador global mantém o catálogo completo.
drop policy if exists supplier_read on public.suppliers;
create policy supplier_read_for_project_access
on public.suppliers for select to authenticated
using (
  private.is_global_admin()
  or exists (
    select 1
    from public.project_suppliers project_supplier
    where project_supplier.supplier_id = suppliers.id
      and project_supplier.status = 'ativo'::public.active_status
      and private.has_project_access(project_supplier.project_id)
  )
);

-- Enquanto a tela de fornecedores não estiver contextualizada pelo projeto,
-- a escrita é limitada ao Administrador global. Isso evita que um perfil com
-- acesso a um projeto cadastre ou altere fornecedores fora do seu escopo.
drop policy if exists supplier_write on public.suppliers;
create policy supplier_write_global_admin
on public.suppliers for all to authenticated
using (private.is_global_admin() and church_id = private.current_user_church_id())
with check (private.is_global_admin() and church_id = private.current_user_church_id());

drop policy if exists audit_read_finance_managers on public.audit_logs;
drop policy if exists audit_read on public.audit_logs;
create policy audit_read_for_project_finance_or_global_admin
on public.audit_logs for select to authenticated
using (
  private.is_global_admin()
  or (
    project_id is not null
    and private.has_project_access(project_id)
    and private.current_project_role(project_id) in ('admin'::public.user_role, 'financeiro'::public.user_role)
  )
);
