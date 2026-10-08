begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(24);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.projects'::regclass),
  'projects mantém RLS habilitado'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.audit_logs'::regclass),
  'audit_logs mantém RLS habilitado'
);

select ok(
  not has_table_privilege('authenticated', 'public.quotations', 'UPDATE'),
  'authenticated não atualiza cotações diretamente'
);

select ok(
  not has_table_privilege('authenticated', 'public.suppliers', 'INSERT'),
  'authenticated não cria fornecedores diretamente'
);

select ok(
  not has_table_privilege('authenticated', 'public.suppliers', 'UPDATE'),
  'authenticated não edita fornecedores diretamente'
);

select ok(
  not has_table_privilege('authenticated', 'public.project_suppliers', 'INSERT'),
  'authenticated não cria vínculos de fornecedor diretamente'
);

select ok(
  not has_column_privilege('authenticated', 'public.audit_logs', 'old_value', 'SELECT'),
  'snapshots antigos de auditoria não são expostos pela Data API'
);

select ok(
  not has_column_privilege('authenticated', 'public.audit_logs', 'new_value', 'SELECT'),
  'snapshots novos de auditoria não são expostos pela Data API'
);

select ok(
  has_column_privilege('authenticated', 'public.audit_logs', 'created_at', 'SELECT'),
  'metadados mínimos de auditoria continuam disponíveis'
);

select ok(
  exists (
    select 1 from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'update_quotation'
      and has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
  ),
  'RPC autorizada de edição de cotação está disponível'
);

select ok(
  exists (
    select 1 from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'create_supplier_with_project'
      and has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
  ),
  'RPC atômica de fornecedor está disponível'
);

select ok(
  exists (
    select 1 from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'get_project_financial_summary'
      and has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
  ),
  'RPC de agregação financeira está disponível'
);

select ok(
  exists (
    select 1 from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'get_expense_status_summary'
      and has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
  ),
  'RPC de resumo de despesas está disponível'
);

select ok(
  exists (
    select 1 from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'get_unlinked_project_suppliers'
      and has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
  ),
  'consulta autorizada de fornecedores não vinculados está disponível'
);

select ok(
  exists (
    select 1 from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname = 'has_project_access'
      and pg_get_functiondef(procedure.oid) ilike '%church_id%current_user_church_id%'
  ),
  'acesso a projeto contém barreira explícita de igreja'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'suppliers'
      and policyname = 'supplier_read_for_project_access'
      and qual ilike '%current_user_church_id%'
  ),
  'leitura de fornecedores contém barreira explícita de igreja'
);

select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and cmd = 'ALL'
      and tablename in (
        'projects', 'project_stages', 'categories',
        'suppliers', 'project_suppliers'
      )
  ),
  'policies de escrita não duplicam a avaliação das policies de leitura'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.quotations'::regclass
      and tgname = 'quotation_relations'
      and not tgisinternal
  ),
  'gatilho de relações da cotação está ativo'
);

select ok(
  to_regclass('public.payments_expense_id_idx') is not null,
  'pagamentos possuem índice para a FK de despesa'
);

select ok(
  to_regclass('public.expenses_active_project_competence_idx') is not null,
  'despesas sem data possuem índice de competência para agregação'
);

select ok(
  exists (
    select 1 from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname = 'audit_row_change'
      and pg_get_functiondef(procedure.oid) ilike '%redact_audit_payload%'
  ),
  'auditoria aplica minimização antes de persistir snapshots'
);

select is(
  private.redact_audit_payload(
    '{"email":"pessoa@example.com","proponent_name":"Pessoa","free_recipient":"Pessoa","amount":100}'::jsonb,
    'quotations'
  ),
  '{"amount":100}'::jsonb,
  'auditoria remove contatos e identificadores pessoais de documentos financeiros'
);

select is(
  private.redact_audit_payload(
    '{"name":"Pessoa","email":"pessoa@example.com","role":"visualizador"}'::jsonb,
    'users_profile'
  ),
  '{"role":"visualizador"}'::jsonb,
  'auditoria remove nome e e-mail de perfis'
);

select ok(
  not exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname in ('public', 'private')
      and procedure.prosecdef
      and not exists (
        select 1
        from pg_depend dependency
        where dependency.classid = 'pg_proc'::regclass
          and dependency.objid = procedure.oid
          and dependency.deptype = 'e'
      )
      and not (coalesce(procedure.proconfig, array[]::text[]) @> array['search_path=""'])
  ),
  'todas as funções SECURITY DEFINER da aplicação usam search_path vazio'
);

select * from finish();
rollback;
