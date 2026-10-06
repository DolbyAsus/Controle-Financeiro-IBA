import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getAccessibleProject, getWorkspaceProfile } from "@/lib/project-access";

export const dynamic = "force-dynamic";

export default async function ProjectWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [profile, project] = await Promise.all([
    getWorkspaceProfile(),
    getAccessibleProject(projectId),
  ]);

  if (!project) redirect("/selecionar-projeto?erro=projeto-nao-disponivel");

  return (
    <AppShell
      userEmail={profile.email}
      role={profile.role}
      activeProject={{ id: project.id, name: project.name }}
    >
      {children}
    </AppShell>
  );
}
