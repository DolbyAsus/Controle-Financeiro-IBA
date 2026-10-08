"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  getImplicitCallbackCredentials,
  hasAuthCallbackError,
} from "@/lib/auth-flow";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Validando o link seguro...");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      router.replace("/login");
      return;
    }
    const implicitCredentials = getImplicitCallbackCredentials(
      window.location.hash,
    );
    const supabase = createClient();
    const finish = async () => {
      if (hasAuthCallbackError(window.location.href)) {
        setFailed(true);
        setMessage("Este link é inválido, expirou ou já foi utilizado.");
        return;
      }

      const result = implicitCredentials
        ? await supabase.auth.setSession({
            access_token: implicitCredentials.accessToken,
            refresh_token: implicitCredentials.refreshToken,
          })
        : await supabase.auth.getSession();

      if (result.error || !result.data.session) {
        setFailed(true);
        setMessage("Este link é inválido, expirou ou já foi utilizado.");
        return;
      }

      if (implicitCredentials)
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.pathname}${window.location.search}`,
        );

      router.replace("/auth/atualizar-senha");
      router.refresh();
    };
    void finish();
  }, [router]);
  return (
    <main className="auth-page grid min-h-screen place-items-center p-4">
      <div className="grid max-w-md gap-4 rounded-lg border bg-background p-5 text-sm shadow-lg shadow-primary/10">
        <div className="flex items-center gap-3">
          {failed ? (
            <AlertTriangle className="size-5 shrink-0 text-destructive" />
          ) : (
            <LoaderCircle className="size-5 shrink-0 animate-spin text-primary" />
          )}
          {message}
        </div>
        {failed ? (
          <Link
            href="/auth/recuperar-senha"
            className="text-center font-medium text-primary underline-offset-4 hover:underline"
          >
            Solicitar novo link
          </Link>
        ) : null}
      </div>
    </main>
  );
}
