import { redirect } from "next/navigation";

import { getWorkspaceProfile } from "@/lib/project-access";

export const dynamic = "force-dynamic";

// A rota histórica não exibe dados misturados. O acesso operacional acontece
// sempre pelo dashboard de um projeto selecionado.
export default async function DashboardPage() {
  const profile = await getWorkspaceProfile();
  redirect(profile.role === "admin" ? "/admin/resumo-geral" : "/selecionar-projeto");
}
