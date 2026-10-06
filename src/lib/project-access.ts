import { redirect } from "next/navigation";

import type { UserRole } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export type WorkspaceProfile = {
  id: string;
  email: string;
  role: UserRole;
  status: "ativo" | "inativo";
};

export type AccessibleProject = {
  id: string;
  name: string;
  description: string | null;
  project_type: string | null;
  status: string;
};

export type ProjectWorkspaceAccess = {
  project: AccessibleProject;
  profile: WorkspaceProfile;
  projectRole: UserRole;
};

export async function getWorkspaceProfile(): Promise<WorkspaceProfile> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) redirect("/login");

  const { data: profile } = await supabase
    .from("users_profile")
    .select("id, email, role, status")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || profile.status !== "ativo") redirect("/login");
  return profile as WorkspaceProfile;
}

export async function getAccessibleProjects(): Promise<AccessibleProject[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description, project_type, status")
    .order("name");
  if (error) return [];
  return (data ?? []) as AccessibleProject[];
}

export async function getAccessibleProject(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, name, description, project_type, status")
    .eq("id", projectId)
    .maybeSingle();
  return data as AccessibleProject | null;
}

export async function getProjectWorkspaceAccess(
  projectId: string,
): Promise<ProjectWorkspaceAccess | null> {
  const [profile, project] = await Promise.all([
    getWorkspaceProfile(),
    getAccessibleProject(projectId),
  ]);
  if (!project) return null;
  if (profile.role === "admin") {
    return { project, profile, projectRole: "admin" };
  }

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("project_memberships")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", profile.id)
    .eq("status", "ativo")
    .maybeSingle();
  if (!membership) return null;

  return {
    project,
    profile,
    projectRole: membership.role as UserRole,
  };
}
