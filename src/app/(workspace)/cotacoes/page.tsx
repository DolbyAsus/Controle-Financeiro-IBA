import { ReceiptText } from "lucide-react";

import { createQuotation } from "@/lib/actions/base-registers";
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
const statusLabel: Record<string, string> = { recebida: "Recebida", em_analise: "Em análise", aprovada_para_orcamento: "Aprovada", nao_selecionada: "Não selecionada", cancelada: "Cancelada", vencida: "Vencida" };

export default async function QuotationsPage({ searchParams }: { searchParams: Promise<{ mensagem?: string; erro?: string }> }) {
  const query = await searchParams;
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const projects = supabase ? (await supabase.from("projects").select("id, name").order("name")).data ?? [] : [];
  const stages = supabase ? (await supabase.from("project_stages").select("id, name, projects(name)").eq("status", "ativo").order("sort_order")).data ?? [] : [];
  const categories = supabase ? (await supabase.from("categories").select("id, name, projects(name)").eq("status", "ativo").order("name")).data ?? [] : [];
  const suppliers = supabase ? (await supabase.from("suppliers").select("id, name").eq("status", "ativo").order("name")).data ?? [] : [];
  const quotations = supabase ? (await supabase.from("quotations").select("id, title, proponent_name, total_value, quotation_date, status, projects(name), project_stages(name), categories(name)").order("created_at", { ascending: false })).data ?? [] : [];
  const dependsOnBaseRecords = projects.length === 0 || stages.length === 0 || categories.length === 0;

  return <RegisterPageShell title="Cotações" description="Registre propostas. Projeto, etapa e categoria são obrigatórios; fornecedor pode ser informado depois." icon={ReceiptText} message={query.mensagem} error={query.erro} form={
    <form action={createQuotation} className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-medium">Projeto *<select className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="projeto_id" required defaultValue=""><option disabled value="">Selecione</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-medium">Etapa *<select className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="etapa_id" required defaultValue=""><option disabled value="">Selecione</option>{stages.map((item) => <option key={item.id} value={item.id}>{item.name}{item.projects?.[0]?.name ? ` · ${item.projects[0].name}` : ""}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-medium">Categoria *<select className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="categoria_id" required defaultValue=""><option disabled value="">Selecione</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}{item.projects?.[0]?.name ? ` · ${item.projects[0].name}` : ""}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-medium">Fornecedor<select className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="fornecedor_id" defaultValue=""><option value="">Ainda não cadastrado</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Título da cotação *<Input className="w-full" name="titulo" required maxLength={160} placeholder="Ex.: Estrutura metálica para cobertura" /></label>
      <label className="grid gap-1.5 text-sm font-medium">Proponente/fornecedor *<Input className="w-full" name="proponente" required maxLength={160} placeholder="Nome informado na proposta" /></label>
      <label className="grid gap-1.5 text-sm font-medium">Valor total *<input className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="valor_total" required min="0.01" step="0.01" type="number" /></label>
      <label className="grid gap-1.5 text-sm font-medium">Telefone do proponente<Input className="w-full" name="telefone" type="tel" maxLength={30} /></label>
      <label className="grid gap-1.5 text-sm font-medium">E-mail do proponente<Input className="w-full" name="email" type="email" maxLength={160} /></label>
      <label className="grid gap-1.5 text-sm font-medium">Data da cotação<input className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="data_cotacao" type="date" /></label>
      <label className="grid gap-1.5 text-sm font-medium">Validade da proposta<input className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="validade_proposta" type="date" /></label>
      <label className="grid gap-1.5 text-sm font-medium">Prazo de execução<Input className="w-full" name="prazo_execucao" maxLength={160} placeholder="Ex.: 30 dias" /></label>
      <label className="grid gap-1.5 text-sm font-medium">Forma de pagamento<Input className="w-full" name="forma_pagamento" maxLength={160} /></label>
      <label className="grid gap-1.5 text-sm font-medium">Condições de pagamento<Input className="w-full" name="condicoes_pagamento" maxLength={500} /></label>
      <label className="grid gap-1.5 text-sm font-medium">Status *<select className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="status" defaultValue="recebida"><option value="recebida">Recebida</option><option value="em_analise">Em análise</option></select></label>
      <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Escopo incluso<textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="escopo_incluso" maxLength={2000} /></label>
      <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Escopo excluído<textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="escopo_excluso" maxLength={2000} /></label>
      <label className="grid gap-1.5 text-sm font-medium">Garantia<Input className="w-full" name="garantia" maxLength={500} /></label>
      <label className="grid gap-1.5 text-sm font-medium">Link do documento no Drive<Input className="w-full" name="link_drive" type="url" maxLength={1000} placeholder="https://drive.google.com/..." /></label>
      <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Descrição/observações<textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="descricao" maxLength={2000} /></label>
      <input name="observacoes" type="hidden" value="" />
      <div className="md:col-span-2"><Button type="submit" disabled={dependsOnBaseRecords}>Salvar cotação</Button>{dependsOnBaseRecords ? <p className="mt-2 text-xs text-muted-foreground">Crie ao menos um projeto, uma etapa e uma categoria antes de cadastrar cotações.</p> : null}</div>
    </form>
  }>
    <Card><CardHeader><CardTitle>Cotações registradas</CardTitle><CardDescription>{quotations.length} propostas disponíveis para comparação.</CardDescription></CardHeader><CardContent>{quotations.length === 0 ? <p className="py-6 text-sm text-muted-foreground">Nenhuma cotação cadastrada ainda.</p> : <><div className="grid gap-3 md:hidden">{quotations.map((item) => <article key={item.id} className="rounded-lg border p-3"><div className="flex justify-between gap-2"><strong>{item.title}</strong><Badge variant="secondary">{statusLabel[item.status]}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{item.proponent_name} · {money.format(Number(item.total_value))}</p></article>)}</div><div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Cotação</TableHead><TableHead>Projeto</TableHead><TableHead>Etapa</TableHead><TableHead>Proponente</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{quotations.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.title}</TableCell><TableCell>{item.projects?.[0]?.name || "—"}</TableCell><TableCell>{item.project_stages?.[0]?.name || "—"}</TableCell><TableCell>{item.proponent_name}</TableCell><TableCell>{money.format(Number(item.total_value))}</TableCell><TableCell><Badge variant="secondary">{statusLabel[item.status]}</Badge></TableCell></TableRow>)}</TableBody></Table></div></>}</CardContent></Card>
  </RegisterPageShell>;
}
