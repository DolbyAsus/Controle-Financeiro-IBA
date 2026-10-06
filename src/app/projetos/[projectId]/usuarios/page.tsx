import { Users } from "lucide-react";
import { redirect } from "next/navigation";

import { manageProjectMembership } from "@/lib/actions/base-registers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectWorkspaceAccess } from "@/lib/project-access";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const roleLabel: Record<string, string> = {
  admin: "Administrador do projeto",
  financeiro: "Financeiro",
  aprovador: "Aprovador",
  visualizador: "Visualizador",
};

export default async function ProjectUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ mensagem?: string; erro?: string }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const access = await getProjectWorkspaceAccess(projectId);
  if (!access || access.profile.role !== "admin") redirect(`/projetos/${projectId}/dashboard`);

  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const [usersResult, membershipsResult] = supabase
    ? await Promise.all([
        supabase.from("users_profile").select("id, name, email, status").order("name"),
        supabase.from("project_memberships").select("user_id, role, status").eq("project_id", projectId),
      ])
    : [{ data: [] }, { data: [] }];
  const memberships = new Map((membershipsResult.data ?? []).map((membership) => [membership.user_id, membership]));
  const returnTo = `/projetos/${projectId}/usuarios`;

  return <div className="space-y-6">
    <section>
      <p className="text-sm font-medium text-primary">Acessos do projeto</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Equipe do projeto</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Associe usuários já cadastrados à equipe deste projeto. O cadastro global do usuário permanece separado da sua função dentro do projeto.</p>
    </section>
    {query.mensagem ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{query.mensagem}</p> : null}
    {query.erro ? <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{query.erro}</p> : null}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="size-5 text-primary" />Usuários cadastrados</CardTitle>
        <CardDescription>{usersResult.data?.length ?? 0} usuários disponíveis na igreja. Um vínculo inativo não permite abrir este projeto.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(usersResult.data ?? []).map((user) => {
          const membership = memberships.get(user.id);
          return <form key={user.id} action={manageProjectMembership} className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(0,1fr)_220px_140px_auto] lg:items-end">
            <input name="projeto_id" type="hidden" value={projectId} />
            <input name="usuario_id" type="hidden" value={user.id} />
            <input name="retorno" type="hidden" value={returnTo} />
            <div><p className="font-medium">{user.name}</p><p className="text-sm text-muted-foreground">{user.email}</p>{membership ? <Badge className="mt-2" variant="secondary">{roleLabel[membership.role]}</Badge> : <p className="mt-2 text-xs text-muted-foreground">Ainda não vinculado.</p>}</div>
            <label className="grid gap-1 text-sm font-medium">Função<select className="h-9 rounded-lg border border-input bg-background px-3" name="funcao_projeto" defaultValue={membership?.role ?? "visualizador"}>{Object.entries(roleLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="grid gap-1 text-sm font-medium">Status<select className="h-9 rounded-lg border border-input bg-background px-3" name="status" defaultValue={membership?.status ?? "ativo"}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></label>
            <Button type="submit">{membership ? "Atualizar" : "Vincular"}</Button>
          </form>;
        })}
        {(usersResult.data ?? []).length === 0 ? <p className="py-6 text-sm text-muted-foreground">Ainda não há outro usuário cadastrado. Após criar ou convidar a pessoa no Supabase, ela aparecerá aqui para ser vinculada.</p> : null}
      </CardContent>
    </Card>
  </div>;
}
