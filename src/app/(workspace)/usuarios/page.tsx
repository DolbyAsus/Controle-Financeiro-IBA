import { Users } from "lucide-react";

import { manageUserProfile } from "@/lib/actions/base-registers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const roleLabel: Record<string, string> = { admin: "Administrador", financeiro: "Financeiro", aprovador: "Aprovador", visualizador: "Visualizador" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ mensagem?: string; erro?: string }> }) {
  const query = await searchParams;
  const users = isSupabaseConfigured() ? (await (await createClient()).from("users_profile").select("id, name, email, role, status").order("name")).data ?? [] : [];
  return <div className="space-y-6"><section><p className="text-sm font-medium text-primary">Acessos</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Usuários</h1><p className="mt-1 text-sm text-muted-foreground">Convites são enviados pelo Supabase. Aqui, Administradores atualizam funções e status da igreja.</p></section>{query.mensagem ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{query.mensagem}</p> : null}{query.erro ? <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{query.erro}</p> : null}<Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5 text-primary" />Perfis cadastrados</CardTitle><CardDescription>{users.length} usuários no escopo desta igreja.</CardDescription></CardHeader><CardContent className="space-y-3">{users.length === 0 ? <p className="py-6 text-sm text-muted-foreground">Nenhum usuário encontrado.</p> : users.map((user) => <form key={user.id} action={manageUserProfile} className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(0,1fr)_180px_140px_auto] lg:items-end"><input name="usuario_id" type="hidden" value={user.id} /><div><p className="font-medium">{user.name}</p><p className="text-sm text-muted-foreground">{user.email}</p></div><label className="grid gap-1 text-sm font-medium">Função<select className="h-9 rounded-lg border border-input bg-background px-3" name="funcao" defaultValue={user.role}>{Object.entries(roleLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Status<select className="h-9 rounded-lg border border-input bg-background px-3" name="status" defaultValue={user.status}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></label><div className="flex items-center gap-2"><Badge variant="secondary">{roleLabel[user.role]}</Badge><Button type="submit">Salvar</Button></div></form>)}</CardContent></Card></div>;
}
