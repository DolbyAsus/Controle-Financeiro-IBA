import { Users } from "lucide-react";
import Link from "next/link";

import { manageUserProfile } from "@/lib/actions/base-registers";
import {
  Pagination,
  databasePage,
  paginationRange,
} from "@/components/modules/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
const roleLabel: Record<string, string> = {
  admin: "Administrador geral",
  financeiro: "Financeiro",
  aprovador: "Aprovador",
  visualizador: "Visualizador",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ mensagem?: string; erro?: string; pagina?: string }>;
}) {
  const query = await searchParams;
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const { data: claims } = supabase
    ? await supabase.auth.getClaims()
    : { data: null };
  const userId = claims?.claims?.sub;
  const { data: profile } =
    supabase && userId
      ? await supabase
          .from("users_profile")
          .select("role")
          .eq("id", userId)
          .maybeSingle()
      : { data: null };
  if (isSupabaseConfigured() && profile?.role !== "admin")
    redirect("/selecionar-projeto");
  const pageRange = paginationRange(query.pagina);
  const usersResult = supabase
    ? await supabase
        .from("users_profile")
        .select("id, name, email, role, status", { count: "exact" })
        .order("name")
        .order("id")
        .range(pageRange.from, pageRange.to)
    : { data: [], count: 0 };
  const users = usersResult.data ?? [];
  const userPage = databasePage(users, usersResult.count, pageRange.page);
  const pageUserIds = userPage.items.map((user) => user.id);
  const membershipsResult =
    supabase && pageUserIds.length > 0
      ? await supabase
          .from("project_memberships")
          .select("project_id, user_id, role, status")
          .in("user_id", pageUserIds)
      : { data: [] };
  const projectIds = [
    ...new Set((membershipsResult.data ?? []).map((membership) => membership.project_id)),
  ];
  const projectsResult =
    supabase && projectIds.length > 0
      ? await supabase.from("projects").select("id, name").in("id", projectIds)
      : { data: [] };
  const projects = new Map((projectsResult.data ?? []).map((project) => [project.id, project]));
  const membershipsByUser = new Map<string, { project_id: string; role: string; status: string }[]>();
  (membershipsResult.data ?? []).forEach((membership) => {
    const entries = membershipsByUser.get(membership.user_id) ?? [];
    entries.push(membership);
    membershipsByUser.set(membership.user_id, entries);
  });
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-primary">Acessos</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
        Usuários globais
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie os perfis globais e consulte os vínculos de cada pessoa nos
          projetos. A concessão de acesso é feita dentro da equipe de cada projeto.
        </p>
      </section>
      {query.mensagem ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          {query.mensagem}
        </p>
      ) : null}
      {query.erro ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {query.erro}
        </p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            Perfis e acessos por projeto
          </CardTitle>
          <CardDescription>
            {userPage.count} usuários no escopo desta igreja. Administrador geral
            pode administrar todos os projetos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {userPage.count === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Nenhum usuário encontrado.
            </p>
          ) : (
            <>
              {userPage.items.map((user) => {
                const memberships = membershipsByUser.get(user.id) ?? [];
                return <form
                  key={user.id}
                  action={manageUserProfile}
                  className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(0,1fr)_180px_140px_auto] lg:items-end"
                >
                  <input name="usuario_id" type="hidden" value={user.id} />
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                    <div className="mt-2 flex max-h-24 flex-wrap gap-1 overflow-y-auto pr-1" aria-label={`Acessos de ${user.name}`}>
                      {memberships.length === 0 ? <span className="text-xs text-muted-foreground">Sem acesso a projeto.</span> : memberships.map((membership) => {
                        const project = projects.get(membership.project_id);
                        if (!project) return null;
                        return <Link key={membership.project_id} href={`/projetos/${membership.project_id}/usuarios`} className="inline-flex rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/75">
                          {project.name} · {roleLabel[membership.role] ?? membership.role}{membership.status !== "ativo" ? " (inativo)" : ""}
                        </Link>;
                      })}
                    </div>
                  </div>
                  <label className="grid gap-1 text-sm font-medium">
                    Função
                    <select
                      className="h-9 rounded-lg border border-input bg-background px-3"
                      name="funcao"
                      defaultValue={user.role}
                    >
                      {Object.entries(roleLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-medium">
                    Status
                    <select
                      className="h-9 rounded-lg border border-input bg-background px-3"
                      name="status"
                      defaultValue={user.status}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{roleLabel[user.role]}</Badge>
                    <Button type="submit">Salvar</Button>
                  </div>
                </form>
              })}
              <Pagination
                page={userPage.page}
                totalPages={userPage.totalPages}
                label="usuários"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
