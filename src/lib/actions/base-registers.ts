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
