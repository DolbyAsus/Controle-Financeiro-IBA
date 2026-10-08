begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

insert into public.churches (id, name)
values
  ('10000000-0000-0000-0000-000000000001', 'Igreja de teste A'),
  ('20000000-0000-0000-0000-000000000002', 'Igreja de teste B');

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '10000000-0000-0000-0000-000000000011',
    'admin-a@tenant.test',
    '{"name":"Administrador A"}'::jsonb
  ),
  (
    '20000000-0000-0000-0000-000000000022',
    'admin-b@tenant.test',
    '{"name":"Administrador B"}'::jsonb
  );

update public.users_profile
set church_id = '10000000-0000-0000-0000-000000000001',
    role = 'admin'::public.user_role
where id = '10000000-0000-0000-0000-000000000011';

update public.users_profile
set church_id = '20000000-0000-0000-0000-000000000002',
    role = 'admin'::public.user_role
where id = '20000000-0000-0000-0000-000000000022';

insert into public.projects (id, church_id, name, status)
values
  (
    '10000000-0000-0000-0000-000000000101',
    '10000000-0000-0000-0000-000000000001',
    'Projeto A',
    'em_andamento'::public.project_status
  ),
  (
    '20000000-0000-0000-0000-000000000202',
    '20000000-0000-0000-0000-000000000002',
    'Projeto B',
    'em_andamento'::public.project_status
  );

insert into public.suppliers (id, church_id, name, status)
values (
  '20000000-0000-0000-0000-000000000303',
  '20000000-0000-0000-0000-000000000002',
  'Fornecedor B',
  'ativo'
);

insert into public.project_stages (id, project_id, name, sort_order, status)
values (
  '10000000-0000-0000-0000-000000000401',
  '10000000-0000-0000-0000-000000000101',
  'Etapa A',
  1,
  'ativo'::public.active_status
);

insert into public.categories (id, project_id, name, type, status)
values (
  '10000000-0000-0000-0000-000000000402',
  '10000000-0000-0000-0000-000000000101',
  'Saídas A',
  'saida'::public.category_type,
  'ativo'::public.active_status
);

insert into public.expenses (
  id, project_id, stage_id, category_id, free_recipient, description,
  approved_value, remaining_value, competence, approved_by
) values (
  '10000000-0000-0000-0000-000000000403',
  '10000000-0000-0000-0000-000000000101',
  '10000000-0000-0000-0000-000000000401',
  '10000000-0000-0000-0000-000000000402',
  'Destinatário de teste',
  'Despesa de fevereiro',
  100,
  100,
  '2026-02',
  '10000000-0000-0000-0000-000000000011'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000011';
set local "request.jwt.claim.role" = 'authenticated';

select ok(
  private.has_project_access('10000000-0000-0000-0000-000000000101'),
  'Administrador acessa projeto da própria igreja'
);

select ok(
  not private.has_project_access('20000000-0000-0000-0000-000000000202'),
  'Administrador não acessa projeto de outra igreja'
);

select results_eq(
  $$select id from public.projects order by id$$,
  $$values ('10000000-0000-0000-0000-000000000101'::uuid)$$,
  'RLS de projetos não cruza igrejas'
);

select results_eq(
  $$select count(*) from public.suppliers where id = '20000000-0000-0000-0000-000000000303'::uuid$$,
  array[0::bigint],
  'RLS de fornecedores não cruza igrejas'
);

select throws_ok(
  $$
    select public.create_supplier_with_project(
      '20000000-0000-0000-0000-000000000202'::uuid,
      'Fornecedor indevido', null, null, null, null, null, null, null,
      'ativo', null
    )
  $$,
  'P0001',
  'Sem permissão para cadastrar fornecedor neste projeto',
  'RPC rejeita criação de fornecedor em outra igreja'
);

select lives_ok(
  $$
    select public.create_supplier_with_project(
      '10000000-0000-0000-0000-000000000101'::uuid,
      'Fornecedor permitido', null, null, null, null, null, null, null,
      'ativo', null
    )
  $$,
  'RPC cria fornecedor e vínculo no projeto autorizado'
);

select throws_ok(
  $$
    insert into public.suppliers (church_id, name, status)
    values (
      '10000000-0000-0000-0000-000000000001'::uuid,
      'Inserção direta',
      'ativo'
    )
  $$,
  '42501',
  'permission denied for table suppliers',
  'inserção direta de fornecedor permanece revogada'
);

select throws_ok(
  $$
    select public.manage_user_profile(
      '20000000-0000-0000-0000-000000000022'::uuid,
      'visualizador'::public.user_role,
      'ativo'::public.active_status
    )
  $$,
  'P0001',
  'Usuário não encontrado na igreja atual',
  'Administrador não altera perfil de outra igreja'
);

select results_eq(
  $$
    select count(*)
    from public.get_project_financial_summary(
      '20000000-0000-0000-0000-000000000202'::uuid,
      '2026-01-01'::date,
      '2026-12-31'::date
    )
  $$,
  array[0::bigint],
  'agregação financeira não retorna projeto de outra igreja'
);

select results_eq(
  $$
    select count(*)
    from public.get_project_financial_summary(
      '10000000-0000-0000-0000-000000000101'::uuid,
      '2026-01-01'::date,
      '2026-12-31'::date
    )
  $$,
  array[1::bigint],
  'agregação financeira retorna projeto autorizado'
);

select results_eq(
  $$
    select approved_expenses
    from public.get_project_financial_summary(
      '10000000-0000-0000-0000-000000000101'::uuid,
      '2026-01-15'::date,
      '2026-01-31'::date
    )
  $$,
  array[0::numeric],
  'competência de fevereiro não entra em intervalo parcial de janeiro'
);

select results_eq(
  $$
    select approved_expenses
    from public.get_project_financial_summary(
      '10000000-0000-0000-0000-000000000101'::uuid,
      '2026-01-15'::date,
      '2026-02-15'::date
    )
  $$,
  array[100::numeric],
  'competência de fevereiro entra quando o primeiro dia pertence ao intervalo'
);

reset role;
select * from finish();
rollback;
