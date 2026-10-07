import Link from "next/link";
import { CreditCard } from "lucide-react";

import {
  cancelExpense,
  createManualExpense,
} from "@/lib/actions/base-registers";
import { ExpenseEditDialog } from "@/components/expenses/expense-edit-dialog";
import { RegisterPageShell } from "@/components/modules/register-page-shell";
import { Pagination, paginate } from "@/components/modules/pagination";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
  aprovada: "Aprovada",
  parcialmente_paga: "Parcialmente paga",
  paga: "Paga",
  cancelada: "Cancelada",
};

function relatedName(relation: unknown) {
  const value = Array.isArray(relation) ? relation[0] : relation;
  if (!value || typeof value !== "object" || !("name" in value)) return null;
  return typeof value.name === "string" ? value.name : null;
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ mensagem?: string; erro?: string; pagina?: string; projeto?: string }>;
}) {
  const query = await searchParams;
  const projectId = query.projeto;
  const returnTo = projectId ? `/projetos/${projectId}/despesas` : undefined;
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const profile = supabase ? await getWorkspaceProfile() : null;
  const access = projectId && supabase ? await getProjectWorkspaceAccess(projectId) : null;
  const activeRole = access?.projectRole ?? profile?.role;
  const canEditExpense = ["admin", "financeiro"].includes(activeRole ?? "");
  const canCancelPaidExpense = activeRole === "admin";
  const supplierLinks = supabase
    ? ((await (projectId
      ? supabase.from("project_suppliers").select("project_id, supplier_id").eq("project_id", projectId).eq("status", "ativo")
      : supabase.from("project_suppliers").select("project_id, supplier_id").eq("status", "ativo"))).data ?? [])
    : [];
  const supplierIds = supplierLinks.map((item) => item.supplier_id);
  const [
    expensesResult,
    projectsResult,
    stagesResult,
    categoriesResult,
    suppliersResult,
  ] = supabase
    ? await Promise.all([
        (projectId ? supabase
          .from("expenses")
          .select(
            "id, project_id, stage_id, category_id, supplier_id, description, approved_value, paid_value, remaining_value, status, free_recipient, expected_date, drive_document_url, notes, projects(name), suppliers(name), payments(id)",
          )
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }) : supabase
          .from("expenses")
          .select(
            "id, project_id, stage_id, category_id, supplier_id, description, approved_value, paid_value, remaining_value, status, free_recipient, expected_date, drive_document_url, notes, projects(name), suppliers(name), payments(id)",
          )
          .order("created_at", { ascending: false })),
        projectId ? supabase.from("projects").select("id, name").eq("id", projectId) : supabase.from("projects").select("id, name").order("name"),
        (projectId ? supabase
          .from("project_stages")
          .select("id, name, project_id, projects(name)")
          .eq("project_id", projectId)
          .eq("status", "ativo")
          .order("sort_order") : supabase
          .from("project_stages")
          .select("id, name, project_id, projects(name)")
          .eq("status", "ativo")
          .order("sort_order")),
        (projectId ? supabase
          .from("categories")
          .select("id, name, type, project_id, projects(name)")
          .eq("project_id", projectId)
          .eq("status", "ativo")
          .in("type", ["saida", "ambos"])
          .order("name") : supabase
          .from("categories")
          .select("id, name, type, project_id, projects(name)")
          .eq("status", "ativo")
          .in("type", ["saida", "ambos"])
          .order("name")),
        (projectId ? (supplierIds.length ? supabase.from("suppliers").select("id, name").in("id", supplierIds).eq("status", "ativo").order("name") : supabase.from("suppliers").select("id, name").eq("id", "00000000-0000-0000-0000-000000000000")) : supabase
          .from("suppliers")
          .select("id, name")
          .eq("status", "ativo")
          .order("name")),
      ])
    : [null, null, null, null, null];
  const expenses = expensesResult?.data ?? [];
  const projects = projectsResult?.data ?? [];
  const stages = stagesResult?.data ?? [];
  const categories = categoriesResult?.data ?? [];
  const suppliers = suppliersResult?.data ?? [];
  const canPay = (status: string) =>
    status === "aprovada" || status === "parcialmente_paga";
  const recipient = (item: (typeof expenses)[number]) =>
    relatedName(item.suppliers) || item.free_recipient || "—";
  const dependsOnBaseRecords =
    projects.length === 0 || stages.length === 0 || categories.length === 0;
  const expensePage = paginate(expenses, query.pagina);
  const partialExpenses = expenses.filter(
    (item) => item.status === "parcialmente_paga",
  );
  const paidExpenses = expenses.filter((item) => item.status === "paga");
  const openExpenses = expenses.filter((item) => item.status === "aprovada");

  return (
    <RegisterPageShell
      title="Despesas"
      description="Registre despesas manualmente ou aprove um orçamento. Toda despesa exige um destinatário e pode receber pagamentos parciais."
      icon={CreditCard}
      createLabel="Criar despesa"
      formTitle="Nova despesa manual"
      message={query.mensagem}
      error={query.erro}
      form={
        <form
          action={createManualExpense}
          className="grid gap-4 md:grid-cols-2"
        >
          {projectId ? <><input name="projeto_id" type="hidden" value={projectId} /><input name="retorno" type="hidden" value={returnTo} /></> : null}
          <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm md:col-span-2">
            <p className="font-medium">Nova despesa manual</p>
            <p className="mt-1 text-muted-foreground">
              Use para compromissos que não passaram por cotação/orçamento. O
              registro continuará com histórico e poderá receber parcelas.
            </p>
          </div>
          {projectId ? null : <label className="grid gap-1.5 text-sm font-medium">
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
              {projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>}
          <label className="grid gap-1.5 text-sm font-medium">
            Etapa *
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="etapa_id"
              required
              defaultValue=""
            >
              <option disabled value="">
                Selecione
              </option>
              {stages.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {relatedName(item.projects)
                    ? ` · ${relatedName(item.projects)}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Categoria de saída *
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="categoria_id"
              required
              defaultValue=""
            >
              <option disabled value="">
                Selecione
              </option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {relatedName(item.projects)
                    ? ` · ${relatedName(item.projects)}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Fornecedor cadastrado
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="fornecedor_id"
              defaultValue=""
            >
              <option value="">Selecione, se houver</option>
              {suppliers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Ou destinatário livre
            <Input
              className="w-full"
              name="destinatario_livre"
              maxLength={160}
              placeholder="Preencha somente se não escolher um fornecedor cadastrado"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Descrição da despesa *
            <Input
              className="w-full"
              name="descricao"
              required
              maxLength={2000}
              placeholder="Ex.: Compra emergencial de material elétrico"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Valor aprovado *
            <input
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="valor"
              required
              min="0.01"
              step="0.01"
              type="number"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Data prevista
            <input
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="data_prevista"
              type="date"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Link do documento no Drive
            <Input
              className="w-full"
              name="link_drive"
              type="url"
              maxLength={1000}
              placeholder="https://drive.google.com/..."
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
            <Button type="submit" disabled={dependsOnBaseRecords}>
              Cadastrar despesa manual
            </Button>
            {dependsOnBaseRecords ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Crie ao menos um projeto, uma etapa e uma categoria de saída
                antes de cadastrar despesas.
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Informe somente um destinatário: fornecedor cadastrado ou nome
                livre.
              </p>
            )}
          </div>
        </form>
      }
    >
      <section
        className="grid gap-3 sm:grid-cols-3"
        aria-label="Resumo das despesas por pagamento"
      >
        <Card size="sm">
          <CardHeader>
            <CardDescription>Pagas parcialmente</CardDescription>
            <CardTitle className="text-xl text-amber-700">
              {partialExpenses.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Saldo pendente:{" "}
            {money.format(
              partialExpenses.reduce(
                (total, item) => total + Number(item.remaining_value),
                0,
              ),
            )}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Pagas</CardDescription>
            <CardTitle className="text-xl text-emerald-700">
              {paidExpenses.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Total quitado:{" "}
            {money.format(
              paidExpenses.reduce(
                (total, item) => total + Number(item.paid_value),
                0,
              ),
            )}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Aguardando pagamento</CardDescription>
            <CardTitle className="text-xl text-primary">
              {openExpenses.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Sem parcela registrada.
          </CardContent>
        </Card>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Despesas cadastradas</CardTitle>
          <CardDescription>
            {expenses.length} despesas registradas. Registre parcelas
            diretamente na despesa aberta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Nenhuma despesa aprovada ainda.
            </p>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {expensePage.items.map((item) => (
                  <article key={item.id} className="rounded-lg border p-3">
                    <div className="flex justify-between gap-2">
                      <strong className="break-words">
                        {item.description}
                      </strong>
                      <Badge variant="secondary">{label[item.status]}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Destinatário: {recipient(item)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Pago: {money.format(Number(item.paid_value))} · Saldo:{" "}
                      {money.format(Number(item.remaining_value))}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.payments?.length ?? 0}{" "}
                      {(item.payments?.length ?? 0) === 1
                        ? "parcela registrada"
                        : "parcelas registradas"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {canEditExpense && item.status !== "cancelada" ? <ExpenseEditDialog expense={item} stages={stages} categories={categories} suppliers={suppliers} projectSupplierLinks={supplierLinks} returnTo={returnTo} /> : null}
                      {canPay(item.status) ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={projectId ? `/projetos/${projectId}/pagamentos?despesa=${item.id}` : `/pagamentos?despesa=${item.id}`}>Registrar parcela</Link> : null}
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Despesa</TableHead>
                      <TableHead>Destinatário</TableHead>
                      <TableHead>Aprovado</TableHead>
                      <TableHead>Pago</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Parcelas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expensePage.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.description}
                        </TableCell>
                        <TableCell>{recipient(item)}</TableCell>
                        <TableCell>
                          {money.format(Number(item.approved_value))}
                        </TableCell>
                        <TableCell>
                          {money.format(Number(item.paid_value))}
                        </TableCell>
                        <TableCell>
                          {money.format(Number(item.remaining_value))}
                        </TableCell>
                        <TableCell>{item.payments?.length ?? 0}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {label[item.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {canEditExpense && item.status !== "cancelada" ? <ExpenseEditDialog expense={item} stages={stages} categories={categories} suppliers={suppliers} projectSupplierLinks={supplierLinks} returnTo={returnTo} /> : null}
                            {canPay(item.status) ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={projectId ? `/projetos/${projectId}/pagamentos?despesa=${item.id}` : `/pagamentos?despesa=${item.id}`}>Registrar parcela</Link> : null}
                            {!canEditExpense && !canPay(item.status) ? <span className="text-xs text-muted-foreground">—</span> : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={expensePage.page}
                totalPages={expensePage.totalPages}
                label="despesas"
              />
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cancelar despesa</CardTitle>
          <CardDescription>
            O cancelamento exige justificativa e fica registrado no histórico.
            A despesa cancelada continua visível, mas deixa os totais e
            relatórios financeiros. Despesas com pagamentos só podem ser
            canceladas por Administrador do projeto ou Administrador global.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {expensePage.items
            .filter(
              (item) =>
                canEditExpense &&
                item.status !== "cancelada" &&
                ((item.payments?.length ?? 0) === 0 || canCancelPaidExpense),
            )
            .map((item) => (
              <form
                key={item.id}
                action={cancelExpense}
                className="grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(0,1fr)_minmax(260px,1fr)_auto] md:items-end"
              >
                <input name="despesa_id" type="hidden" value={item.id} />
                {projectId ? <input name="projeto_id" type="hidden" value={projectId} /> : null}
                {returnTo ? <input name="retorno" type="hidden" value={returnTo} /> : null}
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-sm text-muted-foreground">
                    Para: {recipient(item)} · Saldo:{" "}
                    {money.format(Number(item.remaining_value))}
                  </p>
                </div>
                <label className="grid gap-1 text-sm">
                  Justificativa
                  <textarea
                    className="min-h-9 rounded-lg border border-input bg-transparent p-2"
                    name="justificativa"
                    required
                    maxLength={2000}
                  />
                </label>
                <Button type="submit" variant="destructive">
                  Cancelar
                </Button>
              </form>
            ))}
          {expensePage.items.every(
            (item) =>
              !canEditExpense ||
              item.status === "cancelada" ||
              ((item.payments?.length ?? 0) > 0 && !canCancelPaidExpense),
          ) ? (
            <p className="text-sm text-muted-foreground">
              Não há despesas disponíveis para cancelamento.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </RegisterPageShell>
  );
}
