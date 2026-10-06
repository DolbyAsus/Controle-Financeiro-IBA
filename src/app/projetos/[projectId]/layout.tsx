import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getOperationalNotifications } from "@/lib/notifications";
import { getProjectWorkspaceAccess } from "@/lib/project-access";

export const dynamic = "force-dynamic";

export default async function ProjectWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const access = await getProjectWorkspaceAccess(projectId);
  if (!access) redirect("/selecionar-projeto?erro=projeto-nao-disponivel");
  const notifications = await getOperationalNotifications(access.projectRole, projectId);

  return (
    <AppShell
      userEmail={access.profile.email}
      role={access.projectRole}
      isGlobalAdmin={access.profile.role === "admin"}
      notificationCount={notifications.length}
      notificationHref={`/projetos/${projectId}/notificacoes`}
      activeProject={{ id: access.project.id, name: access.project.name }}
    >
      {children}
    </AppShell>
  );
}
