"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";

import { updateQuotation } from "@/lib/actions/base-registers";
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

type ProjectOption = { id: string; name: string };
type ProjectRecordOption = { id: string; name: string; project_id: string };
type SupplierOption = { id: string; name: string };
type ProjectSupplierLink = { project_id: string; supplier_id: string };

type Quotation = {
  id: string;
  project_id: string;
  stage_id: string;
  category_id: string;
  supplier_id: string | null;
  title: string;
  description: string | null;
  proponent_name: string;
  proponent_phone: string | null;
  proponent_email: string | null;
  total_value: number | string;
  execution_deadline: string | null;
  quotation_date: string | null;
  proposal_valid_until: string | null;
  payment_method: string | null;
  payment_terms: string | null;
  included_scope: string | null;
  excluded_scope: string | null;
  warranty: string | null;
  drive_document_url: string | null;
  notes: string | null;
};

type Props = {
  quotation: Quotation;
  projects: ProjectOption[];
  stages: ProjectRecordOption[];
  categories: ProjectRecordOption[];
  suppliers: SupplierOption[];
  projectSupplierLinks: ProjectSupplierLink[];
  returnTo?: string;
};

export function QuotationEditDialog({
  quotation,
  projects,
  stages,
  categories,
  suppliers,
  projectSupplierLinks,
  returnTo,
}: Props) {
  const [projectId, setProjectId] = useState(quotation.project_id);
  const [stageId, setStageId] = useState(quotation.stage_id);
  const [categoryId, setCategoryId] = useState(quotation.category_id);
  const [supplierId, setSupplierId] = useState(quotation.supplier_id || "");

  const availableStages = useMemo(
    () => stages.filter((stage) => stage.project_id === projectId),
    [projectId, stages],
  );
  const availableCategories = useMemo(
    () => categories.filter((category) => category.project_id === projectId),
    [categories, projectId],
  );
  const availableSupplierIds = useMemo(
    () => new Set(projectSupplierLinks.filter((link) => link.project_id === projectId).map((link) => link.supplier_id)),
    [projectId, projectSupplierLinks],
  );
  const availableSuppliers = useMemo(
    () => suppliers.filter((supplier) => availableSupplierIds.has(supplier.id)),
    [availableSupplierIds, suppliers],
  );

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Pencil className="size-3.5" aria-hidden="true" />
        Editar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar cotação</DialogTitle>
          <DialogDescription>
            Altere os dados enquanto a cotação estiver em análise. Cotações aprovadas ou reprovadas permanecem somente para consulta.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form action={updateQuotation} className="grid gap-4 md:grid-cols-2">
            <input name="cotacao_id" type="hidden" value={quotation.id} />
            {returnTo ? <input name="retorno" type="hidden" value={returnTo} /> : null}
            <label className="grid gap-1.5 text-sm font-medium">
              Projeto *
              <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="projeto_id" value={projectId} onChange={(event) => { const nextProjectId = event.target.value; setProjectId(nextProjectId); setStageId(""); setCategoryId(""); setSupplierId(""); }}>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Etapa *
              <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="etapa_id" required value={stageId} onChange={(event) => setStageId(event.target.value)}>
                <option disabled value="">Selecione</option>
                {availableStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Categoria *
              <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="categoria_id" required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option disabled value="">Selecione</option>
                {availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Fornecedor
              <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="fornecedor_id" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                <option value="">Ainda não cadastrado</option>
                {availableSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
              Título da cotação *
              <Input name="titulo" required maxLength={160} defaultValue={quotation.title} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Proponente/fornecedor *
              <Input name="proponente" required maxLength={160} defaultValue={quotation.proponent_name} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Valor total *
              <input className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="valor_total" required min="0.01" step="0.01" type="number" defaultValue={Number(quotation.total_value).toFixed(2)} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Telefone do proponente
              <Input name="telefone" type="tel" maxLength={30} defaultValue={quotation.proponent_phone || ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              E-mail do proponente
              <Input name="email" type="email" maxLength={160} defaultValue={quotation.proponent_email || ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Data da cotação
              <input className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="data_cotacao" type="date" defaultValue={quotation.quotation_date || ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Validade da proposta
              <input className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="validade_proposta" type="date" defaultValue={quotation.proposal_valid_until || ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Prazo de execução
              <Input name="prazo_execucao" maxLength={160} defaultValue={quotation.execution_deadline || ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Forma de pagamento
              <Input name="forma_pagamento" maxLength={160} defaultValue={quotation.payment_method || ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
              Condições de pagamento
              <Input name="condicoes_pagamento" maxLength={500} defaultValue={quotation.payment_terms || ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
              Escopo incluso
              <textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="escopo_incluso" maxLength={2000} defaultValue={quotation.included_scope || ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
              Escopo excluído
              <textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="escopo_excluso" maxLength={2000} defaultValue={quotation.excluded_scope || ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Garantia
              <Input name="garantia" maxLength={500} defaultValue={quotation.warranty || ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Link do documento no Drive
              <Input name="link_drive" type="url" maxLength={1000} defaultValue={quotation.drive_document_url || ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
              Descrição
              <textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="descricao" maxLength={2000} defaultValue={quotation.description || ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
              Observações
              <textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="observacoes" maxLength={2000} defaultValue={quotation.notes || ""} />
            </label>
            <div className="md:col-span-2"><Button type="submit">Salvar alterações</Button></div>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
