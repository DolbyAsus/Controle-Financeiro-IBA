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
