"use client";

import { type FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter(); const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (password.length < 8) { setError("Use pelo menos 8 caracteres."); return; } if (password !== confirmation) { setError("As senhas não coincidem."); return; } setLoading(true); setError(null); const { error: updateError } = await createClient().auth.updateUser({ password }); setLoading(false); if (updateError) { setError("Não foi possível atualizar a senha. Solicite um novo link."); return; } router.replace("/dashboard"); router.refresh(); }
  return <main className="grid min-h-screen place-items-center bg-muted/40 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Definir nova senha</CardTitle><CardDescription>Escolha uma senha segura para acessar o sistema.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={submit}><label className="grid gap-2 text-sm font-medium">Nova senha<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" /></label><label className="grid gap-2 text-sm font-medium">Confirmar senha<Input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength={8} autoComplete="new-password" /></label>{error ? <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}<Button type="submit" className="w-full" disabled={loading}><KeyRound className="size-4" />{loading ? "Salvando..." : "Salvar senha"}</Button></form></CardContent></Card></main>;
}
