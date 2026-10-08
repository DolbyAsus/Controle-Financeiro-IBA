begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(4);

insert into public.churches (id, name)
values
  ('30000000-0000-0000-0000-000000000001', 'Igreja de convite A'),
  ('40000000-0000-0000-0000-000000000001', 'Igreja de convite B');

insert into auth.users (id, email, raw_user_meta_data)
values
  ('30000000-0000-0000-0000-000000000011', 'admin-projeto@convite.test', '{"name":"Admin projeto"}'::jsonb),
  ('30000000-0000-0000-0000-000000000012', 'convidado@convite.test', '{"name":"Convidado"}'::jsonb),
  ('40000000-0000-0000-0000-000000000013', 'outra-igreja@convite.test', '{"name":"Outra igreja"}'::jsonb);

update public.users_profile
set church_id = '30000000-0000-0000-0000-000000000001'
where id in (
  '30000000-0000-0000-0000-000000000011',
  '30000000-0000-0000-0000-000000000012'
);

update public.users_profile
set church_id = '40000000-0000-0000-0000-000000000001'
where id = '40000000-0000-0000-0000-000000000013';

insert into public.projects (id, church_id, name, status)
values (
  '30000000-0000-0000-0000-000000000101',
  '30000000-0000-0000-0000-000000000001',
  'Projeto de convite',
  'em_andamento'::public.project_status
);

insert into public.project_memberships (
  project_id, user_id, role, status
) values (
  '30000000-0000-0000-0000-000000000101',
  '30000000-0000-0000-0000-000000000011',
  'admin'::public.user_role,
  'ativo'::public.active_status
);

set local role authenticated;
set local "request.jwt.claim.sub" = '30000000-0000-0000-0000-000000000011';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  $$
    select public.manage_project_membership(
      '30000000-0000-0000-0000-000000000101'::uuid,
      '30000000-0000-0000-0000-000000000012'::uuid,
      'visualizador'::public.user_role,
      'ativo'::public.active_status
    )
  $$,
  'Administrador do projeto inclui novo usuário da mesma igreja'
);

select results_eq(
  $$
    select count(*)
    from public.project_memberships
    where project_id = '30000000-0000-0000-0000-000000000101'::uuid
      and user_id = '30000000-0000-0000-0000-000000000012'::uuid
  $$,
  array[1::bigint],
  'Novo vínculo foi criado no projeto correto'
);

select results_eq(
  $$
    select created_by
    from public.project_memberships
    where project_id = '30000000-0000-0000-0000-000000000101'::uuid
      and user_id = '30000000-0000-0000-0000-000000000012'::uuid
  $$,
  $$values ('30000000-0000-0000-0000-000000000011'::uuid)$$,
  'Vínculo registra o administrador responsável pelo convite'
);

select throws_ok(
  $$
    select public.manage_project_membership(
      '30000000-0000-0000-0000-000000000101'::uuid,
      '40000000-0000-0000-0000-000000000013'::uuid,
      'visualizador'::public.user_role,
      'ativo'::public.active_status
    )
  $$,
  'P0001',
  'Usuário ou projeto inválido para esta igreja',
  'Administrador do projeto não inclui usuário de outra igreja'
);

reset role;
select * from finish();
rollback;
