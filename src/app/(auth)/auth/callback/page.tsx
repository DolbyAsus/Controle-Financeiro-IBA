"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Confirmando seu acesso...");
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      router.replace("/login");
      return;
    }
    const type = new URLSearchParams(window.location.hash.slice(1)).get("type");
    const isRecoveryFlow =
      new URLSearchParams(window.location.search).get("flow") === "recovery" ||
      type === "recovery";
    const supabase = createClient();
    let completed = false;
    const redirect = (isRecovery = isRecoveryFlow) => {
      if (completed) return;
      completed = true;
      router.replace(isRecovery ? "/auth/atualizar-senha" : "/dashboard");
      router.refresh();
    };
    const finish = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setMessage(
          "Não foi possível validar este link. Solicite um novo e-mail.",
        );
        return;
      }
      redirect();
    };
    void finish();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) redirect(isRecoveryFlow || event === "PASSWORD_RECOVERY");
    });
    return () => subscription.unsubscribe();
  }, [router]);
  return (
    <main className="auth-page grid min-h-screen place-items-center p-4">
      <div className="flex items-center gap-3 rounded-lg border bg-background p-5 text-sm shadow-lg shadow-primary/10">
        <LoaderCircle className="size-5 animate-spin text-primary" />
        {message}
      </div>
    </main>
  );
}
