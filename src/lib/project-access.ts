import { redirect } from "next/navigation";

import {
  databasePage,
  paginationRange,
} from "@/components/modules/pagination";
import type { UserRole } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export type WorkspaceProfile = {
  id: string;
  email: string;
  churchId: string;
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
    .select("id, email, church_id, role, status")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || profile.status !== "ativo") redirect("/login");
  return {
    id: profile.id,
    email: profile.email,
    churchId: profile.church_id,
    role: profile.role as UserRole,
    status: profile.status,
  };
}

export async function getAccessibleProjectsPage(
  churchId: string,
  pageValue?: string,
) {
  const supabase = await createClient();
  const range = paginationRange(pageValue);
  const { data, count, error } = await supabase
    .from("projects")
    .select("id, name, description, project_type, status", { count: "exact" })
    .eq("church_id", churchId)
    .order("name")
    .order("id")
    .range(range.from, range.to);

  if (error) {
    return databasePage<AccessibleProject>([], 0, range.page);
  }

  return databasePage(
    (data ?? []) as AccessibleProject[],
    count,
    range.page,
  );
}

export async function getAccessibleProject(projectId: string, churchId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, name, description, project_type, status")
    .eq("id", projectId)
    .eq("church_id", churchId)
    .maybeSingle();
  return data as AccessibleProject | null;
}

export async function getProjectWorkspaceAccess(
  projectId: string,
): Promise<ProjectWorkspaceAccess | null> {
  const profile = await getWorkspaceProfile();
  const project = await getAccessibleProject(projectId, profile.churchId);
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
