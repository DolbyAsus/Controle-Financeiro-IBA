-- Preflight somente leitura para 20261007194900_harden_tenant_finance_and_audit.sql.
-- Execute no SQL Editor do projeto hospedado antes da janela de implantação.
-- Consultas marcadas com "esperado: 0" precisam ser investigadas antes do push.

begin transaction read only;

-- Esperado: 0. Associação de usuário atravessando igrejas.
select
  membership.id,
  membership.project_id,
  membership.user_id,
  project.church_id as project_church_id,
  profile.church_id as user_church_id
from public.project_memberships membership
join public.projects project on project.id = membership.project_id
join public.users_profile profile on profile.id = membership.user_id
where project.church_id is distinct from profile.church_id;

-- Esperado: 0. Associação de fornecedor atravessando igrejas.
select
  relation.id,
  relation.project_id,
  relation.supplier_id,
  project.church_id as project_church_id,
  supplier.church_id as supplier_church_id
from public.project_suppliers relation
join public.projects project on project.id = relation.project_id
join public.suppliers supplier on supplier.id = relation.supplier_id
where project.church_id is distinct from supplier.church_id;

-- Esperado: 0. Cotações editáveis que a nova RPC recusaria por relações
-- inativas, ausentes ou pertencentes a outro projeto.
select
  quotation.id,
  quotation.project_id,
  quotation.stage_id,
  quotation.category_id,
  quotation.supplier_id
from public.quotations quotation
where quotation.status = 'em_analise'::public.quotation_status
  and (
    not exists (
      select 1
      from public.project_stages stage
      where stage.id = quotation.stage_id
        and stage.project_id = quotation.project_id
        and stage.status = 'ativo'::public.active_status
    )
    or not exists (
      select 1
      from public.categories category
      where category.id = quotation.category_id
        and category.project_id = quotation.project_id
        and category.status = 'ativo'::public.active_status
        and category.type in (
          'saida'::public.category_type,
          'ambos'::public.category_type
        )
    )
    or (
      quotation.supplier_id is not null
      and not exists (
        select 1
        from public.project_suppliers relation
        join public.suppliers supplier on supplier.id = relation.supplier_id
        where relation.project_id = quotation.project_id
          and relation.supplier_id = quotation.supplier_id
          and relation.status = 'ativo'::public.active_status
          and supplier.status = 'ativo'
      )
    )
  );

-- Esperado: 0. Toda igreja precisa preservar ao menos um administrador
-- global ativo para evitar bloqueio administrativo.
select church.id, church.name
from public.churches church
where not exists (
  select 1
  from public.users_profile profile
  where profile.church_id = church.id
    and profile.role = 'admin'::public.user_role
    and profile.status = 'ativo'::public.active_status
);

-- Informativo. Fornecedores ativos ligados a mais de um projeto exigem
-- decisão coordenada, pois a edição do cadastro mestre afeta todos os vínculos.
select
  supplier.id,
  supplier.name,
  count(*) as active_project_count
from public.suppliers supplier
join public.project_suppliers relation on relation.supplier_id = supplier.id
where relation.status = 'ativo'::public.active_status
group by supplier.id, supplier.name
having count(*) > 1
order by active_project_count desc, supplier.name;

-- Informativo. Snapshots antigos podem conter campos pessoais. A migração
-- bloqueia sua leitura pela Data API e redige novos eventos, mas não destrói
-- o histórico existente automaticamente.
select
  count(*) filter (
    where coalesce(log.old_value, '{}'::jsonb) ?| array[
      'document', 'phone', 'email', 'address', 'main_contact',
      'proponent_name', 'proponent_phone', 'proponent_email',
      'free_recipient', 'main_responsible', 'origin',
      'drive_document_url', 'drive_receipt_url', 'notes', 'description',
      'included_scope', 'excluded_scope', 'payment_terms', 'church_function'
    ]
  ) as old_snapshots_with_sensitive_fields,
  count(*) filter (
    where coalesce(log.new_value, '{}'::jsonb) ?| array[
      'document', 'phone', 'email', 'address', 'main_contact',
      'proponent_name', 'proponent_phone', 'proponent_email',
      'free_recipient', 'main_responsible', 'origin',
      'drive_document_url', 'drive_receipt_url', 'notes', 'description',
      'included_scope', 'excluded_scope', 'payment_terms', 'church_function'
    ]
  ) as new_snapshots_with_sensitive_fields
from public.audit_logs log;

rollback;
