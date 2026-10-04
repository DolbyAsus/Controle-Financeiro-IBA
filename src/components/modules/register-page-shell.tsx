import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleAlert, CircleCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
  form: ReactNode;
  children: ReactNode;
  message?: string;
  error?: string;
};

export function RegisterPageShell({ title, description, icon: Icon, form, children, message, error }: Props) {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-primary">Cadastros</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </section>
      {message ? <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><CircleCheck className="size-4" />{message}</p> : null}
      {error ? <p role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive"><CircleAlert className="size-4" />{error}</p> : null}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Icon className="size-5 text-primary" />Novo registro</CardTitle><CardDescription>Campos marcados com * são obrigatórios.</CardDescription></CardHeader>
        <CardContent>{form}</CardContent>
      </Card>
      {children}
    </div>
  );
}
