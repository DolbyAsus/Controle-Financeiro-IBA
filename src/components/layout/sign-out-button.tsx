"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return <Button variant="ghost" size="icon" type="button" aria-label="Sair" title="Sair" onClick={signOut}><LogOut className="size-4" aria-hidden="true" /></Button>;
}
