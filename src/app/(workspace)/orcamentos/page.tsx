import { Landmark } from "lucide-react";

import {
  approveBudgetAsExpense,
  resolveBudgetRecipient,
} from "@/lib/actions/base-registers";
import { BudgetEditDialog } from "@/components/budgets/budget-edit-dialog";
import { RegisterPageShell } from "@/components/modules/register-page-shell";
import { Pagination, paginate } from "@/components/modules/pagination";
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
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getProjectWorkspaceAccess, getWorkspaceProfile } from "@/lib/project-access";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const label: Record<string, string> = {
  fornecedor_pendente: "Fornecedor pendente",
  aguardando_aprovacao_financeira: "Aguardando aprovação",
  aprovado_como_despesa: "Virou despesa",
  reprovado: "Reprovado",
  cancelado: "Cancelado",
};

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ mensagem?: string; erro?: string; pagina?: string; projeto?: string }>;
}) {
  const query = await searchParams;
  const projectId = query.projeto;
  const returnTo = projectId ? `/projetos/${projectId}/orcamentos` : undefined;
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const profile = supabase ? await getWorkspaceProfile() : null;
  const access = projectId && supabase ? await getProjectWorkspaceAccess(projectId) : null;
  const activeRole = access?.projectRole ?? profile?.role;
  const canEditBudget = ["admin", "financeiro"].includes(activeRole ?? "");
  const supplierLinks = supabase
    ? ((await (projectId
      ? supabase.from("project_suppliers").select("project_id, supplier_id").eq("project_id", projectId).eq("status", "ativo")
      : supabase.from("project_suppliers").select("project_id, supplier_id").eq("status", "ativo"))).data ?? [])
    : [];
  const supplierIds = supplierLinks.map((item) => item.supplier_id);
  const suppliers = supabase
    ? ((
        await (projectId
          ? (supplierIds.length ? supabase.from("suppliers").select("id, name").in("id", supplierIds).eq("status", "ativo").order("name") : supabase.from("suppliers").select("id, name").eq("id", "00000000-0000-0000-0000-000000000000"))
          : supabase
          .from("suppliers")
          .select("id, name")
          .eq("status", "ativo")
          .order("name"))
      ).data ?? [])
    : [];
  const stages = supabase
    ? ((await (projectId
      ? supabase.from("project_stages").select("id, name, project_id").eq("project_id", projectId).eq("status", "ativo").order("sort_order")
      : supabase.from("project_stages").select("id, name, project_id").eq("status", "ativo").order("sort_order"))).data ?? [])
    : [];
  const categories = supabase
    ? ((await (projectId
      ? supabase.from("categories").select("id, name, project_id").eq("project_id", projectId).eq("status", "ativo").in("type", ["saida", "ambos"]).order("name")
      : supabase.from("categories").select("id, name, project_id").eq("status", "ativo").in("type", ["saida", "ambos"]).order("name"))).data ?? [])
    : [];
  const budgets = supabase
    ? ((
        await (projectId
          ? supabase
              .from("budgets")
              .select(
                "id, project_id, stage_id, category_id, supplier_id, title, description, budget_value, payment_method, payment_terms, expected_date, drive_document_url, status, free_recipient, choice_justification, projects(name), suppliers(name)",
              )
              .eq("project_id", projectId)
              .order("created_at", { ascending: false })
          : supabase
          .from("budgets")
          .select(
                "id, project_id, stage_id, category_id, supplier_id, title, description, budget_value, payment_method, payment_terms, expected_date, drive_document_url, status, free_recipient, choice_justification, projects(name), suppliers(name)",
          )
          .order("created_at", { ascending: false }))
      ).data ?? [])
    : [];
  const budgetPage = paginate(budgets, query.pagina);
  return (
    <RegisterPageShell
      title="Orçamentos"
      description="Cotações aprovadas chegam aqui. Financeiro/Admin define o destinatário e cria a despesa."
      icon={Landmark}
      formMode="information"
      formTitle="Como criar um orçamento"
      message={query.mensagem}
      error={query.erro}
      form={
        <p className="text-sm text-muted-foreground">
          O orçamento é criado pela aprovação de uma cotação. Nenhuma despesa
          nasce diretamente nesta tela.
        </p>
      }
    >
      {budgets.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Ainda não há orçamentos gerados a partir de cotações aprovadas.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {budgetPage.items.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex justify-between gap-3">
                    <div>
                      <CardTitle>{item.title}</CardTitle>
                      <CardDescription>
                        {item.projects?.[0]?.name || "Projeto"} ·{" "}
                        {money.format(Number(item.budget_value))}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{label[item.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">
                    <span className="font-medium">Justificativa: </span>
                    {item.choice_justification}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Destinatário: </span>
                    {item.suppliers?.[0]?.name ||
                      item.free_recipient ||
                      "Pendente"}
                  </p>
                  {canEditBudget && ["fornecedor_pendente", "aguardando_aprovacao_financeira"].includes(item.status) ? <BudgetEditDialog budget={item} stages={stages} categories={categories} suppliers={suppliers} projectSupplierLinks={supplierLinks} returnTo={returnTo} /> : null}
                  {item.status === "fornecedor_pendente" ? (
                    <form
                      action={resolveBudgetRecipient}
                      className="grid gap-3 border-t pt-4"
                    >
                      <input
                        type="hidden"
                        name="orcamento_id"
                        value={item.id}
                      />
                      {projectId ? <input type="hidden" name="projeto_id" value={projectId} /> : null}
                      {returnTo ? <input type="hidden" name="retorno" value={returnTo} /> : null}
                      <label className="grid gap-1 text-sm font-medium">
                        Fornecedor cadastrado
                        <select
                          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
                          name="fornecedor_id"
                          defaultValue=""
                        >
                          <option value="">Selecione, se houver</option>
                          {suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1 text-sm font-medium">
                        Ou destinatário livre
                        <Input
                          className="w-full"
                          name="destinatario_livre"
                          maxLength={160}
                          placeholder="Nome de quem receberá"
                        />
                      </label>
                      <Button type="submit">Definir destinatário</Button>
                    </form>
                  ) : null}
                  {item.status === "aguardando_aprovacao_financeira" ? (
                    <form
                      action={approveBudgetAsExpense}
                      className="border-t pt-4"
                    >
                      <input
                        type="hidden"
                        name="orcamento_id"
                        value={item.id}
                      />
                      {projectId ? <input type="hidden" name="projeto_id" value={projectId} /> : null}
                      {returnTo ? <input type="hidden" name="retorno" value={returnTo} /> : null}
                      <Button type="submit">Aprovar como despesa</Button>
                    </form>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination
            page={budgetPage.page}
            totalPages={budgetPage.totalPages}
            label="orçamentos"
          />
        </>
      )}
    </RegisterPageShell>
  );
}
