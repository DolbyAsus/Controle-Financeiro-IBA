-- Administradores de projeto podem incluir novos usuários somente em projetos
-- que já administram. A função mantém as barreiras de igreja, a trava do
-- projeto e a proteção do último Administrador ativo.
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

revoke all on function private.manage_project_membership(
  uuid, uuid, public.user_role, public.active_status
) from public, anon;
grant execute on function private.manage_project_membership(
  uuid, uuid, public.user_role, public.active_status
) to authenticated;
