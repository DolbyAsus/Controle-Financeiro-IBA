import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import type { UserRole } from "@/lib/navigation";
import { getOperationalNotifications } from "@/lib/notifications";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) return <AppShell isPreview>{children}</AppShell>;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/login");
  const { data: profile } = await supabase
    .from("users_profile")
    .select("email, role, status")
    .eq("id", data.claims.sub)
    .maybeSingle();
  if (!profile || profile.status !== "ativo") redirect("/login");
  const notifications = await getOperationalNotifications(profile.role as UserRole);
  return <AppShell userEmail={profile.email} role={profile.role as UserRole} isGlobalAdmin={profile.role === "admin"} notificationCount={notifications.length}>{children}</AppShell>;
}
