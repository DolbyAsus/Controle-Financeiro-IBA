import { Scale } from "lucide-react";

import { approveQuotation } from "@/lib/actions/base-registers";
import { RegisterPageShell } from "@/components/modules/register-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const statusLabel: Record<string, string> = { recebida: "Recebida", em_analise: "Em análise", aprovada_para_orcamento: "Aprovada" };

export default async function CompareQuotationsPage({ searchParams }: { searchParams: Promise<{ mensagem?: string; erro?: string; projeto?: string; etapa?: string; categoria?: string }> }) {
  const query = await searchParams; const supabase = isSupabaseConfigured() ? await createClient() : null;
  const [projectsResult, stagesResult, categoriesResult, quotationsResult] = supabase ? await Promise.all([
    supabase.from("projects").select("id, name").order("name"),
    supabase.from("project_stages").select("id, name, project_id").eq("status", "ativo").order("sort_order"),
    supabase.from("categories").select("id, name, project_id").eq("status", "ativo").order("name"),
    supabase.from("quotations").select("id, project_id, stage_id, category_id, title, proponent_name, total_value, execution_deadline, quotation_date, proposal_valid_until, payment_method, payment_terms, included_scope, excluded_scope, warranty, drive_document_url, status, projects(name), project_stages(name), categories(name)").in("status", ["recebida", "em_analise", "aprovada_para_orcamento"]).order("created_at", { ascending: false }),
  ]) : [null, null, null, null];
  const projects = projectsResult?.data ?? []; const stages = stagesResult?.data ?? []; const categories = categoriesResult?.data ?? [];
  const projectId = projects.some((item) => item.id === query.projeto) ? query.projeto! : "";
  const visibleStages = projectId ? stages.filter((item) => item.project_id === projectId) : stages;
  const visibleCategories = projectId ? categories.filter((item) => item.project_id === projectId) : categories;
  const stageId = visibleStages.some((item) => item.id === query.etapa) ? query.etapa! : "";
  const categoryId = visibleCategories.some((item) => item.id === query.categoria) ? query.categoria! : "";
  const quotations = (quotationsResult?.data ?? []).filter((item) => (!projectId || item.project_id === projectId) && (!stageId || item.stage_id === stageId) && (!categoryId || item.category_id === categoryId));
  const filter = <form aria-label="Filtros de comparação" className="grid gap-3 md:grid-cols-3"><label className="grid gap-1.5 text-sm font-medium">Projeto<select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="projeto" defaultValue={projectId}><option value="">Todos os projetos</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="grid gap-1.5 text-sm font-medium">Etapa<select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="etapa" defaultValue={stageId}><option value="">Todas as etapas</option>{visibleStages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="grid gap-1.5 text-sm font-medium">Categoria<select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="categoria" defaultValue={categoryId}><option value="">Todas as categorias</option>{visibleCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="md:col-span-3"><Button type="submit">Filtrar cotações</Button></div></form>;
  return <RegisterPageShell title="Comparar cotações" description="Consulte os dados lado a lado. O sistema não recomenda uma opção: a decisão é da comissão." icon={Scale} message={query.mensagem} error={query.erro} form={filter}>{quotations.length === 0 ? <Card><CardContent className="py-10 text-sm text-muted-foreground">Não há cotações em análise para os filtros selecionados.</CardContent></Card> : <div className="grid gap-4 xl:grid-cols-2">{quotations.map((item) => <Card key={item.id}><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>{item.title}</CardTitle><CardDescription>{item.projects?.[0]?.name || "Projeto"} · {item.project_stages?.[0]?.name || "Etapa"} · {item.categories?.[0]?.name || "Categoria"}</CardDescription></div><Badge variant="secondary">{statusLabel[item.status] || item.status}</Badge></div></CardHeader><CardContent className="space-y-4"><dl className="grid gap-3 text-sm sm:grid-cols-2"><Field label="Proponente" value={item.proponent_name} strong /><Field label="Valor total" value={money.format(Number(item.total_value))} strong /><Field label="Prazo" value={item.execution_deadline} /><Field label="Pagamento" value={item.payment_method} /><Field label="Condições" value={item.payment_terms} /><Field label="Garantia" value={item.warranty} /></dl><div className="space-y-2 text-sm"><p><span className="font-medium">Escopo incluso: </span>{item.included_scope || "Não informado"}</p><p><span className="font-medium">Escopo excluído: </span>{item.excluded_scope || "Não informado"}</p>{item.drive_document_url ? <a className="text-primary underline underline-offset-4" href={item.drive_document_url} target="_blank" rel="noreferrer">Abrir documento no Drive</a> : null}</div>{item.status !== "aprovada_para_orcamento" ? <form action={approveQuotation} className="space-y-2 border-t pt-4"><input name="cotacao_id" type="hidden" value={item.id} /><label className="grid gap-1.5 text-sm font-medium">Justificativa da escolha *<textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="justificativa" required maxLength={2000} placeholder="Registre os critérios humanos que fundamentam a escolha." /></label><Button type="submit">Aprovar e gerar orçamento</Button></form> : <p className="rounded-lg bg-muted px-3 py-2 text-sm">Esta cotação já gerou um orçamento.</p>}</CardContent></Card>)}</div>}</RegisterPageShell>;
}

function Field({ label, value, strong = false }: { label: string; value?: string | null; strong?: boolean }) { return <div><dt className="text-muted-foreground">{label}</dt><dd className={strong ? "font-medium" : undefined}>{value || "Não informado"}</dd></div>; }
