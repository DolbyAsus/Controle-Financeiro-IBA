import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleAlert, CircleCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateRecordDialog } from "@/components/modules/create-record-dialog";

type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
  form?: ReactNode;
  createLabel?: string;
  formTitle?: string;
  formDescription?: string;
  formMode?: "dialog" | "inline" | "information";
  children: ReactNode;
  message?: string;
  error?: string;
};

export function RegisterPageShell({ title, description, icon: Icon, form, children, message, error, createLabel = "Criar novo registro", formTitle, formDescription, formMode = "dialog" }: Props) {
  const safeMessage = message?.slice(0, 500);
  const safeError = error?.slice(0, 500);
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-primary">Cadastros</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </section>
      {safeMessage ? <p role="status" className="flex break-words gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><CircleCheck className="size-4 shrink-0" />{safeMessage}</p> : null}
      {safeError ? <p role="alert" className="flex break-words gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive"><CircleAlert className="size-4 shrink-0" />{safeError}</p> : null}
      {form && formMode === "dialog" ? (
        <CreateRecordDialog
          buttonLabel={createLabel}
          title={formTitle || createLabel}
          description={formDescription}
        >
          {form}
        </CreateRecordDialog>
      ) : form ? (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Icon className="size-5 text-primary" />{formTitle || (formMode === "inline" ? "Filtros" : "Informações")}</CardTitle>{formDescription ? <CardDescription>{formDescription}</CardDescription> : null}</CardHeader>
          <CardContent>{form}</CardContent>
        </Card>
      ) : null}
      {children}
    </div>
  );
}
