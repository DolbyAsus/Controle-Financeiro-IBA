begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(6);

insert into public.churches (id, name)
values ('30000000-0000-0000-0000-000000000001', 'Igreja de teste fornecedor');

insert into auth.users (id, email, raw_user_meta_data)
values (
  '30000000-0000-0000-0000-000000000011',
  'admin-fornecedor@tenant.test',
  '{"name":"Administrador fornecedor"}'::jsonb
);

update public.users_profile
set church_id = '30000000-0000-0000-0000-000000000001',
    role = 'admin'::public.user_role
where id = '30000000-0000-0000-0000-000000000011';

insert into public.projects (id, church_id, name, status)
values (
  '30000000-0000-0000-0000-000000000101',
  '30000000-0000-0000-0000-000000000001',
  'Projeto fornecedor',
  'em_andamento'::public.project_status
);

insert into public.project_stages (id, project_id, name, sort_order, status)
values (
  '30000000-0000-0000-0000-000000000201',
  '30000000-0000-0000-0000-000000000101',
  'Etapa fornecedor',
  1,
  'ativo'::public.active_status
);

insert into public.categories (id, project_id, name, type, status)
values (
  '30000000-0000-0000-0000-000000000202',
  '30000000-0000-0000-0000-000000000101',
  'Categoria fornecedor',
  'saida'::public.category_type,
  'ativo'::public.active_status
);

insert into public.suppliers (id, church_id, name, status, created_by, updated_by)
values (
  '30000000-0000-0000-0000-000000000301',
  '30000000-0000-0000-0000-000000000001',
  'Fornecedor a desativar',
  'ativo',
  '30000000-0000-0000-0000-000000000011',
  '30000000-0000-0000-0000-000000000011'
);

insert into public.project_suppliers (
  id, project_id, supplier_id, status, created_by, updated_by
) values (
  '30000000-0000-0000-0000-000000000302',
  '30000000-0000-0000-0000-000000000101',
  '30000000-0000-0000-0000-000000000301',
  'ativo'::public.active_status,
  '30000000-0000-0000-0000-000000000011',
  '30000000-0000-0000-0000-000000000011'
);

insert into public.quotations (
  id, project_id, stage_id, category_id, title, proponent_name,
  supplier_id, total_value, status, created_by, updated_by
) values (
  '30000000-0000-0000-0000-000000000401',
  '30000000-0000-0000-0000-000000000101',
  '30000000-0000-0000-0000-000000000201',
  '30000000-0000-0000-0000-000000000202',
  'Cotação do fornecedor',
  'Fornecedor a desativar',
  '30000000-0000-0000-0000-000000000301',
  100,
  'em_analise'::public.quotation_status,
  '30000000-0000-0000-0000-000000000011',
  '30000000-0000-0000-0000-000000000011'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '30000000-0000-0000-0000-000000000011';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  $$
    select public.update_supplier(
      '30000000-0000-0000-0000-000000000301'::uuid,
      '30000000-0000-0000-0000-000000000101'::uuid,
      'Fornecedor a desativar', null, null, null, null, null, null, null,
      'inativo', null
    )
  $$,
  'desativação do fornecedor é concluída com a rejeição das cotações abertas'
);

select results_eq(
  $$select status from public.suppliers where id = '30000000-0000-0000-0000-000000000301'::uuid$$,
  $$values ('inativo'::text)$$,
  'fornecedor é desativado'
);

select results_eq(
  $$select status from public.quotations where id = '30000000-0000-0000-0000-000000000401'::uuid$$,
  $$values ('reprovada'::public.quotation_status)$$,
  'cotação em análise é rejeitada'
);

select results_eq(
  $$select rejection_justification from public.quotations where id = '30000000-0000-0000-0000-000000000401'::uuid$$,
  $$values ('Cotação rejeitada automaticamente porque o fornecedor vinculado foi desativado.'::text)$$,
  'rejeição registra justificativa automática'
);

select results_eq(
  $$select rejected_by from public.quotations where id = '30000000-0000-0000-0000-000000000401'::uuid$$,
  $$values ('30000000-0000-0000-0000-000000000011'::uuid)$$,
  'rejeição registra o usuário que desativou o fornecedor'
);

select ok(
  (
    select rejected_at is not null
      and notes like '%Reprovação: Cotação rejeitada automaticamente%'
    from public.quotations
    where id = '30000000-0000-0000-0000-000000000401'::uuid
  ),
  'rejeição registra horário e histórico legível'
);

select * from finish();
rollback;
