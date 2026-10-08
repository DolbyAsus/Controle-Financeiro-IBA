import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/modules/pagination";
import { getAccessibleProjectsPage, getWorkspaceProfile } from "@/lib/project-access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function GeneralSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const query = await searchParams;
  const profile = await getWorkspaceProfile();
  if (profile.role !== "admin") redirect("/selecionar-projeto");
  const [projectPage, supabase] = await Promise.all([
    getAccessibleProjectsPage(profile.churchId, query.pagina),
    createClient(),
  ]);
  const { data: dashboardRows, error: dashboardError } = await supabase
    .from("view_project_dashboard")
    .select("project_id, received_income, paid_expenses, outstanding_expenses");
  if (dashboardError) throw new Error("Não foi possível carregar o resumo geral.");
  const summaries = dashboardRows ?? [];
  const totalIncome = summaries.reduce((total, item) => total + Number(item.received_income), 0);
  const totalPayments = summaries.reduce((total, item) => total + Number(item.paid_expenses), 0);
  const totalOutstanding = summaries.reduce((total, item) => total + Number(item.outstanding_expenses), 0);

  return <div className="space-y-6">
    <section><p className="text-sm font-medium text-primary">Administração</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Resumo geral</h1><p className="mt-1 text-sm text-muted-foreground">Visão consolidada da Igreja Batista da Aliança. Operações continuam separadas dentro de cada projeto.</p></section>
    <section className="grid gap-3 sm:grid-cols-3"><Card size="sm"><CardHeader><CardDescription>Entradas recebidas</CardDescription><CardTitle className="text-xl text-emerald-700">{money.format(totalIncome)}</CardTitle></CardHeader></Card><Card size="sm"><CardHeader><CardDescription>Pagamentos realizados</CardDescription><CardTitle className="text-xl text-rose-700">{money.format(totalPayments)}</CardTitle></CardHeader></Card><Card size="sm"><CardHeader><CardDescription>Saldo a pagar</CardDescription><CardTitle className="text-xl text-amber-700">{money.format(totalOutstanding)}</CardTitle></CardHeader></Card></section>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="size-5 text-primary" aria-hidden="true" />Projetos</CardTitle><CardDescription>{projectPage.count} projetos disponíveis para administração.</CardDescription></CardHeader><CardContent className="space-y-3">{projectPage.items.map((project) => { const summary = summaries.find((item) => item.project_id === project.id); const income = Number(summary?.received_income ?? 0); const paid = Number(summary?.paid_expenses ?? 0); const outstanding = Number(summary?.outstanding_expenses ?? 0); return <article key={project.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{project.name}</h2><Badge variant="secondary">{project.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">Entradas {money.format(income)} · Pagamentos {money.format(paid)} · A pagar {money.format(outstanding)}</p></div><Button variant="outline" render={<Link href={`/projetos/${project.id}/dashboard`} />}>Abrir projeto <ArrowRight className="size-4" aria-hidden="true" /></Button></article>; })}<Pagination page={projectPage.page} totalPages={projectPage.totalPages} label="projetos" /></CardContent></Card>
  </div>;
}
