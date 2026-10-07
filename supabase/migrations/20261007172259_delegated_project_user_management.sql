-- Gestão de acessos por projeto.
--
-- "admin" em users_profile é o Administrador geral da igreja. Já o papel
-- "admin" em project_memberships é o Administrador do projeto e não concede
-- acesso global. As regras abaixo mantêm essa separação também no banco.

create or replace function private.can_manage_project_users(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select private.is_global_admin()
    or private.current_project_role(target_project_id) = 'admin'::public.user_role
$$;

create or replace function private.can_view_user_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select target_user_id = (select auth.uid())
    or private.is_global_admin()
    or exists (
      select 1
      from public.project_memberships target_membership
      join public.project_memberships manager_membership
        on manager_membership.project_id = target_membership.project_id
       and manager_membership.user_id = (select auth.uid())
       and manager_membership.status = 'ativo'::public.active_status
       and manager_membership.role = 'admin'::public.user_role
      where target_membership.user_id = target_user_id
    )
$$;

-- Toda alteração de vínculo passa pela função para que created_by/updated_by
-- sejam sempre o usuário autenticado e para impedir que um Admin de projeto
-- inclua pessoas que ainda não pertencem ao seu próprio projeto.
create or replace function private.manage_project_membership(
  target_project_id uuid,
  target_user_id uuid,
  target_role public.user_role,
  target_status public.active_status
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_is_member boolean;
begin
  if not private.can_manage_project_users(target_project_id) then
    raise exception 'Sem permissão para gerenciar usuários deste projeto';
  end if;

  if not exists (
    select 1
    from public.projects project
    join public.users_profile profile on profile.id = target_user_id
    where project.id = target_project_id
      and project.church_id = profile.church_id
  ) then
    raise exception 'Usuário ou projeto inválido para esta igreja';
  end if;

  select exists (
    select 1
    from public.project_memberships membership
    where membership.project_id = target_project_id
      and membership.user_id = target_user_id
  ) into target_is_member;

  if not private.is_global_admin() and not target_is_member then
    raise exception 'Somente o Administrador geral pode incluir novos usuários no projeto';
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

create or replace function public.manage_project_membership(
  target_project_id uuid,
  target_user_id uuid,
  target_role public.user_role,
  target_status public.active_status
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.manage_project_membership(
    target_project_id,
    target_user_id,
    target_role,
    target_status
  )
$$;

revoke all on function private.can_manage_project_users(uuid), private.can_view_user_profile(uuid), private.manage_project_membership(uuid, uuid, public.user_role, public.active_status) from public, anon;
grant execute on function private.can_manage_project_users(uuid), private.can_view_user_profile(uuid), private.manage_project_membership(uuid, uuid, public.user_role, public.active_status) to authenticated;
revoke all on function public.manage_project_membership(uuid, uuid, public.user_role, public.active_status) from public, anon;
grant execute on function public.manage_project_membership(uuid, uuid, public.user_role, public.active_status) to authenticated;

-- Um administrador de projeto enxerga somente perfis já vinculados a algum
-- projeto que ele administra. O administrador geral preserva a visão da igreja.
drop policy if exists profile_read on public.users_profile;
create policy profile_read_self_global_or_managed_project
on public.users_profile for select to authenticated
using (private.can_view_user_profile(id));

drop policy if exists project_membership_read_self_or_global_admin on public.project_memberships;
drop policy if exists project_membership_manage_global_admin on public.project_memberships;

create policy project_membership_read_self_global_or_project_admin
on public.project_memberships for select to authenticated
using (
  user_id = (select auth.uid())
  or private.can_manage_project_users(project_id)
);

-- Escrita direta é removida: somente a RPC acima pode incluir ou atualizar
-- vínculos. Isso evita alteração arbitrária dos campos de auditoria.
revoke insert, update, delete on public.project_memberships from authenticated;
