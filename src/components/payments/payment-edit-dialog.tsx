"use client";

import { Pencil, Trash2 } from "lucide-react";

import { deletePayment, updatePayment } from "@/lib/actions/base-registers";
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

type Payment = {
  id: string;
  amount: number | string;
  payment_date: string;
  payment_method: string | null;
  drive_receipt_url: string | null;
  notes: string | null;
};

type Props = {
  payment: Payment;
  expenseDescription: string;
  recipient: string;
  minimumDate: string;
  maximumDate: string;
  canDelete: boolean;
  returnTo?: string;
};

export function PaymentEditDialog({
  payment,
  expenseDescription,
  recipient,
  minimumDate,
  maximumDate,
  canDelete,
  returnTo,
}: Props) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Pencil className="size-3.5" aria-hidden="true" />
        Editar
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar pagamento</DialogTitle>
          <DialogDescription>
            Atualize esta parcela de {expenseDescription}. Destinatário: {recipient}.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-6">
          <form action={updatePayment} className="grid gap-4 md:grid-cols-2">
            <input name="pagamento_id" type="hidden" value={payment.id} />
            {returnTo ? <input name="retorno" type="hidden" value={returnTo} /> : null}
            <label className="grid gap-1.5 text-sm font-medium">
              Valor da parcela *
              <input
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                name="valor"
                required
                min="0.01"
                step="0.01"
                type="number"
                defaultValue={Number(payment.amount).toFixed(2)}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Data *
              <input
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                name="data_pagamento"
                required
                min={minimumDate}
                max={maximumDate}
                type="date"
                defaultValue={payment.payment_date}
              />
              <span className="text-xs font-normal text-muted-foreground">
                Permitido de {minimumDate.split("-").reverse().join("/")} até {maximumDate.split("-").reverse().join("/")}.
              </span>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Forma de pagamento
              <Input name="forma_pagamento" maxLength={160} defaultValue={payment.payment_method || ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Link do comprovante no Drive
              <Input name="link_comprovante" type="url" maxLength={1000} defaultValue={payment.drive_receipt_url || ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
              Observações
              <textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="observacoes" maxLength={2000} defaultValue={payment.notes || ""} />
            </label>
            <div className="md:col-span-2">
              <Button type="submit">Salvar pagamento</Button>
            </div>
          </form>

          {canDelete ? (
            <form action={deletePayment} className="flex flex-col gap-3 border-t border-destructive/20 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <input name="pagamento_id" type="hidden" value={payment.id} />
              {returnTo ? <input name="retorno" type="hidden" value={returnTo} /> : null}
              <p className="text-sm text-muted-foreground">A exclusão recalcula automaticamente o saldo e o status da despesa.</p>
              <Button type="submit" variant="destructive">
                <Trash2 className="size-3.5" aria-hidden="true" />
                Excluir pagamento
              </Button>
            </form>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
