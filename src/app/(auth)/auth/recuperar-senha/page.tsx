"use client";

import { type FormEvent, useState } from "react";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl, isSupabaseConfigured } from "@/lib/supabase/config";

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(null); const { error: recoveryError } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: getAuthCallbackUrl() }); setLoading(false); if (recoveryError) { setError("Não foi possível enviar o link agora. Tente novamente."); return; } setSent(true); }
  return <main className="auth-page grid min-h-screen place-items-center p-4"><Card className="w-full max-w-md shadow-lg shadow-primary/10"><CardHeader><CardTitle>Recuperar senha</CardTitle><CardDescription>Enviaremos um link seguro para você definir uma nova senha.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={submit}><label className="grid gap-2 text-sm font-medium">E-mail<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>{sent ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Se houver uma conta associada, o e-mail de recuperação foi enviado.</p> : null}{error ? <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}<Button type="submit" className="w-full" disabled={loading || !isSupabaseConfigured()}><Mail className="size-4" />{loading ? "Enviando..." : "Enviar link"}</Button></form></CardContent></Card></main>;
}
