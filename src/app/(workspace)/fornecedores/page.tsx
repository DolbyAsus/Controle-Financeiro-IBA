import { Building2 } from "lucide-react";

import { createSupplier, linkSupplierToProject } from "@/lib/actions/base-registers";
import { SupplierEditDialog } from "@/components/suppliers/supplier-edit-dialog";
import { RegisterPageShell } from "@/components/modules/register-page-shell";
import { CreateRecordDialog } from "@/components/modules/create-record-dialog";
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

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ mensagem?: string; erro?: string; pagina?: string; projeto?: string }>;
}) {
  const query = await searchParams;
  const projectId = query.projeto;
  const returnTo = projectId ? `/projetos/${projectId}/fornecedores` : undefined;
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const profile = supabase ? await getWorkspaceProfile() : null;
  const access = projectId && supabase ? await getProjectWorkspaceAccess(projectId) : null;
  const canManageSuppliers = projectId
    ? access?.projectRole === "admin" || access?.projectRole === "financeiro"
    : profile?.role === "admin";
  const pageRange = paginationRange(query.pagina);
  const categories = supabase
    ? ((
        await (projectId
          ? supabase
              .from("categories")
              .select("id, name, status, projects(name)")
              .eq("project_id", projectId)
              .order("name")
          : supabase
          .from("categories")
          .select("id, name, status, projects(name)")
          .order("name"))
      ).data ?? [])
    : [];
  const suppliersResult = supabase
    ? await (projectId
        ? supabase
          .from("suppliers")
          .select(
            "id, name, person_type, document, main_contact, phone, email, address, main_category_id, status, notes, categories(name), project_suppliers!inner(project_id, status)",
            { count: "exact" },
          )
          .eq("project_suppliers.project_id", projectId)
          .eq("project_suppliers.status", "ativo")
        : supabase
          .from("suppliers")
          .select(
            "id, name, person_type, document, main_contact, phone, email, address, main_category_id, status, notes, categories(name)",
            { count: "exact" },
          )
      )
        .order("name")
        .order("id")
        .range(pageRange.from, pageRange.to)
    : null;
  const suppliers = suppliersResult?.data ?? [];
  const unlinkedSuppliers = supabase && projectId && canManageSuppliers
    ? ((await supabase.rpc("get_unlinked_project_suppliers", {
        target_project_id: projectId,
      })).data ?? [])
    : [];
  const supplierPage = databasePage(suppliers, suppliersResult?.count ?? 0, pageRange.page);
  const pageSupplierIds = supplierPage.items.map((supplier) => supplier.id);
  let linkedQuotations: {
    id: string; supplier_id: string; title: string; total_value: number | string; status: string; projects: { name: string }[] | null;
  }[] = [];
  let linkedBudgets: {
    id: string; supplier_id: string; title: string; budget_value: number | string; status: string; projects: { name: string }[] | null;
  }[] = [];
  let linkedExpenses: {
    id: string; supplier_id: string; description: string; approved_value: number | string; status: string; projects: { name: string }[] | null;
  }[] = [];
  if (supabase && pageSupplierIds.length > 0) {
    const quotationsQuery = supabase
      .from("quotations")
      .select("id, supplier_id, title, total_value, status, projects(name)")
      .in("supplier_id", pageSupplierIds)
      .order("created_at", { ascending: false })
      .limit(100);
    const budgetsQuery = supabase
      .from("budgets")
      .select("id, supplier_id, title, budget_value, status, projects(name)")
      .in("supplier_id", pageSupplierIds)
      .order("created_at", { ascending: false })
      .limit(100);
    const expensesQuery = supabase
      .from("expenses")
      .select("id, supplier_id, description, approved_value, status, projects(name)")
      .in("supplier_id", pageSupplierIds)
      .order("created_at", { ascending: false })
      .limit(100);
    if (projectId) {
      quotationsQuery.eq("project_id", projectId);
      budgetsQuery.eq("project_id", projectId);
      expensesQuery.eq("project_id", projectId);
    }
    const [quotationsResult, budgetsResult, expensesResult] = await Promise.all([
      quotationsQuery,
      budgetsQuery,
      expensesQuery,
    ]);
    linkedQuotations = quotationsResult.data ?? [];
    linkedBudgets = budgetsResult.data ?? [];
    linkedExpenses = expensesResult.data ?? [];
  }
  return (
    <RegisterPageShell
      title="Fornecedores"
      description="Mantenha fornecedores, contatos e categoria principal para futuras cotações."
      icon={Building2}
      createLabel="Criar fornecedor"
      formTitle="Novo fornecedor"
      message={query.mensagem}
      error={query.erro}
      form={canManageSuppliers ? (
        <form action={createSupplier} className="grid gap-4 md:grid-cols-2">
          {projectId ? <><input name="projeto_id" type="hidden" value={projectId} /><input name="retorno" type="hidden" value={returnTo} /></> : null}
          <label className="grid gap-1.5 text-sm font-medium">
            Nome *
            <Input
              className="w-full"
              name="nome"
              required
              maxLength={160}
              placeholder="Ex.: Construtora Exemplo"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Tipo de pessoa
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="tipo_pessoa"
              defaultValue=""
            >
              <option value="">Não informado</option>
              <option value="pessoa_juridica">Pessoa jurídica</option>
              <option value="pessoa_fisica">Pessoa física</option>
              <option value="outro">Outro</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            CPF/CNPJ ou documento
            <Input className="w-full" name="documento" maxLength={40} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Contato principal
            <Input className="w-full" name="contato" maxLength={120} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Telefone
            <Input
              className="w-full"
              name="telefone"
              type="tel"
              maxLength={30}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            E-mail
            <Input
              className="w-full"
              name="email"
              type="email"
              maxLength={160}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Categoria principal
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="categoria_principal_id"
              defaultValue=""
            >
              <option value="">Não informada</option>
              {categories.filter((category) => category.status === "ativo").map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.projects?.[0]?.name
                    ? ` · ${category.projects[0].name}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Status *
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="status"
              defaultValue="ativo"
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Endereço
            <textarea
              className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm"
              name="endereco"
              maxLength={500}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Observações
            <textarea
              className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm"
              name="observacoes"
              maxLength={2000}
            />
          </label>
          <div className="md:col-span-2">
            <Button type="submit">Salvar fornecedor</Button>
          </div>
        </form>
      ) : null}
    >
      {projectId && canManageSuppliers ? (
        <Card>
          <CardHeader>
            <CardTitle>Vincular fornecedor já cadastrado</CardTitle>
            <CardDescription>
              Reutilize o cadastro mestre sem duplicar dados. O fornecedor ficará disponível somente neste projeto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateRecordDialog
              buttonLabel="Vincular fornecedor"
              title="Vincular fornecedor ao projeto"
              description="O cadastro mestre será reutilizado sem duplicar dados."
              disabled={unlinkedSuppliers.length === 0}
            >
              <form action={linkSupplierToProject} className="grid gap-4">
                <input name="projeto_id" type="hidden" value={projectId} />
                <input name="retorno" type="hidden" value={returnTo} />
                <label className="grid gap-1.5 text-sm font-medium">
                  Fornecedor disponível
                  <select className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="fornecedor_existente_id" required defaultValue="">
                    <option disabled value="">Selecione</option>
                    {unlinkedSuppliers.map((supplier: { id: string; name: string }) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                  </select>
                </label>
                <div><Button type="submit">Vincular fornecedor</Button></div>
              </form>
            </CreateRecordDialog>
            {unlinkedSuppliers.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">Não há outro fornecedor ativo disponível para vínculo.</p> : null}
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Fornecedores cadastrados</CardTitle>
          <CardDescription>
            {supplierPage.count} fornecedores disponíveis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Nenhum fornecedor cadastrado ainda. Uma cotação também poderá ser
              criada sem fornecedor.
            </p>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {supplierPage.items.map((supplier) => (
                  <article key={supplier.id} className="rounded-lg border p-3">
                    <div className="flex justify-between gap-2">
                      <strong>{supplier.name}</strong>
                      <Badge variant="secondary">{supplier.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {supplier.main_contact ||
                        supplier.email ||
                        supplier.phone ||
                        "Sem contato informado"}
                    </p>
                    {canManageSuppliers ? (
                      <div className="mt-3">
                        <SupplierEditDialog
                          supplier={supplier}
                          categories={categories}
                          quotations={linkedQuotations.filter((item) => item.supplier_id === supplier.id).map((item) => ({ id: item.id, title: item.title, value: item.total_value, status: item.status, projectName: item.projects?.[0]?.name || "Projeto" }))}
                          budgets={linkedBudgets.filter((item) => item.supplier_id === supplier.id).map((item) => ({ id: item.id, title: item.title, value: item.budget_value, status: item.status, projectName: item.projects?.[0]?.name || "Projeto" }))}
                          expenses={linkedExpenses.filter((item) => item.supplier_id === supplier.id).map((item) => ({ id: item.id, title: item.description, value: item.approved_value, status: item.status, projectName: item.projects?.[0]?.name || "Projeto" }))}
                          returnTo={returnTo}
                          projectId={projectId}
                        />
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Status</TableHead>
                      {canManageSuppliers ? <TableHead>Ações</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierPage.items.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">
                          {supplier.name}
                        </TableCell>
                        <TableCell>
                          {supplier.main_contact || supplier.email || "—"}
                        </TableCell>
                        <TableCell>{supplier.phone || "—"}</TableCell>
                        <TableCell>
                          {supplier.categories?.[0]?.name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{supplier.status}</Badge>
                        </TableCell>
                        {canManageSuppliers ? (
                          <TableCell>
                            <SupplierEditDialog
                              supplier={supplier}
                              categories={categories}
                              quotations={linkedQuotations.filter((item) => item.supplier_id === supplier.id).map((item) => ({ id: item.id, title: item.title, value: item.total_value, status: item.status, projectName: item.projects?.[0]?.name || "Projeto" }))}
                              budgets={linkedBudgets.filter((item) => item.supplier_id === supplier.id).map((item) => ({ id: item.id, title: item.title, value: item.budget_value, status: item.status, projectName: item.projects?.[0]?.name || "Projeto" }))}
                              expenses={linkedExpenses.filter((item) => item.supplier_id === supplier.id).map((item) => ({ id: item.id, title: item.description, value: item.approved_value, status: item.status, projectName: item.projects?.[0]?.name || "Projeto" }))}
                              returnTo={returnTo}
                              projectId={projectId}
                            />
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={supplierPage.page}
                totalPages={supplierPage.totalPages}
                label="fornecedores"
              />
            </>
          )}
        </CardContent>
      </Card>
    </RegisterPageShell>
  );
}
