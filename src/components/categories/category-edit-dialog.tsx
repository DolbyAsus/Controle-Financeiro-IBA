"use client";

import { Pencil, Tags } from "lucide-react";

import { updateCategory } from "@/lib/actions/base-registers";
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

type Category = {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
};

export function CategoryEditDialog({
  category,
  returnTo,
}: {
  category: Category;
  returnTo?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Pencil className="size-3.5" aria-hidden="true" />
        Editar
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Tags className="size-5 text-primary" aria-hidden="true" />Editar categoria</DialogTitle>
          <DialogDescription>Atualize os dados ou inative a categoria, preservando seu histórico financeiro.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form action={updateCategory} className="grid gap-4 md:grid-cols-2">
            <input name="categoria_id" type="hidden" value={category.id} />
            {returnTo ? <input name="retorno" type="hidden" value={returnTo} /> : null}
            <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Nome *<Input name="nome" required maxLength={120} defaultValue={category.name} /></label>
            <label className="grid gap-1.5 text-sm font-medium">Uso *<select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="tipo" defaultValue={category.type}><option value="saida">Saída</option><option value="entrada">Entrada</option><option value="ambos">Entrada e saída</option></select></label>
            <label className="grid gap-1.5 text-sm font-medium">Status *<select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="status" defaultValue={category.status}><option value="ativo">Ativa</option><option value="inativo">Inativa</option></select></label>
            <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Descrição<textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="descricao" maxLength={1000} defaultValue={category.description || ""} /></label>
            <div className="md:col-span-2"><Button type="submit">Salvar alterações</Button></div>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
