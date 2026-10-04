import { BanknoteArrowDown } from "lucide-react";

import { registerPayment } from "@/lib/actions/base-registers";
import { RegisterPageShell } from "@/components/modules/register-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ mensagem?: string; erro?: string }> }) {
  const query = await searchParams;
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const expenses = supabase ? (await supabase.from("expenses").select("id, description, remaining_value, status").in("status", ["aprovada", "parcialmente_paga"]).order("created_at", { ascending: false })).data ?? [] : [];
  const payments = supabase ? (await supabase.from("payments").select("id, amount, payment_date, payment_method, expenses(description), projects(name)").order("payment_date", { ascending: false })).data ?? [] : [];
  return <RegisterPageShell title="Pagamentos" description="Registre pagamentos parciais. O saldo e o status da despesa são atualizados pelo banco." icon={BanknoteArrowDown} message={query.mensagem} error={query.erro} form={
    <form action={registerPayment} className="grid gap-4 md:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium md:col-span-2">Despesa *<select className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="despesa_id" required defaultValue=""><option disabled value="">Selecione a despesa</option>{expenses.map((item) => <option key={item.id} value={item.id}>{item.description} · saldo {money.format(Number(item.remaining_value))}</option>)}</select></label><label className="grid gap-1.5 text-sm font-medium">Valor *<input className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="valor" required min="0.01" step="0.01" type="number" /></label><label className="grid gap-1.5 text-sm font-medium">Data *<input className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="data_pagamento" required type="date" /></label><label className="grid gap-1.5 text-sm font-medium">Forma de pagamento<Input className="w-full" name="forma_pagamento" maxLength={160} placeholder="PIX, transferência..." /></label><label className="grid gap-1.5 text-sm font-medium">Link do comprovante no Drive<Input className="w-full" name="link_comprovante" type="url" maxLength={1000} /></label><label className="grid gap-1.5 text-sm font-medium md:col-span-2">Observações<textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="observacoes" maxLength={2000} /></label><div className="md:col-span-2"><Button type="submit" disabled={expenses.length === 0}>Registrar pagamento</Button>{expenses.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">Não há despesas abertas para pagamento.</p> : null}</div></form>
  }>
    <Card><CardHeader><CardTitle>Pagamentos registrados</CardTitle><CardDescription>{payments.length} pagamentos no histórico.</CardDescription></CardHeader><CardContent>{payments.length === 0 ? <p className="py-6 text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p> : <><div className="grid gap-3 md:hidden">{payments.map((item) => <article key={item.id} className="rounded-lg border p-3"><strong>{item.expenses?.[0]?.description || "Despesa"}</strong><p className="mt-2 text-sm text-muted-foreground">{money.format(Number(item.amount))} · {item.payment_date}</p></article>)}</div><div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Despesa</TableHead><TableHead>Projeto</TableHead><TableHead>Data</TableHead><TableHead>Forma</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader><TableBody>{payments.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.expenses?.[0]?.description || "—"}</TableCell><TableCell>{item.projects?.[0]?.name || "—"}</TableCell><TableCell>{new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${item.payment_date}T00:00:00Z`))}</TableCell><TableCell><Badge variant="secondary">{item.payment_method || "—"}</Badge></TableCell><TableCell>{money.format(Number(item.amount))}</TableCell></TableRow>)}</TableBody></Table></div></>}</CardContent></Card>
  </RegisterPageShell>;
}
