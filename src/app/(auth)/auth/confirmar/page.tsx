"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { BrandSpectrum, IbaLogo } from "@/components/brand/iba-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type EmailConfirmationAction,
  getSafeEmailConfirmationAction,
} from "@/lib/auth-flow";

export default function ConfirmEmailActionPage() {
  const [action, setAction] = useState<EmailConfirmationAction | null>();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const safeAction = getSafeEmailConfirmationAction(
        window.location.hash,
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      );
      setAction(safeAction);
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const isInvite = action?.type === "invite";

  return (
    <main className="auth-page grid min-h-screen place-items-center p-4">
      <Card className="relative w-full max-w-md shadow-xl shadow-primary/10">
        <BrandSpectrum className="absolute inset-x-0 top-0 h-1" />
        <CardHeader className="items-center text-center">
          <IbaLogo className="mx-auto w-28" preload />
          <CardTitle>
            {isInvite ? "Aceitar convite" : "Confirmar recuperação"}
          </CardTitle>
          <CardDescription>
            {isInvite
              ? "Confirme para ativar seu acesso ao Controle Financeiro IBA."
              : "Confirme para abrir a página segura de definição de senha."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {action === undefined ? (
            <p role="status" className="text-center text-sm text-muted-foreground">
              Verificando o link...
            </p>
          ) : action ? (
            <>
              <p className="flex items-start gap-2 rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                O link só será utilizado quando você confirmar abaixo.
              </p>
              <Button
                type="button"
                className="w-full"
                onClick={() => window.location.assign(action.url)}
              >
                {isInvite ? "Aceitar convite" : "Continuar recuperação"}
                <ArrowRight className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                Este link é inválido, expirou ou não pertence a este aplicativo.
              </p>
              <Link
                href="/auth/recuperar-senha"
                className="block text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Solicitar novo link
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
