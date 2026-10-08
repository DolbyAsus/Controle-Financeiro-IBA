import { Tags } from "lucide-react";

import { createCategory } from "@/lib/actions/base-registers";
import { CategoryEditDialog } from "@/components/categories/category-edit-dialog";
import { RegisterPageShell } from "@/components/modules/register-page-shell";
import { Pagination, databasePage, paginationRange } from "@/components/modules/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getProjectWorkspaceAccess, getWorkspaceProfile } from "@/lib/project-access";

export const dynamic = "force-dynamic";
const typeLabel: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ambos: "Entrada e saída",
};

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ mensagem?: string; erro?: string; pagina?: string; projeto?: string }>;
}) {
  const query = await searchParams;
  const projectId = query.projeto;
  const returnTo = projectId ? `/projetos/${projectId}/categorias` : undefined;
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const profile = supabase ? await getWorkspaceProfile() : null;
  const access = projectId && supabase ? await getProjectWorkspaceAccess(projectId) : null;
  const canManage = projectId
    ? access?.projectRole === "admin" || access?.projectRole === "financeiro"
    : profile?.role === "admin";
  const pageRange = paginationRange(query.pagina);
  const projects = supabase
    ? ((await (projectId
        ? supabase.from("projects").select("id, name").eq("id", projectId)
        : supabase.from("projects").select("id, name").order("name")))
        .data ?? [])
    : [];
  const categoriesResult = supabase
    ? await (projectId
          ? supabase
              .from("categories")
              .select("id, name, type, description, status, projects(name)", { count: "exact" })
              .eq("project_id", projectId)
              .order("name")
          : supabase
          .from("categories")
          .select("id, name, type, description, status, projects(name)", { count: "exact" })
          .order("name"))
        .range(pageRange.from, pageRange.to)
    : null;
  const categories = categoriesResult?.data ?? [];
  const categoryPage = databasePage(categories, categoriesResult?.count ?? 0, pageRange.page);
  const visibleCategoryIds = categoryPage.items.map((category) => category.id);
  const [linkedQuotations, linkedBudgets, linkedExpenses, linkedIncomes] = supabase && visibleCategoryIds.length > 0
    ? await Promise.all([
        supabase.from("quotations").select("id, title, total_value, status, category_id, projects(name)").in("category_id", visibleCategoryIds),
        supabase.from("budgets").select("id, title, budget_value, status, category_id, projects(name)").in("category_id", visibleCategoryIds),
        supabase.from("expenses").select("id, description, approved_value, status, category_id, projects(name)").in("category_id", visibleCategoryIds),
        supabase.from("income_entries").select("id, origin, amount, status, category_id, projects(name)").in("category_id", visibleCategoryIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const quotations = linkedQuotations.data ?? [];
  const budgets = linkedBudgets.data ?? [];
  const expenses = linkedExpenses.data ?? [];
  const incomes = linkedIncomes.data ?? [];
  return (
    <RegisterPageShell
      title="Categorias"
      description="Classifique entradas, saídas e lançamentos de cada projeto."
      icon={Tags}
      createLabel="Criar categoria"
      formTitle="Nova categoria"
      message={query.mensagem}
      error={query.erro}
      form={canManage ? (
        <form action={createCategory} className="grid gap-4 md:grid-cols-2">
          {projectId ? <><input name="projeto_id" type="hidden" value={projectId} /><input name="retorno" type="hidden" value={returnTo} /></> : <label className="grid gap-1.5 text-sm font-medium">
            Projeto *
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="projeto_id"
              required
              defaultValue=""
            >
              <option disabled value="">
                Selecione
              </option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>}
          <label className="grid gap-1.5 text-sm font-medium">
            Nome *
            <Input
              className="w-full"
              name="nome"
              required
              maxLength={120}
              placeholder="Ex.: Material de construção"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Uso *
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="tipo"
              defaultValue="saida"
            >
              <option value="saida">Saída</option>
              <option value="entrada">Entrada</option>
              <option value="ambos">Entrada e saída</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Status *
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="status"
              defaultValue="ativo"
            >
              <option value="ativo">Ativa</option>
              <option value="inativo">Inativa</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Descrição
            <textarea
              className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm"
              name="descricao"
              maxLength={1000}
            />
          </label>
          <div className="md:col-span-2">
            <Button type="submit" disabled={projects.length === 0}>
              Salvar categoria
            </Button>
            {projects.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Cadastre um projeto antes de incluir categorias.
              </p>
            ) : null}
          </div>
        </form>
      ) : null}
    >
      <Card>
        <CardHeader>
          <CardTitle>Categorias cadastradas</CardTitle>
          <CardDescription>
            {categoryPage.count} categorias disponíveis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Nenhuma categoria cadastrada ainda.
            </p>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {categoryPage.items.map((category) => (
                  <article key={category.id} className="rounded-lg border p-3">
                    <div className="flex justify-between gap-2">
                      <strong>{category.name}</strong>
                      <Badge variant="secondary">
                        {typeLabel[category.type]}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {category.projects?.[0]?.name || "Projeto"} ·{" "}
                      {category.status}
                    </p>
                    {canManage ? <div className="mt-3"><CategoryEditDialog category={category} quotations={quotations.filter((item) => item.category_id === category.id).map((item) => ({ id: item.id, title: item.title, value: item.total_value, status: item.status, projectName: item.projects?.[0]?.name || "Projeto" }))} budgets={budgets.filter((item) => item.category_id === category.id).map((item) => ({ id: item.id, title: item.title, value: item.budget_value, status: item.status, projectName: item.projects?.[0]?.name || "Projeto" }))} expenses={expenses.filter((item) => item.category_id === category.id).map((item) => ({ id: item.id, title: item.description, value: item.approved_value, status: item.status, projectName: item.projects?.[0]?.name || "Projeto" }))} incomes={incomes.filter((item) => item.category_id === category.id).map((item) => ({ id: item.id, title: item.origin, value: item.amount, status: item.status, projectName: item.projects?.[0]?.name || "Projeto" }))} returnTo={returnTo} /></div> : null}
                  </article>
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Uso</TableHead>
                      <TableHead>Status</TableHead>
                      {canManage ? <TableHead className="text-right">Ações</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryPage.items.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">
                          {category.name}
                        </TableCell>
                        <TableCell>
                          {category.projects?.[0]?.name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {typeLabel[category.type]}
                          </Badge>
                        </TableCell>
                        <TableCell>{category.status}</TableCell>
                        {canManage ? <TableCell className="text-right"><CategoryEditDialog category={category} quotations={quotations.filter((item) => item.category_id === category.id).map((item) => ({ id: item.id, title: item.title, value: item.total_value, status: item.status, projectName: item.projects?.[0]?.name || "Projeto" }))} budgets={budgets.filter((item) => item.category_id === category.id).map((item) => ({ id: item.id, title: item.title, value: item.budget_value, status: item.status, projectName: item.projects?.[0]?.name || "Projeto" }))} expenses={expenses.filter((item) => item.category_id === category.id).map((item) => ({ id: item.id, title: item.description, value: item.approved_value, status: item.status, projectName: item.projects?.[0]?.name || "Projeto" }))} incomes={incomes.filter((item) => item.category_id === category.id).map((item) => ({ id: item.id, title: item.origin, value: item.amount, status: item.status, projectName: item.projects?.[0]?.name || "Projeto" }))} returnTo={returnTo} /></TableCell> : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={categoryPage.page}
                totalPages={categoryPage.totalPages}
                label="categorias"
              />
            </>
          )}
        </CardContent>
      </Card>
    </RegisterPageShell>
  );
}
