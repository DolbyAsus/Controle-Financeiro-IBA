"use client";

import { type FormEvent, useState } from "react";
import { Building2, Pencil, ReceiptText, WalletCards, Landmark } from "lucide-react";

import { updateSupplier } from "@/lib/actions/base-registers";
import { Badge } from "@/components/ui/badge";
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
  status: string;
  projects?: { name: string }[] | null;
};

type Supplier = {
  id: string;
  name: string;
  person_type: string | null;
  document: string | null;
  main_contact: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  main_category_id: string | null;
  status: string;
  notes: string | null;
};

type LinkedDocument = {
  id: string;
  title: string;
  value: number | string;
  status: string;
  projectName: string;
};

type Props = {
  supplier: Supplier;
  categories: Category[];
  quotations: LinkedDocument[];
  budgets: LinkedDocument[];
  expenses: LinkedDocument[];
  returnTo?: string;
  projectId?: string;
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function LinkedDocumentList({
  title,
  icon: Icon,
  items,
  emptyMessage,
}: {
  title: string;
  icon: typeof ReceiptText;
  items: LinkedDocument[];
  emptyMessage: string;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <section className="rounded-lg border" aria-label={title}>
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-primary" aria-hidden="true" />
          {title}
        </h3>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="px-3 py-3 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="divide-y">
          {pageItems.map((item) => (
            <li key={item.id} className="space-y-1 px-3 py-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 break-words font-medium">{item.title}</span>
                <Badge className="shrink-0" variant="secondary">{item.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {item.projectName} · {money.format(Number(item.value))}
              </p>
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs">
          <span className="text-muted-foreground">Página {safePage} de {totalPages}</span>
          <div className="flex gap-2">
            <Button type="button" size="xs" variant="outline" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</Button>
            <Button type="button" size="xs" variant="outline" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Próxima</Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function SupplierEditDialog({
  supplier,
  categories,
  quotations,
  budgets,
  expenses,
  returnTo,
  projectId,
}: Props) {
  const [status, setStatus] = useState(supplier.status);
  const quotationsInReview = quotations.filter((item) => item.status === "em_analise").length;

  function confirmDeactivation(event: FormEvent<HTMLFormElement>) {
    if (supplier.status !== "ativo" || status === "ativo" || quotationsInReview === 0) return;

    const quotationLabel = quotationsInReview === 1 ? "cotação em análise" : "cotações em análise";
    const actionLabel = status === "bloqueado" ? "bloquear" : "desativar";
    const confirmed = window.confirm(
      `Ao ${actionLabel} este fornecedor, ${quotationsInReview} ${quotationLabel} será${quotationsInReview === 1 ? "" : "ão"} rejeitada${quotationsInReview === 1 ? "" : "s"} automaticamente. Deseja continuar?`,
    );

    if (!confirmed) event.preventDefault();
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Pencil className="size-3.5" aria-hidden="true" />
        Editar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" aria-hidden="true" />
            Editar fornecedor
          </DialogTitle>
          <DialogDescription>
            Atualize o cadastro e consulte os registros financeiros já vinculados.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-6">
          <form action={updateSupplier} className="grid gap-3 md:grid-cols-2" onSubmit={confirmDeactivation}>
            <input name="fornecedor_id" type="hidden" value={supplier.id} />
            {projectId ? <input name="projeto_id" type="hidden" value={projectId} /> : null}
            {returnTo ? <input name="retorno" type="hidden" value={returnTo} /> : null}
            <label className="grid gap-1 text-sm font-medium">
              Nome *
              <Input name="nome" required maxLength={160} defaultValue={supplier.name} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Tipo de pessoa
              <select className="h-9 rounded-lg border border-input bg-background px-3" name="tipo_pessoa" defaultValue={supplier.person_type || ""}>
                <option value="">Não informado</option>
                <option value="pessoa_juridica">Pessoa jurídica</option>
                <option value="pessoa_fisica">Pessoa física</option>
                <option value="outro">Outro</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              CPF/CNPJ ou documento
              <Input name="documento" maxLength={40} defaultValue={supplier.document || ""} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Categoria principal
              <select className="h-9 rounded-lg border border-input bg-background px-3" name="categoria_principal_id" defaultValue={supplier.main_category_id || ""}>
                <option value="">Não informada</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}{category.projects?.[0]?.name ? ` · ${category.projects[0].name}` : ""}{category.status !== "ativo" ? " (inativa)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Contato principal
              <Input name="contato" maxLength={120} defaultValue={supplier.main_contact || ""} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Telefone
              <Input name="telefone" type="tel" maxLength={30} defaultValue={supplier.phone || ""} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              E-mail
              <Input name="email" type="email" maxLength={160} defaultValue={supplier.email || ""} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Status *
              <select className="h-9 rounded-lg border border-input bg-background px-3" name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="bloqueado">Bloqueado</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium md:col-span-2">
              Endereço
              <textarea className="min-h-16 rounded-lg border border-input bg-transparent p-2" name="endereco" maxLength={500} defaultValue={supplier.address || ""} />
            </label>
            <label className="grid gap-1 text-sm font-medium md:col-span-2">
              Observações
              <textarea className="min-h-16 rounded-lg border border-input bg-transparent p-2" name="observacoes" maxLength={2000} defaultValue={supplier.notes || ""} />
            </label>
            <div className="md:col-span-2">
              <Button type="submit">Salvar alterações</Button>
            </div>
          </form>

          <section className="space-y-3 border-t pt-5" aria-labelledby={`historico-${supplier.id}`}>
            <h2 id={`historico-${supplier.id}`} className="text-sm font-semibold">Documentos vinculados ao fornecedor</h2>
            <div className="grid gap-3 lg:grid-cols-3">
              <LinkedDocumentList title="Cotações" icon={ReceiptText} items={quotations} emptyMessage="Nenhuma cotação vinculada." />
              <LinkedDocumentList title="Orçamentos" icon={Landmark} items={budgets} emptyMessage="Nenhum orçamento vinculado." />
              <LinkedDocumentList title="Despesas" icon={WalletCards} items={expenses} emptyMessage="Nenhuma despesa vinculada." />
            </div>
          </section>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
