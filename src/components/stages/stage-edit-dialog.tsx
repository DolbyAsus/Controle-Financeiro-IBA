"use client";

import { ClipboardList, Pencil } from "lucide-react";

import { updateStage } from "@/lib/actions/base-registers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Stage = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  sort_order: number | string;
  planned_budget: number | string;
  expected_start_date: string | null;
  expected_end_date: string | null;
  status: string;
  notes: string | null;
};

export function StageEditDialog({
  stage,
  returnTo,
}: {
  stage: Stage;
  returnTo?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Pencil className="size-3.5" aria-hidden="true" />
        Editar
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ClipboardList className="size-5 text-primary" aria-hidden="true" />Editar etapa</DialogTitle>
          <DialogDescription>Atualize os dados ou inative a etapa, preservando os lançamentos existentes.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form action={updateStage} className="grid gap-4 md:grid-cols-2">
            <input name="etapa_id" type="hidden" value={stage.id} />
            {returnTo ? <input name="retorno" type="hidden" value={returnTo} /> : null}
            <label className="grid gap-1.5 text-sm font-medium">Nome *<Input name="nome" required maxLength={120} defaultValue={stage.name} /></label>
            <label className="grid gap-1.5 text-sm font-medium">Código<Input name="codigo" maxLength={30} defaultValue={stage.code || ""} /></label>
            <label className="grid gap-1.5 text-sm font-medium">Ordem *<input className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="ordem" type="number" min="0" required defaultValue={stage.sort_order} /></label>
            <label className="grid gap-1.5 text-sm font-medium">Orçamento planejado *<input className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="orcamento_planejado" type="number" min="0" step="0.01" required defaultValue={stage.planned_budget} /></label>
            <label className="grid gap-1.5 text-sm font-medium">Previsão de início<input className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="previsao_inicio" type="date" defaultValue={stage.expected_start_date || ""} /></label>
            <label className="grid gap-1.5 text-sm font-medium">Previsão de término<input className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="previsao_termino" type="date" defaultValue={stage.expected_end_date || ""} /></label>
            <label className="grid gap-1.5 text-sm font-medium">Status *<select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="status" defaultValue={stage.status}><option value="ativo">Ativa</option><option value="inativo">Inativa</option></select></label>
            <label className="grid gap-1.5 text-sm font-medium">Descrição<textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="descricao" maxLength={1000} defaultValue={stage.description || ""} /></label>
            <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Observações<textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="observacoes" maxLength={2000} defaultValue={stage.notes || ""} /></label>
            <div className="md:col-span-2"><Button type="submit">Salvar alterações</Button></div>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
