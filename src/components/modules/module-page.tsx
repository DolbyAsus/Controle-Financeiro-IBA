import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ModulePage({ title, description, icon: Icon, actionLabel = "Novo registro" }: { title: string; description: string; icon: LucideIcon; actionLabel?: string }) {
  return <div className="space-y-6"><section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-primary">Gestão do projeto</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p></div><Button><Plus className="size-4" aria-hidden="true" />{actionLabel}</Button></section><Card className="border-dashed"><CardHeader className="items-center py-12 text-center"><span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-6" aria-hidden="true" /></span><CardTitle className="mt-3">Módulo preparado para os dados do projeto</CardTitle><CardDescription className="max-w-lg">Os formulários, filtros, permissões e histórico deste módulo serão conectados ao Supabase na próxima etapa de implementação.</CardDescription></CardHeader><CardContent className="flex justify-center pb-10"><Button variant="outline">Configurar dados iniciais</Button></CardContent></Card></div>;
}
