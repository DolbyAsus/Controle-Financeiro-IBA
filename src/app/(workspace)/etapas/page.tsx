import { ClipboardList } from "lucide-react";

import { createStage } from "@/lib/actions/base-registers";
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

export default async function StagesPage({ searchParams }: { searchParams: Promise<{ mensagem?: string; erro?: string }> }) {
  const query = await searchParams;
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const projects = supabase ? (await supabase.from("projects").select("id, name").order("name")).data ?? [] : [];
  const stages = supabase ? (await supabase.from("project_stages").select("id, name, code, sort_order, planned_budget, status, projects(name)").order("sort_order")).data ?? [] : [];
  return <RegisterPageShell title="Etapas" description="Defina etapas, prazo e orçamento planejado para cada projeto." icon={ClipboardList} message={query.mensagem} error={query.erro} form={
    <form action={createStage} className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-medium">Projeto *<select className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="projeto_id" required defaultValue=""><option disabled value="">Selecione</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-medium">Nome da etapa *<Input className="w-full" name="nome" required maxLength={120} placeholder="Ex.: Fundação" /></label>
      <label className="grid gap-1.5 text-sm font-medium">Código<Input className="w-full" name="codigo" maxLength={30} placeholder="ET-01" /></label>
      <label className="grid gap-1.5 text-sm font-medium">Ordem<input className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="ordem" min="0" type="number" placeholder="Automática" /></label>
      <label className="grid gap-1.5 text-sm font-medium">Orçamento planejado<input className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="orcamento_planejado" min="0" step="0.01" type="number" defaultValue="0" /></label>
      <label className="grid gap-1.5 text-sm font-medium">Status *<select className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="status" defaultValue="ativo"><option value="ativo">Ativa</option><option value="inativo">Inativa</option></select></label>
      <label className="grid gap-1.5 text-sm font-medium">Previsão de início<input className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="previsao_inicio" type="date" /></label>
      <label className="grid gap-1.5 text-sm font-medium">Previsão de término<input className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="previsao_termino" type="date" /></label>
      <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Descrição<textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="descricao" maxLength={1000} /></label>
      <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Observações<textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="observacoes" maxLength={2000} /></label>
      <div className="md:col-span-2"><Button type="submit" disabled={projects.length === 0}>Salvar etapa</Button>{projects.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">Cadastre um projeto antes de incluir etapas.</p> : null}</div>
    </form>
  }>
    <Card><CardHeader><CardTitle>Etapas cadastradas</CardTitle><CardDescription>{stages.length} etapas disponíveis.</CardDescription></CardHeader><CardContent>{stages.length === 0 ? <p className="py-6 text-sm text-muted-foreground">Nenhuma etapa cadastrada ainda.</p> : <><div className="grid gap-3 md:hidden">{stages.map((stage) => <article key={stage.id} className="rounded-lg border p-3"><div className="flex justify-between gap-2"><strong>{stage.name}</strong><Badge variant="secondary">{stage.status}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{stage.projects?.[0]?.name || "Projeto"} · {money.format(Number(stage.planned_budget))}</p></article>)}</div><div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Etapa</TableHead><TableHead>Projeto</TableHead><TableHead>Ordem</TableHead><TableHead>Planejado</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{stages.map((stage) => <TableRow key={stage.id}><TableCell className="font-medium">{stage.code ? `${stage.code} · ` : ""}{stage.name}</TableCell><TableCell>{stage.projects?.[0]?.name || "—"}</TableCell><TableCell>{stage.sort_order}</TableCell><TableCell>{money.format(Number(stage.planned_budget))}</TableCell><TableCell><Badge variant="secondary">{stage.status}</Badge></TableCell></TableRow>)}</TableBody></Table></div></>}</CardContent></Card>
  </RegisterPageShell>;
}
