import { Landmark } from "lucide-react";

import { approveBudgetAsExpense, resolveBudgetRecipient } from "@/lib/actions/base-registers";
import { RegisterPageShell } from "@/components/modules/register-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const label: Record<string, string> = { fornecedor_pendente: "Fornecedor pendente", aguardando_aprovacao_financeira: "Aguardando aprovação", aprovado_como_despesa: "Virou despesa", reprovado: "Reprovado", cancelado: "Cancelado" };

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ mensagem?: string; erro?: string }> }) {
  const query = await searchParams;
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const suppliers = supabase ? (await supabase.from("suppliers").select("id, name").eq("status", "ativo").order("name")).data ?? [] : [];
  const budgets = supabase ? (await supabase.from("budgets").select("id, title, budget_value, status, free_recipient, choice_justification, projects(name), suppliers(name)").order("created_at", { ascending: false })).data ?? [] : [];
  return <RegisterPageShell title="Orçamentos" description="Cotações aprovadas chegam aqui. Financeiro/Admin define o destinatário e cria a despesa." icon={Landmark} message={query.mensagem} error={query.erro} form={<p className="text-sm text-muted-foreground">O orçamento é criado pela aprovação de uma cotação. Nenhuma despesa nasce diretamente nesta tela.</p>}>
    {budgets.length === 0 ? <Card><CardContent className="py-10 text-sm text-muted-foreground">Ainda não há orçamentos gerados a partir de cotações aprovadas.</CardContent></Card> : <div className="grid gap-4 lg:grid-cols-2">{budgets.map((item) => <Card key={item.id}><CardHeader><div className="flex justify-between gap-3"><div><CardTitle>{item.title}</CardTitle><CardDescription>{item.projects?.[0]?.name || "Projeto"} · {money.format(Number(item.budget_value))}</CardDescription></div><Badge variant="secondary">{label[item.status]}</Badge></div></CardHeader><CardContent className="space-y-3"><p className="text-sm"><span className="font-medium">Justificativa: </span>{item.choice_justification}</p><p className="text-sm"><span className="font-medium">Destinatário: </span>{item.suppliers?.[0]?.name || item.free_recipient || "Pendente"}</p>{item.status === "fornecedor_pendente" ? <form action={resolveBudgetRecipient} className="grid gap-3 border-t pt-4"><input type="hidden" name="orcamento_id" value={item.id} /><label className="grid gap-1 text-sm font-medium">Fornecedor cadastrado<select className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="fornecedor_id" defaultValue=""><option value="">Selecione, se houver</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Ou destinatário livre<Input className="w-full" name="destinatario_livre" maxLength={160} placeholder="Nome de quem receberá" /></label><Button type="submit">Definir destinatário</Button></form> : null}{item.status === "aguardando_aprovacao_financeira" ? <form action={approveBudgetAsExpense} className="border-t pt-4"><input type="hidden" name="orcamento_id" value={item.id} /><Button type="submit">Aprovar como despesa</Button></form> : null}</CardContent></Card>)}</div>}
  </RegisterPageShell>;
}
