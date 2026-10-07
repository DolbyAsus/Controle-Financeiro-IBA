import { Landmark } from "lucide-react";

import {
  approveBudgetAsExpense,
  resolveBudgetRecipient,
} from "@/lib/actions/base-registers";
import { BudgetEditDialog } from "@/components/budgets/budget-edit-dialog";
import { CreateRecordDialog } from "@/components/modules/create-record-dialog";
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
      <Card>
        <CardHeader>
          <CardTitle>Orçamentos registrados</CardTitle>
          <CardDescription>
            {budgets.length} orçamentos disponíveis para acompanhamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
      {budgets.length === 0 ? (
          <p className="py-10 text-sm text-muted-foreground">
            Ainda não há orçamentos gerados a partir de cotações aprovadas.
          </p>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {budgetPage.items.map((item) => (
              <article key={item.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><strong className="break-words">{item.title}</strong><p className="mt-1 text-sm text-muted-foreground">{item.projects?.[0]?.name || "Projeto"} · {item.suppliers?.[0]?.name || item.free_recipient || "Destinatário pendente"}</p></div>
                  <Badge className="shrink-0" variant="secondary">{label[item.status]}</Badge>
                </div>
                <p className="mt-2 text-sm font-medium">{money.format(Number(item.budget_value))}</p>
                <BudgetActions item={item} />
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block"><Table><TableHeader><TableRow><TableHead>Orçamento</TableHead><TableHead>Projeto</TableHead><TableHead>Destinatário</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{budgetPage.items.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.title}</TableCell><TableCell>{item.projects?.[0]?.name || "—"}</TableCell><TableCell>{item.suppliers?.[0]?.name || item.free_recipient || "Pendente"}</TableCell><TableCell>{money.format(Number(item.budget_value))}</TableCell><TableCell><Badge variant="secondary">{label[item.status]}</Badge></TableCell><TableCell><BudgetActions item={item} /></TableCell></TableRow>)}</TableBody></Table></div>
          <Pagination
            page={budgetPage.page}
            totalPages={budgetPage.totalPages}
            label="orçamentos"
          />
        </>
      )}
        </CardContent>
      </Card>
    </RegisterPageShell>
  );

  function BudgetActions({ item }: { item: (typeof budgets)[number] }) {
    const editable = canEditBudget && ["fornecedor_pendente", "aguardando_aprovacao_financeira"].includes(item.status);
    return <div className="mt-3 flex flex-wrap gap-2 md:mt-0 md:justify-end">
      {editable ? <BudgetEditDialog budget={item} stages={stages} categories={categories} suppliers={suppliers} projectSupplierLinks={supplierLinks} returnTo={returnTo} /> : null}
      {item.status === "fornecedor_pendente" ? <CreateRecordDialog buttonLabel="Definir destinatário" title="Definir destinatário do orçamento" description="Informe fornecedor cadastrado ou destinatário livre para liberar a aprovação financeira."><form action={resolveBudgetRecipient} className="grid gap-4"><input type="hidden" name="orcamento_id" value={item.id} />{projectId ? <input type="hidden" name="projeto_id" value={projectId} /> : null}{returnTo ? <input type="hidden" name="retorno" value={returnTo} /> : null}<label className="grid gap-1.5 text-sm font-medium">Fornecedor cadastrado<select className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="fornecedor_id" defaultValue=""><option value="">Selecione, se houver</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label><label className="grid gap-1.5 text-sm font-medium">Ou destinatário livre<Input className="w-full" name="destinatario_livre" maxLength={160} placeholder="Nome de quem receberá" /></label><div><Button type="submit">Salvar destinatário</Button></div></form></CreateRecordDialog> : null}
      {item.status === "aguardando_aprovacao_financeira" ? <form action={approveBudgetAsExpense}><input type="hidden" name="orcamento_id" value={item.id} />{projectId ? <input type="hidden" name="projeto_id" value={projectId} /> : null}{returnTo ? <input type="hidden" name="retorno" value={returnTo} /> : null}<Button type="submit">Aprovar como despesa</Button></form> : null}
    </div>;
  }
}
