"use client";

import { Pencil } from "lucide-react";

import { updateIncomeEntry } from "@/lib/actions/base-registers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Category = { id: string; name: string; project_id: string };
type Income = { id: string; project_id: string; category_id: string | null; received_date: string; amount: number | string; origin: string; description: string | null; payment_method: string | null; drive_receipt_url: string | null; notes: string | null };

export function IncomeEditDialog({ income, categories, returnTo }: { income: Income; categories: Category[]; returnTo?: string }) {
  const categoryOptions = categories.filter((item) => item.project_id === income.project_id);
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}><Pencil className="size-3.5" aria-hidden="true" />Editar</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Editar entrada</DialogTitle><DialogDescription>Atualize os dados do recurso já recebido. A alteração será registrada no histórico.</DialogDescription></DialogHeader>
        <DialogBody><form action={updateIncomeEntry} className="grid gap-4 md:grid-cols-2">
          <input name="entrada_id" type="hidden" value={income.id} />
          {returnTo ? <input name="retorno" type="hidden" value={returnTo} /> : null}
          <label className="grid gap-1.5 text-sm font-medium">Categoria<select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="categoria_id" defaultValue={income.category_id || ""}><option value="">Não classificada</option>{categoryOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-1.5 text-sm font-medium">Origem *<Input name="origem" required maxLength={160} defaultValue={income.origin} /></label>
          <label className="grid gap-1.5 text-sm font-medium">Valor *<input className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="valor" required min="0.01" step="0.01" type="number" defaultValue={Number(income.amount).toFixed(2)} /></label>
          <label className="grid gap-1.5 text-sm font-medium">Data de recebimento *<input className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="data_recebimento" required type="date" defaultValue={income.received_date} /></label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Forma de recebimento<Input name="forma_recebimento" maxLength={160} defaultValue={income.payment_method || ""} /></label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Link do comprovante no Drive<Input name="link_comprovante" type="url" maxLength={1000} defaultValue={income.drive_receipt_url || ""} /></label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Descrição<textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="descricao" maxLength={2000} defaultValue={income.description || ""} /></label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Observações<textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="observacoes" maxLength={2000} defaultValue={income.notes || ""} /></label>
          <div className="md:col-span-2"><Button type="submit">Salvar alterações</Button></div>
        </form></DialogBody>
      </DialogContent>
    </Dialog>
  );
}
