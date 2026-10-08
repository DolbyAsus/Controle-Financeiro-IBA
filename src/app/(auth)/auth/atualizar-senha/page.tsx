"use client";

import { type FormEvent, useEffect, useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { BrandSpectrum, IbaLogo } from "@/components/brand/iba-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const PASSWORD_SYMBOLS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const isStrongPassword =
    password.length >= 10 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    [...PASSWORD_SYMBOLS].some((symbol) => password.includes(symbol));
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      router.replace("/login");
      return;
    }

    const validateRecoverySession = async () => {
      const {
        data: { session },
      } = await createClient().auth.getSession();

      if (!session) {
        router.replace("/auth/recuperar-senha?erro=link-invalido");
        return;
      }

      setCheckingSession(false);
    };

    void validateRecoverySession();
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isStrongPassword) {
      setError(
        "Use ao menos 10 caracteres, com letra maiúscula, minúscula, número e símbolo.",
      );
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    if (updateError) {
      setLoading(false);
      setError("Não foi possível atualizar a senha. Solicite um novo link.");
      return;
    }

    await supabase.auth.signOut({ scope: "global" });
    router.replace("/login?mensagem=senha-atualizada");
    router.refresh();
  }
  if (checkingSession) {
    return (
      <main className="auth-page grid min-h-screen place-items-center p-4">
        <div className="flex items-center gap-3 rounded-lg border bg-background p-5 text-sm shadow-lg shadow-primary/10">
          <LoaderCircle className="size-5 animate-spin text-primary" />
          Validando o link seguro...
        </div>
      </main>
    );
  }
  return (
    <main className="auth-page grid min-h-screen place-items-center p-4">
      <Card className="relative w-full max-w-md shadow-xl shadow-primary/10">
        <BrandSpectrum className="absolute inset-x-0 top-0 h-1" />
        <CardHeader className="items-center text-center">
          <IbaLogo className="mx-auto w-28" preload />
          <CardTitle>Definir nova senha</CardTitle>
          <CardDescription>
            Use ao menos 10 caracteres, com letras maiúsculas, minúsculas e
            números, além de um símbolo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <label className="grid gap-2 text-sm font-medium">
              Nova senha
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Repita a nova senha
              <Input
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
            {error ? (
              <p
                role="alert"
                className="break-words rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading}>
              <KeyRound className="size-4" />
              {loading ? "Salvando..." : "Salvar senha e entrar novamente"}
            </Button>
            <Link
              className="block text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
              href="/login"
            >
              Voltar ao login
            </Link>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
