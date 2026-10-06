"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { UserRole } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

type ProfileContext = { id: string; churchId: string; role: UserRole };

const fieldLimits: Record<string, number> = {
  nome: 160, tipo: 80, descricao: 2000, responsavel: 120, observacoes: 2000,
  codigo: 30, titulo: 160, proponente: 160, telefone: 30, email: 160,
  prazo_execucao: 160, forma_pagamento: 160, forma_recebimento: 160,
  condicoes_pagamento: 500, escopo_incluso: 2000, escopo_excluso: 2000,
  garantia: 500, link_drive: 1000, link_comprovante: 1000, documento: 40,
  contato: 120, endereco: 500, origem: 160, destinatario_livre: 160,
  justificativa: 2000, funcao: 20, status: 40, tipo_pessoa: 30,
  projeto_id: 36, etapa_id: 36, categoria_id: 36, fornecedor_id: 36, fornecedor_existente_id: 36,
  orcamento_id: 36, cotacao_id: 36, despesa_id: 36, usuario_id: 36,
  categoria_principal_id: 36, ordem: 6, valor: 16, valor_total: 16,
  orcamento_planejado: 16, data_inicio: 10, data_pagamento: 10,
  data_recebimento: 10, data_prevista: 10, data_cotacao: 10, validade_proposta: 10,
  previsao_inicio: 10, previsao_termino: 10,
  retorno: 200,
};

function readText(formData: FormData, field: string, required = false) {
  const value = formData.get(field);
  const text = typeof value === "string" ? value.trim() : "";
  if (required && !text) throw new Error(`Preencha o campo ${field}.`);
  const maxLength = fieldLimits[field] ?? 2000;
  if (text.length > maxLength) throw new Error(`O campo ${field} aceita no máximo ${maxLength} caracteres.`);
  return text || null;
}

function readGoogleDriveUrl(formData: FormData, field: string) {
  const value = readText(formData, field);
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !["drive.google.com", "docs.google.com"].includes(url.hostname)) {
      throw new Error();
    }
    return url.toString();
  } catch {
    throw new Error("Use apenas links HTTPS do Google Drive.");
  }
}

function readDate(formData: FormData, field: string) {
  const value = readText(formData, field);
  const parsedDate = value ? new Date(`${value}T12:00:00Z`) : null;
  if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsedDate!.getTime()) || parsedDate!.toISOString().slice(0, 10) !== value)) throw new Error("Informe uma data válida.");
  return value;
}

function readNonNegativeNumber(formData: FormData, field: string) {
  const value = readText(formData, field);
  if (!value) return null;
  const number = Number(value.replace(",", "."));
  if (!Number.isFinite(number) || number < 0 || number > 999_999_999_999.99) throw new Error("Informe um valor numérico entre zero e 999.999.999.999,99.");
  return number;
}

function fail(path: string, error: unknown): never {
  const message = error instanceof Error ? error.message : "Não foi possível salvar o registro.";
  redirect(`${path}?erro=${encodeURIComponent(message)}`);
}

function returnPath(formData: FormData, fallback: string) {
  const value = formData.get("retorno");
  if (typeof value !== "string" || value.length > fieldLimits.retorno) return fallback;

  return /^\/projetos\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\/(?:etapas|categorias|fornecedores|cotacoes|orcamentos|despesas|pagamentos|entradas)$/i.test(value)
    ? value
    : fallback;
}

function revalidateProjectContext(path: string) {
  revalidatePath(path);
  const match = path.match(/^\/projetos\/([0-9a-f-]{36})\//i);
  if (match) revalidatePath(`/projetos/${match[1]}/dashboard`);
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
  if (error.message?.includes("Use apenas links HTTPS do Google Drive")) return "Use apenas links HTTPS do Google Drive.";
  const safeDatabaseMessages = [
    "Informe um fornecedor ou destinatário livre",
    "Escolha somente um fornecedor ou destinatário livre",
    "Fornecedor inválido",
    "Orçamento não encontrado",
    "O orçamento não possui fornecedor pendente",
    "Despesa não encontrada",
    "Não é possível registrar pagamento para esta despesa",
    "O pagamento não pode ser maior que o saldo da despesa",
    "Projeto não encontrado",
    "A descrição da despesa é obrigatória",
    "Informe um valor de despesa maior que zero",
    "A etapa precisa estar ativa e pertencer ao projeto informado",
    "A categoria precisa estar ativa, pertencer ao projeto e aceitar saídas",
    "Fornecedor inválido ou inativo",
  ];
  if (safeDatabaseMessages.some((message) => error.message?.includes(message))) return error.message;
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
  const returnTo = returnPath(formData, "/etapas");
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
    revalidateProjectContext(returnTo);
  } catch (error) { fail(returnTo, error); }
  redirect(`${returnTo}?mensagem=Etapa+cadastrada+com+sucesso.`);
}

export async function createCategory(formData: FormData) {
  const returnTo = returnPath(formData, "/categorias");
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
    revalidateProjectContext(returnTo);
  } catch (error) { fail(returnTo, error); }
  redirect(`${returnTo}?mensagem=Categoria+cadastrada+com+sucesso.`);
}

export async function createSupplier(formData: FormData) {
  const returnTo = returnPath(formData, "/fornecedores");
  let projectId: string | null = null;
  try {
    const profile = await currentProfile(["admin"]);
    const supabase = await createClient();
    projectId = readText(formData, "projeto_id");
    const categoryId = readText(formData, "categoria_principal_id");
    if (categoryId) {
      const { data: category } = await supabase.from("categories").select("id").eq("id", categoryId).maybeSingle();
      if (!category) throw new Error("A categoria principal selecionada não está disponível.");
    }
    const { data: supplier, error } = await supabase.from("suppliers").insert({
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
    }).select("id").single();
    const message = databaseMessage(error);
    if (message) throw new Error(message);
    if (!supplier) throw new Error("Não foi possível criar o fornecedor.");
    if (projectId) {
      const { error: linkError } = await supabase.from("project_suppliers").insert({
        project_id: projectId,
        supplier_id: supplier.id,
        status: "ativo",
        created_by: profile.id,
        updated_by: profile.id,
      });
      const linkMessage = databaseMessage(linkError);
      if (linkMessage) {
        await supabase.from("suppliers").delete().eq("id", supplier.id);
        throw new Error(linkMessage);
      }
    }
    revalidatePath("/fornecedores");
    revalidateProjectContext(returnTo);
  } catch (error) { fail(returnTo, error); }
  redirect(`${returnTo}?mensagem=${projectId ? "Fornecedor+cadastrado+e+vinculado+ao+projeto." : "Fornecedor+cadastrado+com+sucesso."}`);
}

export async function linkSupplierToProject(formData: FormData) {
  const returnTo = returnPath(formData, "/fornecedores");
  try {
    const profile = await currentProfile(["admin"]);
    const supabase = await createClient();
    const { error } = await supabase.from("project_suppliers").upsert({
      project_id: readText(formData, "projeto_id", true),
      supplier_id: readText(formData, "fornecedor_existente_id", true),
      status: "ativo",
      updated_by: profile.id,
    }, { onConflict: "project_id,supplier_id" });
    const message = databaseMessage(error);
    if (message) throw new Error(message);
    revalidatePath("/fornecedores");
    revalidateProjectContext(returnTo);
  } catch (error) { fail(returnTo, error); }
  redirect(`${returnTo}?mensagem=Fornecedor+vinculado+ao+projeto.`);
}

export async function createQuotation(formData: FormData) {
  const returnTo = returnPath(formData, "/cotacoes");
  try {
    await currentProfile(["admin", "financeiro", "aprovador"]);
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
      drive_document_url: readGoogleDriveUrl(formData, "link_drive"),
      status: readText(formData, "status", true),
    });
    const message = databaseMessage(error);
    if (message) throw new Error(message);
    revalidatePath("/cotacoes");
    revalidatePath("/comparar-cotacoes");
    revalidateProjectContext(returnTo);
  } catch (error) { fail(returnTo, error); }
  redirect(`${returnTo}?mensagem=Cotação+cadastrada+com+sucesso.`);
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
  const returnTo = returnPath(formData, "/orcamentos");
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
    revalidateProjectContext(returnTo);
  } catch (error) { fail(returnTo, error); }
  redirect(`${returnTo}?mensagem=Destinatário+definido.+O+orçamento+está+pronto+para+aprovação.`);
}

export async function approveBudgetAsExpense(formData: FormData) {
  const returnTo = returnPath(formData, "/orcamentos");
  try {
    await currentProfile(["admin", "financeiro"]);
    const supabase = await createClient();
    const { error } = await supabase.rpc("approve_budget_as_expense", { target_budget_id: readText(formData, "orcamento_id", true) });
    const message = databaseMessage(error);
    if (message) throw new Error(message);
    revalidatePath("/orcamentos");
    revalidatePath("/despesas");
    revalidatePath("/pagamentos");
    revalidatePath("/dashboard");
    revalidatePath("/relatorio-mensal");
    revalidatePath("/historico");
    revalidateProjectContext(returnTo);
  } catch (error) { fail(returnTo, error); }
  redirect(`${returnTo}?mensagem=Orçamento+aprovado+e+despesa+criada+com+sucesso.`);
}

export async function createManualExpense(formData: FormData) {
  const returnTo = returnPath(formData, "/despesas");
  try {
    await currentProfile(["admin", "financeiro"]);
    const supplierId = readText(formData, "fornecedor_id");
    const recipient = readText(formData, "destinatario_livre");
    if (!supplierId && !recipient) throw new Error("Informe um fornecedor ou destinatário livre.");
    if (supplierId && recipient) throw new Error("Escolha somente um fornecedor ou destinatário livre.");

    const value = readNonNegativeNumber(formData, "valor");
    if (!value) throw new Error("Informe um valor de despesa maior que zero.");

    const supabase = await createClient();
    const { error } = await supabase.rpc("create_manual_expense", {
      target_project_id: readText(formData, "projeto_id", true),
      target_stage_id: readText(formData, "etapa_id", true),
      target_category_id: readText(formData, "categoria_id", true),
      target_supplier_id: supplierId,
      recipient,
      target_description: readText(formData, "descricao", true),
      target_value: value,
      target_expected_date: readDate(formData, "data_prevista"),
      document_url: readGoogleDriveUrl(formData, "link_drive"),
      expense_notes: readText(formData, "observacoes"),
    });
    const message = databaseMessage(error);
    if (message) throw new Error(message);
    revalidatePath("/despesas");
    revalidatePath("/pagamentos");
    revalidatePath("/dashboard");
    revalidatePath("/relatorio-mensal");
    revalidatePath("/historico");
    revalidateProjectContext(returnTo);
  } catch (error) { fail(returnTo, error); }
  redirect(`${returnTo}?mensagem=Despesa+manual+cadastrada+com+sucesso.`);
}

export async function registerPayment(formData: FormData) {
  const returnTo = returnPath(formData, "/pagamentos");
  try {
    await currentProfile(["admin", "financeiro"]);
    const amount = readNonNegativeNumber(formData, "valor");
    if (!amount) throw new Error("Informe um valor de pagamento maior que zero.");
    const paymentDate = readDate(formData, "data_pagamento");
    if (!paymentDate) throw new Error("Informe a data do pagamento.");
    const supabase = await createClient();
    const { error } = await supabase.rpc("register_payment", {
      target_expense_id: readText(formData, "despesa_id", true), target_amount: amount, target_payment_date: paymentDate,
      target_payment_method: readText(formData, "forma_pagamento"), receipt_url: readGoogleDriveUrl(formData, "link_comprovante"), payment_notes: readText(formData, "observacoes"),
    });
    const message = databaseMessage(error);
    if (message) throw new Error(message);
    revalidatePath("/despesas");
    revalidatePath("/pagamentos");
    revalidatePath("/dashboard");
    revalidatePath("/relatorio-mensal");
    revalidatePath("/historico");
    revalidateProjectContext(returnTo);
  } catch (error) { fail(returnTo, error); }
  redirect(`${returnTo}?mensagem=Pagamento+registrado+com+sucesso.`);
}

export async function createIncomeEntry(formData: FormData) {
  const returnTo = returnPath(formData, "/entradas");
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
      drive_receipt_url: readGoogleDriveUrl(formData, "link_comprovante"),
      status: "recebida",
      registered_by: profile.id,
      notes: readText(formData, "observacoes"),
    });
    const message = databaseMessage(error);
    if (message) throw new Error(message);
    revalidatePath("/entradas");
    revalidatePath("/dashboard");
    revalidatePath("/relatorio-mensal");
    revalidateProjectContext(returnTo);
  } catch (error) { fail(returnTo, error); }
  redirect(`${returnTo}?mensagem=Entrada+registrada+com+sucesso.`);
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

async function ensureUpdated(
  request: PromiseLike<{ data: { id: string }[] | null; error: { message?: string } | null }>,
) {
  const { data, error } = await request;
  const message = databaseMessage(error);
  if (message) throw new Error(message);
  if (!data?.length) throw new Error("Registro não encontrado ou sem permissão para alterá-lo.");
}

export async function updateProject(formData: FormData) {
  try {
    const profile = await currentProfile(["admin"]);
    const startDate = readDate(formData, "data_inicio");
    const endDate = readDate(formData, "previsao_termino");
    if (startDate && endDate && endDate < startDate) throw new Error("A previsão de término deve ser posterior ao início.");
    const supabase = await createClient();
    await ensureUpdated(supabase.from("projects").update({
      name: readText(formData, "nome", true), project_type: readText(formData, "tipo"), description: readText(formData, "descricao"),
      start_date: startDate, expected_end_date: endDate, main_responsible: readText(formData, "responsavel"),
      status: readText(formData, "status", true), notes: readText(formData, "observacoes"), updated_by: profile.id,
    }).eq("id", readText(formData, "projeto_id", true)).select("id"));
    revalidatePath("/projetos"); revalidatePath("/dashboard"); revalidatePath("/relatorio-mensal"); revalidatePath("/historico");
  } catch (error) { fail("/projetos", error); }
  redirect("/projetos?mensagem=Projeto+atualizado+com+sucesso.");
}

export async function updateStage(formData: FormData) {
  const returnTo = returnPath(formData, "/etapas");
  try {
    const profile = await currentProfile(["admin", "financeiro"]);
    const startDate = readDate(formData, "previsao_inicio"); const endDate = readDate(formData, "previsao_termino");
    if (startDate && endDate && endDate < startDate) throw new Error("A previsão de término deve ser posterior ao início.");
    const order = Number(readText(formData, "ordem", true));
    if (!Number.isInteger(order) || order < 0) throw new Error("A ordem deve ser um número inteiro positivo.");
    const plannedBudget = readNonNegativeNumber(formData, "orcamento_planejado");
    if (plannedBudget === null) throw new Error("Informe o orçamento planejado.");
    const supabase = await createClient();
    await ensureUpdated(supabase.from("project_stages").update({
      name: readText(formData, "nome", true), code: readText(formData, "codigo"), description: readText(formData, "descricao"),
      sort_order: order, planned_budget: plannedBudget, expected_start_date: startDate, expected_end_date: endDate,
      status: readText(formData, "status", true), notes: readText(formData, "observacoes"), updated_by: profile.id,
    }).eq("id", readText(formData, "etapa_id", true)).select("id"));
    revalidatePath("/etapas"); revalidatePath("/dashboard"); revalidatePath("/relatorio-mensal"); revalidatePath("/historico"); revalidateProjectContext(returnTo);
  } catch (error) { fail(returnTo, error); }
  redirect(`${returnTo}?mensagem=Etapa+atualizada+com+sucesso.`);
}

export async function updateCategory(formData: FormData) {
  const returnTo = returnPath(formData, "/categorias");
  try {
    const profile = await currentProfile(["admin", "financeiro"]); const supabase = await createClient();
    await ensureUpdated(supabase.from("categories").update({
      name: readText(formData, "nome", true), type: readText(formData, "tipo", true), description: readText(formData, "descricao"),
      status: readText(formData, "status", true), updated_by: profile.id,
    }).eq("id", readText(formData, "categoria_id", true)).select("id"));
    revalidatePath("/categorias"); revalidatePath("/historico"); revalidateProjectContext(returnTo);
  } catch (error) { fail(returnTo, error); }
  redirect(`${returnTo}?mensagem=Categoria+atualizada+com+sucesso.`);
}

export async function updateSupplier(formData: FormData) {
  const returnTo = returnPath(formData, "/fornecedores");
  try {
    const profile = await currentProfile(["admin"]); const supabase = await createClient();
    await ensureUpdated(supabase.from("suppliers").update({
      name: readText(formData, "nome", true), main_contact: readText(formData, "contato"), phone: readText(formData, "telefone"),
      email: readText(formData, "email"), status: readText(formData, "status", true), notes: readText(formData, "observacoes"), updated_by: profile.id,
    }).eq("id", readText(formData, "fornecedor_id", true)).select("id"));
    revalidatePath("/fornecedores"); revalidatePath("/historico"); revalidateProjectContext(returnTo);
  } catch (error) { fail(returnTo, error); }
  redirect(`${returnTo}?mensagem=Fornecedor+atualizado+com+sucesso.`);
}

export async function finishQuotation(formData: FormData) {
  const returnTo = returnPath(formData, "/cotacoes");
  try {
    await currentProfile(["admin", "financeiro", "aprovador"]);
    const quotationId = readText(formData, "cotacao_id", true);
    const status = readText(formData, "status", true)!;
    const justification = readText(formData, "justificativa", true);
    if (!["nao_selecionada", "cancelada"].includes(status)) throw new Error("Status de cotação inválido.");
    const supabase = await createClient();
    const { error } = await supabase.rpc("finish_quotation", { target_quotation_id: quotationId, target_status: status, justification });
    const message = databaseMessage(error); if (message) throw new Error(message);
    revalidatePath("/cotacoes"); revalidatePath("/comparar-cotacoes"); revalidatePath("/historico"); revalidateProjectContext(returnTo);
  } catch (error) { fail(returnTo, error); }
  redirect(`${returnTo}?mensagem=Cotação+encerrada+e+histórico+registrado.`);
}

export async function cancelExpense(formData: FormData) {
  const returnTo = returnPath(formData, "/despesas");
  try {
    await currentProfile(["admin", "financeiro"]); const supabase = await createClient();
    const { error } = await supabase.rpc("cancel_expense", {
      target_expense_id: readText(formData, "despesa_id", true), justification: readText(formData, "justificativa", true),
    });
    const message = databaseMessage(error); if (message) throw new Error(message);
    revalidatePath("/despesas"); revalidatePath("/dashboard"); revalidatePath("/relatorio-mensal"); revalidatePath("/historico"); revalidateProjectContext(returnTo);
  } catch (error) { fail(returnTo, error); }
  redirect(`${returnTo}?mensagem=Despesa+cancelada+e+histórico+registrado.`);
}
