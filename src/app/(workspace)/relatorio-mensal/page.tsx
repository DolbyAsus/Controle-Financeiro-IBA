import { FileBarChart } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const monthLabel = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});
const monthFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
});
function validMonth(value?: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? "")
    ? value!
    : monthFormatter.format(new Date());
}

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; projeto?: string }>;
}) {
  const query = await searchParams;
  const month = validMonth(query.mes);
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const [
    projectsResult,
    incomesResult,
    paymentsResult,
    expensesResult,
    budgetsResult,
  ] = supabase
    ? await Promise.all([
        supabase.from("projects").select("id, name").order("name"),
        supabase
          .from("income_entries")
          .select("project_id, amount, received_date, origin, projects(name)")
          .eq("status", "recebida"),
        supabase
          .from("payments")
          .select(
            "project_id, amount, payment_date, expenses(description), projects(name)",
          ),
        supabase
          .from("expenses")
          .select(
            "project_id, description, approved_value, remaining_value, competence, expected_date, projects(name)",
          )
          .neq("status", "cancelada"),
        supabase
          .from("budgets")
          .select(
            "project_id, title, budget_value, competence, expected_date, projects(name)",
          )
          .in("status", [
            "fornecedor_pendente",
            "aguardando_aprovacao_financeira",
          ]),
      ])
    : [null, null, null, null, null];
  const projects = projectsResult?.data ?? [];
  const projectId = projects.some((project) => project.id === query.projeto)
    ? query.projeto!
    : "";
  const belongsToProject = (item: { project_id: string }) =>
    !projectId || item.project_id === projectId;
  const isInMonth = (date: string | null, competence?: string | null) =>
    competence === month || (!competence && date?.startsWith(month));
  const incomes = (incomesResult?.data ?? []).filter(
    (item) => belongsToProject(item) && item.received_date.startsWith(month),
  );
  const payments = (paymentsResult?.data ?? []).filter(
    (item) => belongsToProject(item) && item.payment_date.startsWith(month),
  );
  const expenses = (expensesResult?.data ?? []).filter(
    (item) =>
      belongsToProject(item) && isInMonth(item.expected_date, item.competence),
  );
  const budgets = (budgetsResult?.data ?? []).filter(
    (item) =>
      belongsToProject(item) && isInMonth(item.expected_date, item.competence),
  );
  const sum = (
    items: {
      amount?: number | string | null;
      approved_value?: number | string | null;
    }[],
    field: "amount" | "approved_value",
  ) => items.reduce((total, item) => total + Number(item[field] ?? 0), 0);
  const incomeTotal = sum(incomes, "amount");
  const paymentTotal = sum(payments, "amount");
  const expenseTotal = sum(expenses, "approved_value");
  const projectName = (item: { projects?: { name: string }[] | null }) =>
    item.projects?.[0]?.name || "Projeto";
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            Acompanhamento mensal
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Relatório mensal
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualização no app; exportação não faz parte do MVP.
          </p>
        </div>
        <form
          aria-label="Filtros do relatório mensal"
          className="grid gap-2 sm:grid-cols-[minmax(13rem,1fr)_10rem_auto]"
        >
          <label className="grid gap-1 text-sm font-medium">
            Projeto
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              name="projeto"
              defaultValue={projectId}
            >
              <option value="">Todos os projetos</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Competência
            <input
              className="h-9 rounded-lg border border-input bg-background px-3"
              name="mes"
              type="month"
              defaultValue={month}
            />
          </label>
          <Button className="self-end" type="submit">
            Atualizar
          </Button>
        </form>
      </section>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="size-5 text-primary" />
            {monthLabel.format(new Date(`${month}-01T12:00:00`))}
          </CardTitle>
          <CardDescription>
            Resumo dos lançamentos do projeto e período selecionados.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Entradas"
            value={incomeTotal}
            tone="text-emerald-700"
          />
          <Metric
            label="Despesas aprovadas"
            value={expenseTotal}
            tone="text-amber-700"
          />
          <Metric
            label="Pagamentos"
            value={paymentTotal}
            tone="text-rose-700"
          />
          <Metric label="Resultado do mês" value={incomeTotal - paymentTotal} />
        </CardContent>
      </Card>
      <section className="grid gap-4 xl:grid-cols-2">
        <List
          title={`Entradas (${incomes.length})`}
          empty="Sem entradas no período."
        >
          {incomes.map((item, index) => (
            <Item
              key={`${item.origin}-${index}`}
              title={item.origin}
              subtitle={`${projectName(item)} · ${item.received_date}`}
              value={Number(item.amount)}
            />
          ))}
        </List>
        <List
          title={`Despesas (${expenses.length})`}
          empty="Sem despesas previstas no período."
        >
          {expenses.map((item, index) => (
            <Item
              key={`${item.description}-${index}`}
              title={item.description}
              subtitle={`${projectName(item)} · Saldo ${money.format(Number(item.remaining_value))}`}
              value={Number(item.approved_value)}
            />
          ))}
        </List>
        <List
          title={`Pagamentos (${payments.length})`}
          empty="Sem pagamentos no período."
        >
          {payments.map((item, index) => (
            <Item
              key={`${item.payment_date}-${index}`}
              title={item.expenses?.[0]?.description || "Despesa"}
              subtitle={`${projectName(item)} · ${item.payment_date}`}
              value={Number(item.amount)}
            />
          ))}
        </List>
        <List
          title={`Orçamentos pendentes (${budgets.length})`}
          empty="Sem orçamentos pendentes no período."
        >
          {budgets.map((item, index) => (
            <Item
              key={`${item.title}-${index}`}
              title={item.title}
              subtitle={projectName(item)}
              value={Number(item.budget_value)}
            />
          ))}
        </List>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <strong className={`text-xl ${tone ?? ""}`}>{money.format(value)}</strong>
    </div>
  );
}
function List({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
        {children.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
function Item({
  title,
  subtitle,
  value,
}: {
  title: string | null;
  subtitle: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">{title || "Registro"}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <Badge variant="secondary">{money.format(value)}</Badge>
    </div>
  );
}
