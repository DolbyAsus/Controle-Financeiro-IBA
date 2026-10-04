import { AlertCircle, ArrowDownRight, ArrowUpRight, Clock3, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" });

function validMonth(value?: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? "") ? value! : monthFormatter.format(new Date());
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ projeto?: string; mes?: string }> }) {
  const query = await searchParams;
  const month = validMonth(query.mes);
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const [projectsResult, incomesResult, paymentsResult, expensesResult, quotationsResult, budgetsResult] = supabase ? await Promise.all([
    supabase.from("projects").select("id, name").order("name"),
    supabase.from("income_entries").select("project_id, amount, received_date").eq("status", "recebida"),
    supabase.from("payments").select("project_id, amount, payment_date"),
    supabase.from("expenses").select("project_id, approved_value, remaining_value, competence, expected_date").neq("status", "cancelada"),
    supabase.from("quotations").select("project_id").in("status", ["recebida", "em_analise"]),
    supabase.from("budgets").select("project_id").in("status", ["fornecedor_pendente", "aguardando_aprovacao_financeira"]),
  ]) : [null, null, null, null, null, null];
  const projects = projectsResult?.data ?? [];
  const projectId = projects.some((project) => project.id === query.projeto) ? query.projeto! : "";
  const belongsToProject = (item: { project_id: string }) => !projectId || item.project_id === projectId;
  const isInMonth = (date: string | null, competence?: string | null) => competence === month || (!competence && date?.startsWith(month));
  const incomes = (incomesResult?.data ?? []).filter((item) => belongsToProject(item) && item.received_date.startsWith(month));
  const payments = (paymentsResult?.data ?? []).filter((item) => belongsToProject(item) && item.payment_date.startsWith(month));
  const expenses = (expensesResult?.data ?? []).filter((item) => belongsToProject(item) && isInMonth(item.expected_date, item.competence));
  const quotations = (quotationsResult?.data ?? []).filter(belongsToProject);
  const budgets = (budgetsResult?.data ?? []).filter(belongsToProject);
  const sum = (items: { amount?: number | string | null; approved_value?: number | string | null; remaining_value?: number | string | null }[], field: "amount" | "approved_value" | "remaining_value") => items.reduce((total, item) => total + Number(item[field] ?? 0), 0);
  const income = sum(incomes, "amount"); const paid = sum(payments, "amount"); const approved = sum(expenses, "approved_value"); const outstanding = sum(expenses, "remaining_value");
  const visibleProjects = projectId ? projects.filter((project) => project.id === projectId) : projects;
  const cards = [{ label: "Saldo do período", value: income - paid, icon: Wallet, tone: "text-emerald-700", hint: "Entradas menos pagamentos" }, { label: "Entradas recebidas", value: income, icon: ArrowDownRight, tone: "text-emerald-700", hint: "No período selecionado" }, { label: "Pagamentos realizados", value: paid, icon: ArrowUpRight, tone: "text-rose-700", hint: "No período selecionado" }, { label: "Saldo a pagar", value: outstanding, icon: Clock3, tone: "text-amber-700", hint: "Despesas do período" }];
  return <div className="space-y-6"><section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-medium text-primary">Visão financeira</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1><p className="mt-1 text-sm text-muted-foreground">Dados consolidados por projeto e competência.</p></div><form aria-label="Filtros do dashboard" className="grid gap-2 sm:grid-cols-[minmax(13rem,1fr)_10rem_auto]"><label className="grid gap-1 text-sm font-medium">Projeto<select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="projeto" defaultValue={projectId}><option value="">Todos os projetos</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Competência<input className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="mes" type="month" defaultValue={month} /></label><Button className="self-end" type="submit">Atualizar</Button></form></section><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ icon: Icon, label, value, hint, tone }) => <Card key={label} size="sm"><CardHeader><CardDescription className="flex items-center justify-between">{label}<Icon className="size-4" /></CardDescription><CardTitle className={`text-xl ${tone}`}>{money.format(value)}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{hint}</CardContent></Card>)}</section><section className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Projetos</CardTitle><CardDescription>Resumo da competência selecionada.</CardDescription></CardHeader><CardContent className="space-y-3">{visibleProjects.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum projeto disponível.</p> : visibleProjects.map((project) => { const projectIncomes = incomes.filter((item) => item.project_id === project.id); const projectPayments = payments.filter((item) => item.project_id === project.id); const projectExpenses = expenses.filter((item) => item.project_id === project.id); return <div key={project.id} className="rounded-lg border p-3"><div className="flex justify-between gap-3"><strong className="text-sm">{project.name}</strong><span className="text-sm font-medium">Saldo {money.format(sum(projectIncomes, "amount") - sum(projectPayments, "amount"))}</span></div><p className="mt-1 text-xs text-muted-foreground">Entradas {money.format(sum(projectIncomes, "amount"))} · Comprometido {money.format(sum(projectExpenses, "approved_value"))}</p></div>; })}</CardContent></Card><Card><CardHeader><CardTitle>Atenção necessária</CardTitle><CardDescription>Pendências do projeto selecionado.</CardDescription></CardHeader><CardContent className="space-y-3">{[[quotations.length, "cotações em análise", "Compare e registre a decisão da comissão."], [budgets.length, "orçamentos pendentes", "Aguardando fornecedor ou aprovação financeira."], [outstanding, "em saldo a pagar", "Há despesas ainda não quitadas no período."]].map(([value, title, description]) => <div key={String(title)} className="flex gap-3 rounded-lg border bg-muted/35 p-3"><AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" /><div><p className="text-sm font-medium">{String(value)} {title}</p><p className="mt-0.5 text-xs text-muted-foreground">{description}</p></div></div>)}</CardContent></Card></section><section className="grid gap-3 sm:grid-cols-3"><Card size="sm"><CardContent className="flex items-center justify-between pt-0"><span className="text-sm text-muted-foreground">Cotações em análise</span><Badge variant="secondary">{quotations.length}</Badge></CardContent></Card><Card size="sm"><CardContent className="flex items-center justify-between pt-0"><span className="text-sm text-muted-foreground">Orçamentos pendentes</span><Badge variant="secondary">{budgets.length}</Badge></CardContent></Card><Card size="sm"><CardContent className="flex items-center justify-between pt-0"><span className="text-sm text-muted-foreground">Despesas no período</span><Badge variant="secondary">{money.format(approved)}</Badge></CardContent></Card></section></div>;
}
