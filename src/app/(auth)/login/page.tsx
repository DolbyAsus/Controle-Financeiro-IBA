"use client";

import { type FormEvent, useState } from "react";
import { Church, LoaderCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) return;
    setLoading(true); setError(null);
    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) { setError("Não foi possível entrar. Confira seu e-mail e sua senha."); return; }
    router.replace("/dashboard"); router.refresh();
  }
  return <main className="grid min-h-screen place-items-center bg-muted/40 p-4"><Card className="w-full max-w-md"><CardHeader className="text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><Church className="size-6" aria-hidden="true" /></span><CardTitle className="mt-3 text-2xl">Gestão Financeira</CardTitle><CardDescription>Igreja Batista da Aliança</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={handleSubmit}><div className="space-y-2"><label htmlFor="email" className="text-sm font-medium">E-mail</label><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="voce@exemplo.com" /></div><div className="space-y-2"><label htmlFor="password" className="text-sm font-medium">Senha</label><Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></div>{error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}{!configured && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Configure as variáveis do Supabase para habilitar o login.</p>}<Button type="submit" className="w-full" disabled={loading || !configured}>{loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <LogIn className="size-4" aria-hidden="true" />}{loading ? "Entrando..." : "Entrar"}</Button><Link className="block text-center text-sm text-primary underline-offset-4 hover:underline" href="/auth/recuperar-senha">Esqueci minha senha</Link></form></CardContent></Card></main>;
}
