import { History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const actionLabel: Record<string, string> = { insert: "Criado", update: "Atualizado", delete: "Excluído" };

export default async function HistoryPage() {
  const logs = isSupabaseConfigured() ? (await (await createClient()).from("audit_logs").select("id, action, entity_type, created_at, projects(name), users_profile(name, email)").order("created_at", { ascending: false }).limit(100)).data ?? [] : [];
  return <div className="space-y-6"><section><p className="text-sm font-medium text-primary">Rastreabilidade</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Histórico de auditoria</h1><p className="mt-1 text-sm text-muted-foreground">As ações importantes são registradas automaticamente pelo banco de dados.</p></section><Card><CardHeader><CardTitle className="flex items-center gap-2"><History className="size-5 text-primary" />Últimas ações</CardTitle><CardDescription>Mostrando até 100 eventos mais recentes.</CardDescription></CardHeader><CardContent>{logs.length === 0 ? <p className="py-6 text-sm text-muted-foreground">Ainda não há ações registradas.</p> : <div className="space-y-2">{logs.map((item) => <article key={item.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{actionLabel[item.action] || item.action} em {item.entity_type}</p><p className="text-xs text-muted-foreground">{item.users_profile?.[0]?.name || item.users_profile?.[0]?.email || "Sistema"}{item.projects?.[0]?.name ? ` · ${item.projects[0].name}` : ""}</p></div><Badge variant="secondary">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(item.created_at))}</Badge></article>)}</div>}</CardContent></Card></div>;
}
