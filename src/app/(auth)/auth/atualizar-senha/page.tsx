"use client";

import { type FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { BrandSpectrum, IbaLogo } from "@/components/brand/iba-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter(); const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  const isStrongPassword = password.length >= 10 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!isStrongPassword) { setError("Use ao menos 10 caracteres, com letra maiúscula, minúscula e número."); return; } if (password !== confirmation) { setError("As senhas não coincidem."); return; } setLoading(true); setError(null); const { error: updateError } = await createClient().auth.updateUser({ password }); setLoading(false); if (updateError) { setError("Não foi possível atualizar a senha. Solicite um novo link."); return; } router.replace("/dashboard"); router.refresh(); }
  return <main className="auth-page grid min-h-screen place-items-center p-4"><Card className="relative w-full max-w-md shadow-xl shadow-primary/10"><BrandSpectrum className="absolute inset-x-0 top-0 h-1" /><CardHeader className="items-center text-center"><IbaLogo className="w-28" preload /><CardTitle>Definir nova senha</CardTitle><CardDescription>Use ao menos 10 caracteres, com letras maiúsculas, minúsculas e números.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={submit}><label className="grid gap-2 text-sm font-medium">Nova senha<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={10} maxLength={128} autoComplete="new-password" /></label><label className="grid gap-2 text-sm font-medium">Confirmar senha<Input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength={10} maxLength={128} autoComplete="new-password" /></label>{error ? <p role="alert" className="break-words rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}<Button type="submit" className="w-full" disabled={loading}><KeyRound className="size-4" />{loading ? "Salvando..." : "Salvar senha"}</Button></form></CardContent></Card></main>;
}
