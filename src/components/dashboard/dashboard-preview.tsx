import { AlertCircle, ArrowDownRight, ArrowUpRight, Clock3, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const cards = [
  { label: "Saldo atual", value: 128450, icon: Wallet, trend: "Entradas menos pagamentos", tone: "text-emerald-700" },
  { label: "Entradas recebidas", value: 185000, icon: ArrowDownRight, trend: "No período selecionado", tone: "text-emerald-700" },
  { label: "Total pago", value: 56550, icon: ArrowUpRight, trend: "Pagamentos realizados", tone: "text-rose-700" },
  { label: "Saldo a pagar", value: 43500, icon: Clock3, trend: "Despesas aprovadas", tone: "text-amber-700" },
];

export function DashboardPreview() {
  return <div className="space-y-6">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-primary">Visão financeira</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1><p className="mt-1 text-sm text-muted-foreground">Acompanhe o projeto Colégio Batista em um só lugar.</p></div><div className="flex gap-2 text-sm"><span className="rounded-lg border bg-background px-3 py-2">Outubro de 2026</span><span className="rounded-lg border bg-background px-3 py-2">Todos os dados</span></div></section>
    <section aria-label="Resumo financeiro" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ icon: Icon, label, value, trend, tone }) => <Card key={label} size="sm"><CardHeader><CardDescription className="flex items-center justify-between">{label}<Icon className="size-4" aria-hidden="true" /></CardDescription><CardTitle className={"text-xl " + tone}>{formatCurrency(value)}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{trend}</CardContent></Card>)}</section>
    <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]"><Card><CardHeader><CardTitle>Entradas e pagamentos</CardTitle><CardDescription>Comparativo mensal do projeto.</CardDescription></CardHeader><CardContent><div className="flex h-52 items-end justify-between gap-3 border-b pb-2" aria-label="Gráfico ilustrativo de entradas e pagamentos">{[42, 58, 36, 74, 63, 82, 51].map((height, index) => <div key={index} className="flex flex-1 flex-col items-center gap-2"><div className="flex h-44 w-full items-end justify-center gap-1"><span className="w-2/5 rounded-t bg-brand-blue" style={{ height: `${height}%` }} /><span className="w-2/5 rounded-t bg-brand-magenta" style={{ height: `${Math.max(16, height - 25)}%` }} /></div><span className="text-[10px] text-muted-foreground">{["Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out"][index]}</span></div>)}</div><div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground"><span><i className="mr-1 inline-block size-2 rounded-full bg-brand-blue" />Entradas</span><span><i className="mr-1 inline-block size-2 rounded-full bg-brand-magenta" />Pagamentos</span></div></CardContent></Card>
      <Card><CardHeader><CardTitle>Atenção necessária</CardTitle><CardDescription>Pendências que precisam de acompanhamento.</CardDescription></CardHeader><CardContent className="space-y-3">{[["3 cotações em análise", "Compare e registre a decisão da comissão."], ["2 orçamentos pendentes", "Aguardando fornecedor ou aprovação financeira."], ["1 despesa parcialmente paga", "Há saldo pendente para pagamento."]].map(([title, description]) => <div key={title} className="flex gap-3 rounded-lg border bg-muted/35 p-3"><AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" /><div><p className="text-sm font-medium">{title}</p><p className="mt-0.5 text-xs text-muted-foreground">{description}</p></div></div>)}</CardContent></Card>
    </section>
    <section className="grid gap-4 sm:grid-cols-3">{["Cotações em análise", "Orçamentos pendentes", "Despesas em aberto"].map((label, index) => <Card key={label} size="sm"><CardContent className="flex items-center justify-between pt-0"><span className="text-sm text-muted-foreground">{label}</span><Badge variant="secondary">{[3, 2, 4][index]}</Badge></CardContent></Card>)}</section>
  </div>;
}
