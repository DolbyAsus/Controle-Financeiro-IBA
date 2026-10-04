import { CreditCard } from "lucide-react";

import { RegisterPageShell } from "@/components/modules/register-page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const label: Record<string, string> = { aprovada: "Aprovada", parcialmente_paga: "Parcialmente paga", paga: "Paga", cancelada: "Cancelada" };

export default async function ExpensesPage() {
  const expenses = isSupabaseConfigured() ? (await (await createClient()).from("expenses").select("id, description, approved_value, paid_value, remaining_value, status, expected_date, free_recipient, projects(name), suppliers(name)").order("created_at", { ascending: false })).data ?? [] : [];
  return <RegisterPageShell title="Despesas" description="Compromissos criados exclusivamente a partir de orçamentos aprovados." icon={CreditCard} form={<p className="text-sm text-muted-foreground">Para criar uma despesa, conclua a aprovação financeira no módulo de Orçamentos.</p>}>
    <Card><CardHeader><CardTitle>Despesas aprovadas</CardTitle><CardDescription>{expenses.length} despesas registradas.</CardDescription></CardHeader><CardContent>{expenses.length === 0 ? <p className="py-6 text-sm text-muted-foreground">Nenhuma despesa aprovada ainda.</p> : <><div className="grid gap-3 md:hidden">{expenses.map((item) => <article key={item.id} className="rounded-lg border p-3"><div className="flex justify-between gap-2"><strong>{item.description}</strong><Badge variant="secondary">{label[item.status]}</Badge></div><p className="mt-2 text-sm text-muted-foreground">Saldo: {money.format(Number(item.remaining_value))} de {money.format(Number(item.approved_value))}</p></article>)}</div><div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Despesa</TableHead><TableHead>Destinatário</TableHead><TableHead>Aprovado</TableHead><TableHead>Pago</TableHead><TableHead>Saldo</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{expenses.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.description}</TableCell><TableCell>{item.suppliers?.[0]?.name || item.free_recipient || "—"}</TableCell><TableCell>{money.format(Number(item.approved_value))}</TableCell><TableCell>{money.format(Number(item.paid_value))}</TableCell><TableCell>{money.format(Number(item.remaining_value))}</TableCell><TableCell><Badge variant="secondary">{label[item.status]}</Badge></TableCell></TableRow>)}</TableBody></Table></div></>}</CardContent></Card>
  </RegisterPageShell>;
}
