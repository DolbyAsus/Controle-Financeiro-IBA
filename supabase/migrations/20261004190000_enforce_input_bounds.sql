-- Limites no banco complementam os limites da interface e impedem payloads
-- excessivos enviados diretamente à Data API.

alter table public.users_profile
  add constraint users_profile_name_length check (char_length(name) <= 160),
  add constraint users_profile_email_length check (char_length(email) <= 160),
  add constraint users_profile_phone_length check (phone is null or char_length(phone) <= 30),
  add constraint users_profile_church_function_length check (church_function is null or char_length(church_function) <= 120);

alter table public.projects
  add constraint projects_name_length check (char_length(name) <= 120),
  add constraint projects_description_length check (description is null or char_length(description) <= 1000),
  add constraint projects_type_length check (project_type is null or char_length(project_type) <= 80),
  add constraint projects_responsible_length check (main_responsible is null or char_length(main_responsible) <= 120),
  add constraint projects_notes_length check (notes is null or char_length(notes) <= 2000);

alter table public.project_stages
  add constraint stages_code_length check (code is null or char_length(code) <= 30),
  add constraint stages_name_length check (char_length(name) <= 120),
  add constraint stages_description_length check (description is null or char_length(description) <= 1000),
  add constraint stages_notes_length check (notes is null or char_length(notes) <= 2000);

alter table public.categories
  add constraint categories_name_length check (char_length(name) <= 120),
  add constraint categories_description_length check (description is null or char_length(description) <= 1000);

alter table public.suppliers
  add constraint suppliers_name_length check (char_length(name) <= 160),
  add constraint suppliers_document_length check (document is null or char_length(document) <= 40),
  add constraint suppliers_contact_length check (main_contact is null or char_length(main_contact) <= 120),
  add constraint suppliers_phone_length check (phone is null or char_length(phone) <= 30),
  add constraint suppliers_email_length check (email is null or char_length(email) <= 160),
  add constraint suppliers_address_length check (address is null or char_length(address) <= 500),
  add constraint suppliers_notes_length check (notes is null or char_length(notes) <= 2000);

alter table public.quotations
  add constraint quotations_title_length check (char_length(title) <= 160),
  add constraint quotations_description_length check (description is null or char_length(description) <= 2000),
  add constraint quotations_proponent_length check (char_length(proponent_name) <= 160),
  add constraint quotations_phone_length check (proponent_phone is null or char_length(proponent_phone) <= 30),
  add constraint quotations_email_length check (proponent_email is null or char_length(proponent_email) <= 160),
  add constraint quotations_deadline_length check (execution_deadline is null or char_length(execution_deadline) <= 160),
  add constraint quotations_payment_method_length check (payment_method is null or char_length(payment_method) <= 160),
  add constraint quotations_payment_terms_length check (payment_terms is null or char_length(payment_terms) <= 500),
  add constraint quotations_scope_length check ((included_scope is null or char_length(included_scope) <= 2000) and (excluded_scope is null or char_length(excluded_scope) <= 2000)),
  add constraint quotations_warranty_length check (warranty is null or char_length(warranty) <= 500),
  add constraint quotations_notes_length check (notes is null or char_length(notes) <= 2000),
  add constraint quotations_drive_url_length check (drive_document_url is null or char_length(drive_document_url) <= 1000);

alter table public.budgets
  add constraint budgets_title_length check (char_length(title) <= 160),
  add constraint budgets_description_length check (description is null or char_length(description) <= 2000),
  add constraint budgets_recipient_length check (free_recipient is null or char_length(free_recipient) <= 160),
  add constraint budgets_payment_method_length check (payment_method is null or char_length(payment_method) <= 160),
  add constraint budgets_payment_terms_length check (payment_terms is null or char_length(payment_terms) <= 500),
  add constraint budgets_drive_url_length check (drive_document_url is null or char_length(drive_document_url) <= 1000),
  add constraint budgets_justification_length check (char_length(choice_justification) <= 2000);

alter table public.expenses
  add constraint expenses_description_length check (char_length(description) <= 2000),
  add constraint expenses_recipient_length check (free_recipient is null or char_length(free_recipient) <= 160),
  add constraint expenses_drive_url_length check (drive_document_url is null or char_length(drive_document_url) <= 1000),
  add constraint expenses_notes_length check (notes is null or char_length(notes) <= 2000);

alter table public.payments
  add constraint payments_method_length check (payment_method is null or char_length(payment_method) <= 160),
  add constraint payments_drive_url_length check (drive_receipt_url is null or char_length(drive_receipt_url) <= 1000),
  add constraint payments_notes_length check (notes is null or char_length(notes) <= 2000);

alter table public.income_entries
  add constraint income_origin_length check (char_length(origin) <= 160),
  add constraint income_description_length check (description is null or char_length(description) <= 2000),
  add constraint income_payment_method_length check (payment_method is null or char_length(payment_method) <= 160),
  add constraint income_drive_url_length check (drive_receipt_url is null or char_length(drive_receipt_url) <= 1000),
  add constraint income_notes_length check (notes is null or char_length(notes) <= 2000);

-- Cotações e entradas só podem iniciar em estados operacionais válidos.
drop policy if exists quotation_insert on public.quotations;
create policy quotation_insert on public.quotations for insert to authenticated
  with check (private.can_manage_quotation() and private.has_project_access(project_id) and status in ('recebida', 'em_analise'));

drop policy if exists income_insert on public.income_entries;
create policy income_insert on public.income_entries for insert to authenticated
  with check (private.can_manage_finance() and private.has_project_access(project_id) and status = 'recebida');
