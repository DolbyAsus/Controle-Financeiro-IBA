"use client";

import { type FormEvent, useRef, useState } from "react";
import { LoaderCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { BrandSpectrum, IbaLogo } from "@/components/brand/iba-logo";
import { Turnstile, type TurnstileHandle } from "@/components/auth/turnstile";
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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const turnstileRef = useRef<TurnstileHandle>(null);
  const configured = isSupabaseConfigured();
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) return;
    if (!captchaToken) {
      setError("Conclua a verificação de segurança antes de entrar.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: signInError } = await createClient().auth.signInWithPassword(
      { email, password, options: { captchaToken } },
    );
    setLoading(false);
    turnstileRef.current?.reset();
    if (signInError) {
      setError("Não foi possível entrar. Confira seu e-mail e sua senha.");
      return;
    }
    router.replace("/selecionar-projeto");
    router.refresh();
  }
  return (
    <main className="auth-page grid min-h-screen place-items-center p-4">
      <Card className="relative w-full max-w-md shadow-xl shadow-primary/10">
        <BrandSpectrum className="absolute inset-x-0 top-0 h-1" />
        <CardHeader className="items-center text-center">
          <IbaLogo className="mx-auto w-36 sm:w-40" preload />
          <CardTitle className="mt-1 text-2xl">Gestão Financeira</CardTitle>
          <CardDescription>
            Projetos da Igreja Batista da Aliança
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {searchParams.get("mensagem") === "senha-atualizada" ? (
              <p
                role="status"
                className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
              >
                Senha atualizada. Entre novamente para continuar.
              </p>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                E-mail
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                placeholder="voce@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Senha
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Turnstile
              ref={turnstileRef}
              action="login"
              onTokenChange={setCaptchaToken}
            />
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            {!configured && (
              <p
                role="status"
                className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
              >
                Configure as variáveis do Supabase para habilitar o login.
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !configured || !captchaToken}
            >
              {loading ? (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <LogIn className="size-4" aria-hidden="true" />
              )}
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <Link
              className="block text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
              href="/auth/recuperar-senha"
            >
              Esqueci minha senha
            </Link>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
