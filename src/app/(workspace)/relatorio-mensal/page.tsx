import { FileBarChart } from "lucide-react";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pagination, databasePage, paginationRange } from "@/components/modules/pagination";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type ReportQuery = {
  inicio?: string;
  fim?: string;
  pagina_entradas?: string;
  pagina_despesas?: string;
  pagina_pagamentos?: string;
  pagina_orcamentos?: string;
};

function isIsoDate(value?: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return false;
  const [year, month, day] = value!.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function addOneYear(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(Date.UTC(year + 1, month - 1, day));
  return date.toISOString().slice(0, 10);
}

function reportRange(query: ReportQuery) {
  const today = dateFormatter.format(new Date());
  const fallback = { start: `${today.slice(0, 7)}-01`, end: today };
  const start = isIsoDate(query.inicio) ? query.inicio! : fallback.start;
  const end = isIsoDate(query.fim) ? query.fim! : fallback.end;
  const isValid = start <= end && end <= today && end <= addOneYear(start);

  return {
    start: isValid ? start : fallback.start,
    end: isValid ? end : fallback.end,
    today,
    warning: isValid
      ? undefined
      : "Informe datas válidas, sem data futura e com intervalo máximo de um ano. O período atual foi aplicado.",
  };
}

function firstEligibleCompetence(start: string) {
  if (start.endsWith("-01")) return start.slice(0, 7);
  const [year, month] = start.split("-").map(Number);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
}

export default async function MonthlyReportPage({
  searchParams,
  lockedProjectId,
}: {
  searchParams: Promise<ReportQuery>;
  lockedProjectId?: string;
}) {
  const query = await searchParams;
  if (!lockedProjectId) redirect("/selecionar-projeto");
  const range = reportRange(query);
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const incomeRange = paginationRange(query.pagina_entradas);
  const expenseRange = paginationRange(query.pagina_despesas);
  const paymentRange = paginationRange(query.pagina_pagamentos);
  const budgetRange = paginationRange(query.pagina_orcamentos);
  const competenceStart = firstEligibleCompetence(range.start);
  const competenceEnd = range.end.slice(0, 7);
  const expectedDateFilter = competenceStart <= competenceEnd
    ? `and(expected_date.gte.${range.start},expected_date.lte.${range.end}),and(expected_date.is.null,competence.gte.${competenceStart},competence.lte.${competenceEnd})`
    : `and(expected_date.gte.${range.start},expected_date.lte.${range.end})`;
  const [
    incomesResult,
    paymentsResult,
    expensesResult,
    budgetsResult,
    summaryResult,
  ] = supabase
    ? await Promise.all([
        supabase
          .from("income_entries")
          .select("id, project_id, amount, received_date, origin, projects(name)", { count: "exact" })
          .eq("project_id", lockedProjectId)
          .eq("status", "recebida")
          .gte("received_date", range.start)
          .lte("received_date", range.end)
          .order("received_date", { ascending: false })
          .order("id", { ascending: false })
          .range(incomeRange.from, incomeRange.to),
        supabase
          .from("payments")
          .select(
            "id, project_id, amount, payment_date, expenses!inner(description, status), projects(name)",
            { count: "exact" },
          )
          .eq("project_id", lockedProjectId)
          .neq("expenses.status", "cancelada")
          .gte("payment_date", range.start)
          .lte("payment_date", range.end)
          .order("payment_date", { ascending: false })
          .order("id", { ascending: false })
          .range(paymentRange.from, paymentRange.to),
        supabase
          .from("expenses")
          .select(
            "id, project_id, description, approved_value, remaining_value, competence, expected_date, projects(name)",
            { count: "exact" },
          )
          .eq("project_id", lockedProjectId)
          .neq("status", "cancelada")
          .or(expectedDateFilter)
          .order("expected_date", { ascending: false, nullsFirst: false })
          .order("id", { ascending: false })
          .range(expenseRange.from, expenseRange.to),
        supabase
          .from("budgets")
          .select(
            "id, project_id, title, budget_value, competence, expected_date, projects(name)",
            { count: "exact" },
          )
          .eq("project_id", lockedProjectId)
          .in("status", [
            "fornecedor_pendente",
            "aguardando_aprovacao_financeira",
          ])
          .or(expectedDateFilter)
          .order("expected_date", { ascending: false, nullsFirst: false })
          .order("id", { ascending: false })
          .range(budgetRange.from, budgetRange.to),
        supabase.rpc("get_project_financial_summary", {
          target_project_id: lockedProjectId,
          target_start_date: range.start,
          target_end_date: range.end,
        }),
      ])
      : [null, null, null, null, null];
  const incomes = incomesResult?.data ?? [];
  const payments = paymentsResult?.data ?? [];
  const expenses = expensesResult?.data ?? [];
  const budgets = budgetsResult?.data ?? [];
  const summary = summaryResult?.data?.[0];
  const incomeTotal = Number(summary?.received_income ?? 0);
  const paymentTotal = Number(summary?.paid_expenses ?? 0);
  const expenseTotal = Number(summary?.approved_expenses ?? 0);
  const projectName = (item: { projects?: { name: string }[] | null }) =>
    item.projects?.[0]?.name || "Projeto";
  const incomePage = databasePage(incomes, incomesResult?.count ?? 0, incomeRange.page);
  const expensePage = databasePage(expenses, expensesResult?.count ?? 0, expenseRange.page);
  const paymentPage = databasePage(payments, paymentsResult?.count ?? 0, paymentRange.page);
  const budgetPage = databasePage(budgets, budgetsResult?.count ?? 0, budgetRange.page);
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            Acompanhamento por período
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Relatório mensal
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualização no app; exportação não faz parte do MVP.
          </p>
        </div>
        <form
          aria-label="Filtros do relatório"
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[10rem_10rem_auto]"
        >
          <label className="grid gap-1 text-sm font-medium">
            Data inicial
            <input
              className="h-9 rounded-lg border border-input bg-background px-3"
              defaultValue={range.start}
              max={range.today}
              name="inicio"
              type="date"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Data final
            <input
              className="h-9 rounded-lg border border-input bg-background px-3"
              defaultValue={range.end}
              max={range.today}
              name="fim"
              type="date"
            />
          </label>
          <Button className="self-end" type="submit">
            Atualizar
          </Button>
          <p className="sm:col-span-2 lg:col-span-3 text-xs text-muted-foreground">
            Informe um período de até um ano, sem datas futuras.
          </p>
        </form>
      </section>
      {range.warning ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
          {range.warning}
        </p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="size-5 text-primary" />
            {`${range.start.split("-").reverse().join("/")} a ${range.end.split("-").reverse().join("/")}`}
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
          <Metric label="Resultado do período" value={incomeTotal - paymentTotal} />
        </CardContent>
      </Card>
      <section className="grid gap-4 xl:grid-cols-2">
        <List
          title={`Entradas (${incomePage.count})`}
          empty="Sem entradas no período."
          pagination={{ page: incomePage.page, totalPages: incomePage.totalPages, pageParam: "pagina_entradas", label: "entradas do relatório", params: { inicio: range.start, fim: range.end } }}
        >
          {incomePage.items.map((item) => (
            <Item
              key={item.id}
              title={item.origin}
              subtitle={`${projectName(item)} · ${item.received_date}`}
              value={Number(item.amount)}
            />
          ))}
        </List>
        <List
          title={`Despesas (${expensePage.count})`}
          empty="Sem despesas previstas no período."
          pagination={{ page: expensePage.page, totalPages: expensePage.totalPages, pageParam: "pagina_despesas", label: "despesas do relatório", params: { inicio: range.start, fim: range.end } }}
        >
          {expensePage.items.map((item) => (
            <Item
              key={item.id}
              title={item.description}
              subtitle={`${projectName(item)} · Saldo ${money.format(Number(item.remaining_value))}`}
              value={Number(item.approved_value)}
            />
          ))}
        </List>
        <List
          title={`Pagamentos (${paymentPage.count})`}
          empty="Sem pagamentos no período."
          pagination={{ page: paymentPage.page, totalPages: paymentPage.totalPages, pageParam: "pagina_pagamentos", label: "pagamentos do relatório", params: { inicio: range.start, fim: range.end } }}
        >
          {paymentPage.items.map((item) => (
            <Item
              key={item.id}
              title={item.expenses?.[0]?.description || "Despesa"}
              subtitle={`${projectName(item)} · ${item.payment_date}`}
              value={Number(item.amount)}
            />
          ))}
        </List>
        <List
          title={`Orçamentos pendentes (${budgetPage.count})`}
          empty="Sem orçamentos pendentes no período."
          pagination={{ page: budgetPage.page, totalPages: budgetPage.totalPages, pageParam: "pagina_orcamentos", label: "orçamentos do relatório", params: { inicio: range.start, fim: range.end } }}
        >
          {budgetPage.items.map((item) => (
            <Item
              key={item.id}
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
  pagination,
}: {
  title: string;
  empty: string;
  children: React.ReactNode[];
  pagination: React.ComponentProps<typeof Pagination>;
}) {
  return (
    <Card className="flex min-h-[23rem] flex-col">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" tabIndex={0} aria-label={`Lista de ${title}`}>
          {children.length === 0 ? (
            <p className="text-sm text-muted-foreground">{empty}</p>
          ) : (
            children
          )}
        </div>
        {children.length > 0 ? <Pagination {...pagination} /> : null}
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
