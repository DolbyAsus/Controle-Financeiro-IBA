"use client";

import { Pencil } from "lucide-react";

import { updateExpense } from "@/lib/actions/base-registers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ProjectRecord = { id: string; name: string; project_id: string };
type Supplier = { id: string; name: string };
type ProjectSupplierLink = { project_id: string; supplier_id: string };
type Expense = {
  id: string; project_id: string; stage_id: string; category_id: string; supplier_id: string | null;
  free_recipient: string | null; description: string; approved_value: number | string;
  paid_value: number | string; expected_date: string | null; drive_document_url: string | null; notes: string | null;
};

export function ExpenseEditDialog({ expense, stages, categories, suppliers, projectSupplierLinks, returnTo }: {
  expense: Expense; stages: ProjectRecord[]; categories: ProjectRecord[]; suppliers: Supplier[];
  projectSupplierLinks: ProjectSupplierLink[]; returnTo?: string;
}) {
  const stageOptions = stages.filter((item) => item.project_id === expense.project_id);
  const categoryOptions = categories.filter((item) => item.project_id === expense.project_id);
  const supplierIds = new Set(projectSupplierLinks.filter((item) => item.project_id === expense.project_id).map((item) => item.supplier_id));
  const supplierOptions = suppliers.filter((item) => supplierIds.has(item.id));

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}><Pencil className="size-3.5" aria-hidden="true" />Editar</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Editar despesa</DialogTitle><DialogDescription>Os valores pagos e o status são recalculados automaticamente. Não é possível reduzir o valor abaixo do total já pago.</DialogDescription></DialogHeader>
        <DialogBody>
          <form action={updateExpense} className="grid gap-4 md:grid-cols-2">
            <input name="despesa_id" type="hidden" value={expense.id} />
            {returnTo ? <input name="retorno" type="hidden" value={returnTo} /> : null}
            <label className="grid gap-1.5 text-sm font-medium">Etapa *<select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="etapa_id" defaultValue={expense.stage_id} required>{stageOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="grid gap-1.5 text-sm font-medium">Categoria de saída *<select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="categoria_id" defaultValue={expense.category_id} required>{categoryOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="grid gap-1.5 text-sm font-medium">Fornecedor cadastrado<select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="fornecedor_id" defaultValue={expense.supplier_id || ""}><option value="">Selecione, se houver</option>{supplierOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="grid gap-1.5 text-sm font-medium">Ou destinatário livre<Input name="destinatario_livre" maxLength={160} defaultValue={expense.free_recipient || ""} /></label>
            <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Descrição da despesa *<Input name="descricao" required maxLength={2000} defaultValue={expense.description} /></label>
            <label className="grid gap-1.5 text-sm font-medium">Valor aprovado *<input className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="valor" required min={Number(expense.paid_value).toFixed(2)} step="0.01" type="number" defaultValue={Number(expense.approved_value).toFixed(2)} /><span className="text-xs font-normal text-muted-foreground">Já pago: {Number(expense.paid_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></label>
            <label className="grid gap-1.5 text-sm font-medium">Data prevista<input className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="data_prevista" type="date" defaultValue={expense.expected_date || ""} /></label>
            <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Link do documento no Drive<Input name="link_drive" type="url" maxLength={1000} defaultValue={expense.drive_document_url || ""} /></label>
            <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Observações<textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="observacoes" maxLength={2000} defaultValue={expense.notes || ""} /></label>
            <div className="md:col-span-2"><Button type="submit">Salvar alterações</Button></div>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
