import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) return <AppShell isPreview>{children}</AppShell>;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/login");
  return <AppShell userEmail={data.claims.email}>{children}</AppShell>;
}
