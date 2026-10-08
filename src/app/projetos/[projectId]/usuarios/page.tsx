import { Users } from "lucide-react";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  databasePage,
  paginationRange,
} from "@/components/modules/pagination";
import { ProjectUserAccessDialog, type ProjectUserAccess } from "@/components/users/project-user-access-dialog";
import { getProjectWorkspaceAccess } from "@/lib/project-access";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const roleLabel: Record<ProjectUserAccess["role"], string> = {
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
  searchParams: Promise<{ mensagem?: string; erro?: string; pagina?: string }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const access = await getProjectWorkspaceAccess(projectId);
  if (!access || access.projectRole !== "admin") {
    redirect(`/projetos/${projectId}/dashboard`);
  }

  const isGlobalAdmin = access.profile.role === "admin";
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const pageRange = paginationRange(query.pagina);
  const memberCountResult = supabase
    ? await supabase
        .from("project_memberships")
        .select("user_id", { count: "exact", head: true })
        .eq("project_id", projectId)
    : { count: 0 };
  const visibleMembers = memberCountResult.count ?? 0;
  type ProjectUser = {
    id: string;
    name: string;
    email: string;
    status: "ativo" | "inativo";
  };
  let users: ProjectUser[] = [];
  let membershipRows: (ProjectUserAccess & { user_id: string })[] = [];
  let totalUsers = 0;

  if (supabase && isGlobalAdmin) {
    const usersResult = await supabase
      .from("users_profile")
      .select("id, name, email, status", { count: "exact" })
      .order("name")
      .order("id")
      .range(pageRange.from, pageRange.to);
    users = (usersResult.data ?? []) as ProjectUser[];
    totalUsers = usersResult.count ?? 0;
    const pageUserIds = users.map((user) => user.id);
    if (pageUserIds.length > 0) {
      const membershipsResult = await supabase
        .from("project_memberships")
        .select("user_id, role, status")
        .eq("project_id", projectId)
        .in("user_id", pageUserIds);
      membershipRows = (membershipsResult.data ?? []) as (ProjectUserAccess & {
        user_id: string;
      })[];
    }
  } else if (supabase) {
    const usersResult = await supabase
      .from("users_profile")
      .select(
        "id, name, email, status, project_memberships!inner(user_id, role, status)",
        { count: "exact" },
      )
      .eq("project_memberships.project_id", projectId)
      .order("name")
      .order("id")
      .range(pageRange.from, pageRange.to);
    totalUsers = usersResult.count ?? 0;
    (usersResult.data ?? []).forEach((row) => {
      users.push({
        id: row.id,
        name: row.name,
        email: row.email,
        status: row.status as ProjectUser["status"],
      });
      membershipRows.push(
        ...(row.project_memberships as (ProjectUserAccess & { user_id: string })[]),
      );
    });
  }

  const memberships = new Map(
    membershipRows.map((membership) => [membership.user_id, membership]),
  );
  const userPage = databasePage(users, totalUsers, pageRange.page);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-primary">Acessos do projeto</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Equipe do projeto
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {isGlobalAdmin
            ? "Como Administrador geral, você pode conceder, editar e inativar acessos deste projeto."
            : "Como Administrador do projeto, você pode editar somente os acessos já vinculados a esta equipe."}
        </p>
      </section>

      {query.mensagem ? (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {query.mensagem}
        </p>
      ) : null}
      {query.erro ? (
        <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {query.erro}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" aria-hidden="true" />
            Usuários e permissões
          </CardTitle>
          <CardDescription>
            {isGlobalAdmin
              ? `${userPage.count} usuários cadastrados na igreja. ${visibleMembers} já estão vinculados a este projeto.`
              : `${visibleMembers} usuários vinculados a este projeto. A inclusão de novos usuários é feita pelo Administrador geral.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {userPage.count === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              {isGlobalAdmin
                ? "Nenhum usuário está disponível para vincular. Crie ou convide a pessoa no Supabase e ela aparecerá aqui."
                : "Não há usuários vinculados a este projeto."}
            </p>
          ) : (
            <>
              <ul className="space-y-3" aria-label="Usuários do projeto">
                {userPage.items.map((user) => {
                  const membership = memberships.get(user.id);
                  return (
                    <li
                      key={user.id}
                      className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-words font-medium">{user.name}</p>
                          {user.status !== "ativo" ? <Badge variant="destructive">Perfil inativo</Badge> : null}
                        </div>
                        <p className="break-all text-sm text-muted-foreground">{user.email}</p>
                        {membership ? (
                          <Badge className="mt-2" variant={membership.status === "ativo" ? "secondary" : "outline"}>
                            {roleLabel[membership.role]} · {membership.status}
                          </Badge>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">Sem acesso a este projeto.</p>
                        )}
                      </div>
                      <ProjectUserAccessDialog
                        user={user}
                        membership={membership}
                        projectId={projectId}
                        projectName={access.project.name}
                        canAdd={isGlobalAdmin}
                      />
                    </li>
                  );
                })}
              </ul>
              <Pagination page={userPage.page} totalPages={userPage.totalPages} label="usuários do projeto" />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
