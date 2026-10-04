"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { UserRole } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

type ProfileContext = { id: string; churchId: string; role: UserRole };

function readText(formData: FormData, field: string, required = false) {
  const value = formData.get(field);
  const text = typeof value === "string" ? value.trim() : "";
  if (required && !text) throw new Error(`Preencha o campo ${field}.`);
  return text || null;
}

function readDate(formData: FormData, field: string) {
  const value = readText(formData, field);
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Informe uma data válida.");
  return value;
}

function readNonNegativeNumber(formData: FormData, field: string) {
  const value = readText(formData, field);
  if (!value) return null;
  const number = Number(value.replace(",", "."));
  if (!Number.isFinite(number) || number < 0) throw new Error("Informe um valor numérico igual ou maior que zero.");
  return number;
}

function fail(path: string, error: unknown): never {
  const message = error instanceof Error ? error.message : "Não foi possível salvar o registro.";
  redirect(`${path}?erro=${encodeURIComponent(message)}`);
}

async function currentProfile(roles: UserRole[]): Promise<ProfileContext> {
  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (claimsError || !userId) throw new Error("Sua sessão expirou. Entre novamente.");

  const { data: profile, error } = await supabase
    .from("users_profile")
    .select("id, church_id, role, status")
    .eq("id", userId)
    .maybeSingle();
  if (error || !profile || profile.status !== "ativo") throw new Error("Seu perfil não está ativo.");
  if (!roles.includes(profile.role as UserRole)) throw new Error("Você não tem permissão para esta ação.");

  return { id: profile.id, churchId: profile.church_id, role: profile.role as UserRole };
}

function databaseMessage(error: { message?: string } | null) {
  if (!error) return null;
  if (error.message?.includes("duplicate key")) return "Já existe um registro com estes dados.";
  return "Não foi possível salvar o registro. Verifique os dados e tente novamente.";
}

export async function createProject(formData: FormData) {
  try {
    const profile = await currentProfile(["admin"]);
    const supabase = await createClient();
    const name = readText(formData, "nome", true);
    const startDate = readDate(formData, "data_inicio");
    const endDate = readDate(formData, "previsao_termino");
    if (startDate && endDate && endDate < startDate) throw new Error("A previsão de término deve ser posterior ao início.");
    const { error } = await supabase.from("projects").insert({
      church_id: profile.churchId,
      name,
      description: readText(formData, "descricao"),
      project_type: readText(formData, "tipo"),
      start_date: startDate,
      expected_end_date: endDate,
      status: readText(formData, "status", true),
      main_responsible: readText(formData, "responsavel"),
      notes: readText(formData, "observacoes"),
      created_by: profile.id,
      updated_by: profile.id,
    });
    const message = databaseMessage(error);
    if (message) throw new Error(message);
    revalidatePath("/projetos");
  } catch (error) { fail("/projetos", error); }
  redirect("/projetos?mensagem=Projeto+cadastrado+com+sucesso.");
}

export async function createStage(formData: FormData) {
  try {
    const profile = await currentProfile(["admin", "financeiro"]);
    const supabase = await createClient();
    const projectId = readText(formData, "projeto_id", true);
    const plannedBudget = readNonNegativeNumber(formData, "orcamento_planejado") ?? 0;
    const startDate = readDate(formData, "previsao_inicio");
    const endDate = readDate(formData, "previsao_termino");
    if (startDate && endDate && endDate < startDate) throw new Error("A previsão de término deve ser posterior ao início.");
    const sortValue = readText(formData, "ordem");
    const sortOrder = sortValue ? Number(sortValue) : null;
    if (sortOrder !== null && (!Number.isInteger(sortOrder) || sortOrder < 0)) throw new Error("A ordem deve ser um número inteiro positivo.");
    const { data: lastStage } = await supabase.from("project_stages").select("sort_order").eq("project_id", projectId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("project_stages").insert({
      project_id: projectId,
      code: readText(formData, "codigo"),
      name: readText(formData, "nome", true),
      description: readText(formData, "descricao"),
      sort_order: sortOrder ?? (lastStage?.sort_order ?? -1) + 1,
      planned_budget: plannedBudget,
      expected_start_date: startDate,
      expected_end_date: endDate,
      status: readText(formData, "status", true),
      notes: readText(formData, "observacoes"),
      created_by: profile.id,
      updated_by: profile.id,
    });
    const message = databaseMessage(error);
    if (message) throw new Error(message);
    revalidatePath("/etapas");
  } catch (error) { fail("/etapas", error); }
  redirect("/etapas?mensagem=Etapa+cadastrada+com+sucesso.");
}

export async function createCategory(formData: FormData) {
  try {
    const profile = await currentProfile(["admin", "financeiro"]);
    const supabase = await createClient();
    const { error } = await supabase.from("categories").insert({
      project_id: readText(formData, "projeto_id", true),
      name: readText(formData, "nome", true),
      type: readText(formData, "tipo", true),
      description: readText(formData, "descricao"),
      status: readText(formData, "status", true),
      created_by: profile.id,
      updated_by: profile.id,
    });
    const message = databaseMessage(error);
    if (message) throw new Error(message);
    revalidatePath("/categorias");
  } catch (error) { fail("/categorias", error); }
  redirect("/categorias?mensagem=Categoria+cadastrada+com+sucesso.");
}

export async function createSupplier(formData: FormData) {
  try {
    const profile = await currentProfile(["admin", "financeiro"]);
    const supabase = await createClient();
    const categoryId = readText(formData, "categoria_principal_id");
    if (categoryId) {
      const { data: category } = await supabase.from("categories").select("id").eq("id", categoryId).maybeSingle();
      if (!category) throw new Error("A categoria principal selecionada não está disponível.");
    }
    const { error } = await supabase.from("suppliers").insert({
      church_id: profile.churchId,
      name: readText(formData, "nome", true),
      person_type: readText(formData, "tipo_pessoa"),
      document: readText(formData, "documento"),
      main_contact: readText(formData, "contato"),
      phone: readText(formData, "telefone"),
      email: readText(formData, "email"),
      address: readText(formData, "endereco"),
      main_category_id: categoryId,
      status: readText(formData, "status", true),
      notes: readText(formData, "observacoes"),
      created_by: profile.id,
      updated_by: profile.id,
    });
    const message = databaseMessage(error);
    if (message) throw new Error(message);
    revalidatePath("/fornecedores");
  } catch (error) { fail("/fornecedores", error); }
  redirect("/fornecedores?mensagem=Fornecedor+cadastrado+com+sucesso.");
}

export async function createQuotation(formData: FormData) {
  try {
    const profile = await currentProfile(["admin", "financeiro", "aprovador"]);
    const supabase = await createClient();
    const totalValue = readNonNegativeNumber(formData, "valor_total");
    if (!totalValue) throw new Error("Informe um valor total maior que zero.");
    const quotationDate = readDate(formData, "data_cotacao");
    const validUntil = readDate(formData, "validade_proposta");
    if (quotationDate && validUntil && validUntil < quotationDate) throw new Error("A validade da proposta deve ser posterior à data da cotação.");
    const { error } = await supabase.from("quotations").insert({
      project_id: readText(formData, "projeto_id", true),
      stage_id: readText(formData, "etapa_id", true),
      category_id: readText(formData, "categoria_id", true),
      title: readText(formData, "titulo", true),
      description: readText(formData, "descricao"),
      proponent_name: readText(formData, "proponente", true),
      supplier_id: readText(formData, "fornecedor_id"),
      proponent_phone: readText(formData, "telefone"),
      proponent_email: readText(formData, "email"),
      total_value: totalValue,
      execution_deadline: readText(formData, "prazo_execucao"),
      quotation_date: quotationDate,
      proposal_valid_until: validUntil,
      payment_method: readText(formData, "forma_pagamento"),
      payment_terms: readText(formData, "condicoes_pagamento"),
      included_scope: readText(formData, "escopo_incluso"),
      excluded_scope: readText(formData, "escopo_excluso"),
      warranty: readText(formData, "garantia"),
      notes: readText(formData, "observacoes"),
      drive_document_url: readText(formData, "link_drive"),
      status: readText(formData, "status", true),
      created_by: profile.id,
      updated_by: profile.id,
    });
    const message = databaseMessage(error);
    if (message) throw new Error(message);
    revalidatePath("/cotacoes");
    revalidatePath("/comparar-cotacoes");
  } catch (error) { fail("/cotacoes", error); }
  redirect("/cotacoes?mensagem=Cotação+cadastrada+com+sucesso.");
}

export async function approveQuotation(formData: FormData) {
  try {
    await currentProfile(["admin", "financeiro", "aprovador"]);
    const quotationId = readText(formData, "cotacao_id", true);
    const justification = readText(formData, "justificativa", true);
    const supabase = await createClient();
    const { error } = await supabase.rpc("approve_quotation", {
      target_quotation_id: quotationId,
      justification,
    });
    const message = databaseMessage(error);
    if (message) throw new Error(message);
    revalidatePath("/cotacoes");
    revalidatePath("/comparar-cotacoes");
    revalidatePath("/orcamentos");
  } catch (error) { fail("/comparar-cotacoes", error); }
  redirect("/comparar-cotacoes?mensagem=Cotação+aprovada+e+orçamento+gerado+com+sucesso.");
}

export async function resolveBudgetRecipient(formData: FormData) {
  try {
    await currentProfile(["admin", "financeiro"]);
    const budgetId = readText(formData, "orcamento_id", true);
    const supplierId = readText(formData, "fornecedor_id");
    const recipient = readText(formData, "destinatario_livre");
    if (!supplierId && !recipient) throw new Error("Informe um fornecedor ou destinatário livre.");
    const supabase = await createClient();
    const { error } = await supabase.rpc("resolve_budget_recipient", { target_budget_id: budgetId, target_supplier_id: supplierId, recipient });
    const message = databaseMessage(error);
    if (message) throw new Error(message);
    revalidatePath("/orcamentos");
  } catch (error) { fail("/orcamentos", error); }
  redirect("/orcamentos?mensagem=Destinatário+definido.+O+orçamento+está+pronto+para+aprovação.");
}

export async function approveBudgetAsExpense(formData: FormData) {
  try {
    await currentProfile(["admin", "financeiro"]);
    const supabase = await createClient();
    const { error } = await supabase.rpc("approve_budget_as_expense", { target_budget_id: readText(formData, "orcamento_id", true) });
    const message = databaseMessage(error);
    if (message) throw new Error(message);
    revalidatePath("/orcamentos");
    revalidatePath("/despesas");
    revalidatePath("/pagamentos");
  } catch (error) { fail("/orcamentos", error); }
  redirect("/orcamentos?mensagem=Orçamento+aprovado+e+despesa+criada+com+sucesso.");
}

export async function registerPayment(formData: FormData) {
  try {
    await currentProfile(["admin", "financeiro"]);
    const amount = readNonNegativeNumber(formData, "valor");
    if (!amount) throw new Error("Informe um valor de pagamento maior que zero.");
    const paymentDate = readDate(formData, "data_pagamento");
    if (!paymentDate) throw new Error("Informe a data do pagamento.");
    const supabase = await createClient();
    const { error } = await supabase.rpc("register_payment", {
      target_expense_id: readText(formData, "despesa_id", true), target_amount: amount, target_payment_date: paymentDate,
      target_payment_method: readText(formData, "forma_pagamento"), receipt_url: readText(formData, "link_comprovante"), payment_notes: readText(formData, "observacoes"),
    });
    const message = databaseMessage(error);
    if (message) throw new Error(message);
    revalidatePath("/despesas");
    revalidatePath("/pagamentos");
  } catch (error) { fail("/pagamentos", error); }
  redirect("/pagamentos?mensagem=Pagamento+registrado+com+sucesso.");
}

export async function createIncomeEntry(formData: FormData) {
  try {
    const profile = await currentProfile(["admin", "financeiro"]);
    const amount = readNonNegativeNumber(formData, "valor");
    if (!amount) throw new Error("Informe um valor recebido maior que zero.");
    const receivedDate = readDate(formData, "data_recebimento");
    if (!receivedDate) throw new Error("Informe a data do recebimento.");
    const supabase = await createClient();
    const { error } = await supabase.from("income_entries").insert({
      project_id: readText(formData, "projeto_id", true),
      category_id: readText(formData, "categoria_id"),
      received_date: receivedDate,
      amount,
      origin: readText(formData, "origem", true),
      description: readText(formData, "descricao"),
      payment_method: readText(formData, "forma_recebimento"),
      drive_receipt_url: readText(formData, "link_comprovante"),
      status: "recebida",
      registered_by: profile.id,
      notes: readText(formData, "observacoes"),
    });
    const message = databaseMessage(error);
    if (message) throw new Error(message);
    revalidatePath("/entradas");
    revalidatePath("/dashboard");
    revalidatePath("/relatorio-mensal");
  } catch (error) { fail("/entradas", error); }
  redirect("/entradas?mensagem=Entrada+registrada+com+sucesso.");
}

export async function manageUserProfile(formData: FormData) {
  try {
    await currentProfile(["admin"]);
    const supabase = await createClient();
    const { error } = await supabase.rpc("manage_user_profile", {
      target_user_id: readText(formData, "usuario_id", true),
      target_role: readText(formData, "funcao", true),
      target_status: readText(formData, "status", true),
    });
    const message = databaseMessage(error);
    if (message) throw new Error(message);
    revalidatePath("/usuarios");
    revalidatePath("/historico");
  } catch (error) { fail("/usuarios", error); }
  redirect("/usuarios?mensagem=Perfil+atualizado+com+sucesso.");
}
