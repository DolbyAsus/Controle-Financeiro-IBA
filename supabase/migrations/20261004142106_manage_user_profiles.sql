-- Somente Administradores podem ajustar os perfis da própria igreja.
-- O perfil do usuário autenticado não pode ser alterado por esta função para
-- evitar auto-revogação ou escalonamento acidental durante a operação.
create function private.manage_user_profile(
  target_user_id uuid,
  target_role public.user_role,
  target_status public.active_status
)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare target_profile public.users_profile;
begin
  if private.current_user_role() <> 'admin' then
    raise exception 'Somente Administrador pode gerenciar usuários';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'Use outro Administrador para alterar o próprio perfil';
  end if;
  select * into target_profile from public.users_profile where id = target_user_id for update;
  if not found or target_profile.church_id <> private.current_user_church_id() then
    raise exception 'Usuário não encontrado na igreja atual';
  end if;
  update public.users_profile
  set role = target_role, status = target_status
  where id = target_user_id;
end;
$$;

revoke all on function private.manage_user_profile(uuid, public.user_role, public.active_status) from public;
grant execute on function private.manage_user_profile(uuid, public.user_role, public.active_status) to authenticated;

create function public.manage_user_profile(
  target_user_id uuid,
  target_role public.user_role,
  target_status public.active_status
)
returns void language sql security invoker set search_path = public, private, pg_temp as $$
  select private.manage_user_profile(target_user_id, target_role, target_status)
$$;

revoke all on function public.manage_user_profile(uuid, public.user_role, public.active_status) from public, anon;
grant execute on function public.manage_user_profile(uuid, public.user_role, public.active_status) to authenticated;
