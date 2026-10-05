import Link from "next/link";
import { CreditCard } from "lucide-react";

import { cancelExpense, createManualExpense } from "@/lib/actions/base-registers";
import { RegisterPageShell } from "@/components/modules/register-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const label: Record<string, string> = { aprovada: "Aprovada", parcialmente_paga: "Parcialmente paga", paga: "Paga", cancelada: "Cancelada" };

function relatedName(relation: unknown) {
  const value = Array.isArray(relation) ? relation[0] : relation;
  if (!value || typeof value !== "object" || !("name" in value)) return null;
  return typeof value.name === "string" ? value.name : null;
}

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ mensagem?: string; erro?: string }> }) {
  const query = await searchParams;
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const [expensesResult, projectsResult, stagesResult, categoriesResult, suppliersResult] = supabase ? await Promise.all([
    supabase.from("expenses").select("id, description, approved_value, paid_value, remaining_value, status, free_recipient, projects(name), suppliers(name), payments(id)").order("created_at", { ascending: false }),
    supabase.from("projects").select("id, name").order("name"),
    supabase.from("project_stages").select("id, name, projects(name)").eq("status", "ativo").order("sort_order"),
    supabase.from("categories").select("id, name, type, projects(name)").eq("status", "ativo").in("type", ["saida", "ambos"]).order("name"),
    supabase.from("suppliers").select("id, name").eq("status", "ativo").order("name"),
  ]) : [null, null, null, null, null];
  const expenses = expensesResult?.data ?? [];
  const projects = projectsResult?.data ?? [];
  const stages = stagesResult?.data ?? [];
  const categories = categoriesResult?.data ?? [];
  const suppliers = suppliersResult?.data ?? [];
  const canPay = (status: string) => status === "aprovada" || status === "parcialmente_paga";
  const recipient = (item: typeof expenses[number]) => relatedName(item.suppliers) || item.free_recipient || "—";
  const dependsOnBaseRecords = projects.length === 0 || stages.length === 0 || categories.length === 0;

  return <RegisterPageShell title="Despesas" description="Registre despesas manualmente ou aprove um orçamento. Toda despesa exige um destinatário e pode receber pagamentos parciais." icon={CreditCard} message={query.mensagem} error={query.erro} form={
    <form action={createManualExpense} className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm md:col-span-2"><p className="font-medium">Nova despesa manual</p><p className="mt-1 text-muted-foreground">Use para compromissos que não passaram por cotação/orçamento. O registro continuará com histórico e poderá receber parcelas.</p></div>
      <label className="grid gap-1.5 text-sm font-medium">Projeto *<select className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="projeto_id" required defaultValue=""><option disabled value="">Selecione</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-medium">Etapa *<select className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="etapa_id" required defaultValue=""><option disabled value="">Selecione</option>{stages.map((item) => <option key={item.id} value={item.id}>{item.name}{relatedName(item.projects) ? ` · ${relatedName(item.projects)}` : ""}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-medium">Categoria de saída *<select className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="categoria_id" required defaultValue=""><option disabled value="">Selecione</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}{relatedName(item.projects) ? ` · ${relatedName(item.projects)}` : ""}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-medium">Fornecedor cadastrado<select className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="fornecedor_id" defaultValue=""><option value="">Selecione, se houver</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Ou destinatário livre<Input className="w-full" name="destinatario_livre" maxLength={160} placeholder="Preencha somente se não escolher um fornecedor cadastrado" /></label>
      <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Descrição da despesa *<Input className="w-full" name="descricao" required maxLength={2000} placeholder="Ex.: Compra emergencial de material elétrico" /></label>
      <label className="grid gap-1.5 text-sm font-medium">Valor aprovado *<input className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="valor" required min="0.01" step="0.01" type="number" /></label>
      <label className="grid gap-1.5 text-sm font-medium">Data prevista<input className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="data_prevista" type="date" /></label>
      <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Link do documento no Drive<Input className="w-full" name="link_drive" type="url" maxLength={1000} placeholder="https://drive.google.com/..." /></label>
      <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Observações<textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="observacoes" maxLength={2000} /></label>
      <div className="md:col-span-2"><Button type="submit" disabled={dependsOnBaseRecords}>Cadastrar despesa manual</Button>{dependsOnBaseRecords ? <p className="mt-2 text-xs text-muted-foreground">Crie ao menos um projeto, uma etapa e uma categoria de saída antes de cadastrar despesas.</p> : <p className="mt-2 text-xs text-muted-foreground">Informe somente um destinatário: fornecedor cadastrado ou nome livre.</p>}</div>
    </form>
  }>
    <Card><CardHeader><CardTitle>Despesas aprovadas</CardTitle><CardDescription>{expenses.length} despesas registradas. Registre parcelas diretamente na despesa aberta.</CardDescription></CardHeader><CardContent>{expenses.length === 0 ? <p className="py-6 text-sm text-muted-foreground">Nenhuma despesa aprovada ainda.</p> : <><div className="grid gap-3 md:hidden">{expenses.map((item) => <article key={item.id} className="rounded-lg border p-3"><div className="flex justify-between gap-2"><strong className="break-words">{item.description}</strong><Badge variant="secondary">{label[item.status]}</Badge></div><p className="mt-2 text-sm text-muted-foreground">Destinatário: {recipient(item)}</p><p className="mt-1 text-sm text-muted-foreground">Pago: {money.format(Number(item.paid_value))} · Saldo: {money.format(Number(item.remaining_value))}</p><p className="mt-1 text-xs text-muted-foreground">{item.payments?.length ?? 0} {(item.payments?.length ?? 0) === 1 ? "parcela registrada" : "parcelas registradas"}</p>{canPay(item.status) ? <Link className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-3`} href={`/pagamentos?despesa=${item.id}`}>Registrar parcela</Link> : null}</article>)}</div><div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Despesa</TableHead><TableHead>Destinatário</TableHead><TableHead>Aprovado</TableHead><TableHead>Pago</TableHead><TableHead>Saldo</TableHead><TableHead>Parcelas</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader><TableBody>{expenses.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.description}</TableCell><TableCell>{recipient(item)}</TableCell><TableCell>{money.format(Number(item.approved_value))}</TableCell><TableCell>{money.format(Number(item.paid_value))}</TableCell><TableCell>{money.format(Number(item.remaining_value))}</TableCell><TableCell>{item.payments?.length ?? 0}</TableCell><TableCell><Badge variant="secondary">{label[item.status]}</Badge></TableCell><TableCell className="text-right">{canPay(item.status) ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/pagamentos?despesa=${item.id}`}>Registrar parcela</Link> : <span className="text-xs text-muted-foreground">—</span>}</TableCell></TableRow>)}</TableBody></Table></div></>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Cancelar despesa</CardTitle><CardDescription>O cancelamento exige justificativa e fica registrado no histórico. Despesas com pagamentos só podem ser canceladas por Administrador.</CardDescription></CardHeader><CardContent className="grid gap-3">{expenses.filter((item) => item.status !== "cancelada" && item.status !== "paga").map((item) => <form key={item.id} action={cancelExpense} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(0,1fr)_minmax(260px,1fr)_auto] md:items-end"><input name="despesa_id" type="hidden" value={item.id} /><div><p className="font-medium">{item.description}</p><p className="text-sm text-muted-foreground">Para: {recipient(item)} · Saldo: {money.format(Number(item.remaining_value))}</p></div><label className="grid gap-1 text-sm">Justificativa<textarea className="min-h-9 rounded-lg border border-input bg-transparent p-2" name="justificativa" required maxLength={1000} /></label><Button type="submit" variant="destructive">Cancelar</Button></form>)}{expenses.every((item) => item.status === "cancelada" || item.status === "paga") ? <p className="text-sm text-muted-foreground">Não há despesas disponíveis para cancelamento.</p> : null}</CardContent></Card>
  </RegisterPageShell>;
}
