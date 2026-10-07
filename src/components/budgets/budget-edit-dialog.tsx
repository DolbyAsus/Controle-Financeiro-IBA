"use client";

import { Pencil } from "lucide-react";

import { updatePendingBudget } from "@/lib/actions/base-registers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ProjectRecord = { id: string; name: string; project_id: string };
type Supplier = { id: string; name: string };
type ProjectSupplierLink = { project_id: string; supplier_id: string };
type Budget = {
  id: string; project_id: string; stage_id: string; category_id: string; supplier_id: string | null;
  free_recipient: string | null; title: string; description: string | null; budget_value: number | string;
  payment_method: string | null; payment_terms: string | null; expected_date: string | null; drive_document_url: string | null;
};

export function BudgetEditDialog({ budget, stages, categories, suppliers, projectSupplierLinks, returnTo }: {
  budget: Budget; stages: ProjectRecord[]; categories: ProjectRecord[]; suppliers: Supplier[];
  projectSupplierLinks: ProjectSupplierLink[]; returnTo?: string;
}) {
  const stageOptions = stages.filter((item) => item.project_id === budget.project_id);
  const categoryOptions = categories.filter((item) => item.project_id === budget.project_id);
  const supplierIds = new Set(projectSupplierLinks.filter((item) => item.project_id === budget.project_id).map((item) => item.supplier_id));
  const supplierOptions = suppliers.filter((item) => supplierIds.has(item.id));
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}><Pencil className="size-3.5" aria-hidden="true" />Editar</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Editar orçamento pendente</DialogTitle><DialogDescription>Após aprovação e criação da despesa, o orçamento permanece como registro de origem e não pode mais ser alterado.</DialogDescription></DialogHeader>
        <DialogBody><form action={updatePendingBudget} className="grid gap-4 md:grid-cols-2">
          <input name="orcamento_id" type="hidden" value={budget.id} />
          {returnTo ? <input name="retorno" type="hidden" value={returnTo} /> : null}
          <label className="grid gap-1.5 text-sm font-medium">Etapa *<select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="etapa_id" defaultValue={budget.stage_id} required>{stageOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-1.5 text-sm font-medium">Categoria de saída *<select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="categoria_id" defaultValue={budget.category_id} required>{categoryOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-1.5 text-sm font-medium">Fornecedor cadastrado<select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="fornecedor_id" defaultValue={budget.supplier_id || ""}><option value="">Selecione, se houver</option>{supplierOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-1.5 text-sm font-medium">Ou destinatário livre<Input name="destinatario_livre" maxLength={160} defaultValue={budget.free_recipient || ""} /></label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Título *<Input name="titulo" required maxLength={160} defaultValue={budget.title} /></label>
          <label className="grid gap-1.5 text-sm font-medium">Valor *<input className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="valor" required min="0.01" step="0.01" type="number" defaultValue={Number(budget.budget_value).toFixed(2)} /></label>
          <label className="grid gap-1.5 text-sm font-medium">Data prevista<input className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="data_prevista" type="date" defaultValue={budget.expected_date || ""} /></label>
          <label className="grid gap-1.5 text-sm font-medium">Forma de pagamento<Input name="forma_pagamento" maxLength={160} defaultValue={budget.payment_method || ""} /></label>
          <label className="grid gap-1.5 text-sm font-medium">Condições de pagamento<Input name="condicoes_pagamento" maxLength={500} defaultValue={budget.payment_terms || ""} /></label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Link do documento no Drive<Input name="link_drive" type="url" maxLength={1000} defaultValue={budget.drive_document_url || ""} /></label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Descrição<textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="descricao" maxLength={2000} defaultValue={budget.description || ""} /></label>
          <div className="md:col-span-2"><Button type="submit">Salvar alterações</Button></div>
        </form></DialogBody>
      </DialogContent>
    </Dialog>
  );
}
