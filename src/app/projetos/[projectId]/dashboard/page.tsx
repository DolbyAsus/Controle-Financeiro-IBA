import { AlertCircle, ArrowDownRight, ArrowUpRight, Clock3, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAccessibleProject } from "@/lib/project-access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" });

function validMonth(value?: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? "") ? value! : monthFormatter.format(new Date());
}

export default async function ProjectDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const [project, supabase] = await Promise.all([getAccessibleProject(projectId), createClient()]);
  if (!project) return null;
  const month = validMonth(query.mes);

  const [incomesResult, paymentsResult, expensesResult, quotationsResult, budgetsResult] = await Promise.all([
    supabase.from("income_entries").select("amount, received_date").eq("project_id", project.id).eq("status", "recebida"),
    supabase
      .from("payments")
      .select("amount, payment_date, expenses!inner(status)")
      .eq("project_id", project.id)
      .neq("expenses.status", "cancelada"),
    supabase.from("expenses").select("approved_value, remaining_value, competence, expected_date, status").eq("project_id", project.id).neq("status", "cancelada"),
    supabase.from("quotations").select("id").eq("project_id", project.id).eq("status", "em_analise"),
    supabase.from("budgets").select("id, status").eq("project_id", project.id).in("status", ["fornecedor_pendente", "aguardando_aprovacao_financeira"]),
  ]);

  const sum = (items: { amount?: number | string | null; approved_value?: number | string | null; remaining_value?: number | string | null }[], field: "amount" | "approved_value" | "remaining_value") => items.reduce((total, item) => total + Number(item[field] ?? 0), 0);
  const incomes = (incomesResult.data ?? []).filter((income) => income.received_date.startsWith(month));
  const payments = (paymentsResult.data ?? []).filter((payment) => payment.payment_date.startsWith(month));
  const expenses = (expensesResult.data ?? []).filter((expense) => expense.competence === month || (!expense.competence && expense.expected_date?.startsWith(month)));
  const quotations = quotationsResult.data ?? [];
  const budgets = budgetsResult.data ?? [];
  const income = sum(incomes, "amount");
  const paid = sum(payments, "amount");
  const outstanding = sum(expenses, "remaining_value");
  const approved = sum(expenses, "approved_value");
  const supplierPending = budgets.filter((item) => item.status === "fornecedor_pendente").length;
  const approvalPending = budgets.length - supplierPending;

  const cards = [
    { label: "Saldo do período", value: income - paid, icon: Wallet, tone: "text-emerald-700", hint: "Entradas menos pagamentos" },
    { label: "Entradas recebidas", value: income, icon: ArrowDownRight, tone: "text-emerald-700", hint: "No período selecionado" },
    { label: "Pagamentos realizados", value: paid, icon: ArrowUpRight, tone: "text-rose-700", hint: "No período selecionado" },
    { label: "Saldo a pagar", value: outstanding, icon: Clock3, tone: "text-amber-700", hint: "Despesas do período" },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">{project.project_type || "Projeto financeiro"}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard do projeto</h1>
          <p className="mt-1 text-sm text-muted-foreground">Indicadores financeiros de {project.name}.</p>
        </div>
        <form aria-label="Competência do dashboard" className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm font-medium">Competência<input className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="mes" type="month" defaultValue={month} /></label>
          <Button type="submit">Atualizar</Button>
        </form>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ icon: Icon, label, value, hint, tone }) => <Card key={label} size="sm"><CardHeader><CardDescription className="flex items-center justify-between">{label}<Icon className="size-4" aria-hidden="true" /></CardDescription><CardTitle className={`text-xl ${tone}`}>{money.format(value)}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{hint}</CardContent></Card>)}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Atenção necessária</CardTitle><CardDescription>Pendências exclusivas deste projeto.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {[[quotations.length, "cotações em análise", "Compare as propostas e registre a decisão da comissão."], [supplierPending, "orçamentos sem destinatário", "Defina fornecedor ou destinatário livre antes da aprovação financeira."], [approvalPending, "orçamentos aguardam aprovação", "Financeiro ou Administrador pode gerar a despesa."], [outstanding, "em saldo a pagar", "Há despesas ainda não quitadas neste período."]].map(([value, title, description]) => <div key={String(title)} className="flex gap-3 rounded-lg border bg-muted/35 p-3"><AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" /><div><p className="text-sm font-medium">{typeof value === "number" && String(title).includes("saldo") ? money.format(value) : String(value)} {title}</p><p className="mt-0.5 text-xs text-muted-foreground">{String(description)}</p></div></div>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Resumo operacional</CardTitle><CardDescription>Valores e registros da competência selecionada.</CardDescription></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[ ["Cotações em análise", String(quotations.length)], ["Orçamentos pendentes", String(budgets.length)], ["Despesas do período", money.format(approved)], ["Pagamentos registrados", String(payments.length)] ].map(([label, value]) => <div key={label} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-base font-semibold">{value}</p></div>)}
          </CardContent>
        </Card>
      </section>
      <p className="text-xs text-muted-foreground">As demais telas do projeto serão conectadas a esta mesma rota contextualizada na próxima etapa.</p>
    </div>
  );
}
