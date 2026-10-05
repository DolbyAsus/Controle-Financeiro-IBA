import { BanknoteArrowDown } from "lucide-react";

import { registerPayment } from "@/lib/actions/base-registers";
import { RegisterPageShell } from "@/components/modules/register-page-shell";
import { Pagination, paginate } from "@/components/modules/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

type RelatedExpense = {
  description?: string | null;
  free_recipient?: string | null;
  suppliers?: unknown;
};

function relatedValue<T>(relation: unknown) {
  const value = Array.isArray(relation) ? relation[0] : relation;
  return value && typeof value === "object" ? (value as T) : null;
}

function relatedName(relation: unknown) {
  const value = relatedValue<{ name?: unknown }>(relation);
  return typeof value?.name === "string" ? value.name : null;
}

function expenseDetails(relation: unknown) {
  return relatedValue<RelatedExpense>(relation);
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    mensagem?: string;
    erro?: string;
    despesa?: string;
    pagina?: string;
    pagina_despesas?: string;
  }>;
}) {
  const query = await searchParams;
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const expenses = supabase
    ? ((
        await supabase
          .from("expenses")
          .select(
            "id, description, approved_value, paid_value, remaining_value, status, free_recipient, suppliers(name), projects(name)",
          )
          .in("status", ["aprovada", "parcialmente_paga"])
          .order("created_at", { ascending: false })
      ).data ?? [])
    : [];
  const payments = supabase
    ? ((
        await supabase
          .from("payments")
          .select(
            "id, amount, payment_date, payment_method, expenses(description, free_recipient, suppliers(name)), projects(name)",
          )
          .order("payment_date", { ascending: false })
      ).data ?? [])
    : [];
  const selectedExpense = expenses.find((item) => item.id === query.despesa);
  const totalOpen = expenses.reduce(
    (total, item) => total + Number(item.remaining_value),
    0,
  );
  const paymentPage = paginate(payments, query.pagina);
  const openExpensePage = paginate(expenses, query.pagina_despesas);

  return (
    <RegisterPageShell
      title="Pagamentos"
      description="Cada pagamento é uma parcela vinculada a uma despesa e ao seu destinatário. O banco recalcula saldo e status automaticamente."
      icon={BanknoteArrowDown}
      message={query.mensagem}
      error={query.erro}
      form={
        <form action={registerPayment} className="grid gap-4 md:grid-cols-2">
          {selectedExpense ? (
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm md:col-span-2">
              <p className="font-medium">
                Nova parcela para: {selectedExpense.description}
              </p>
              <p className="mt-1 text-muted-foreground">
                Destinatário:{" "}
                {relatedName(selectedExpense.suppliers) ||
                  selectedExpense.free_recipient ||
                  "—"}{" "}
                · Saldo disponível:{" "}
                {money.format(Number(selectedExpense.remaining_value))}
              </p>
            </div>
          ) : null}
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Despesa *
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="despesa_id"
              required
              defaultValue={selectedExpense?.id || ""}
            >
              <option disabled value="">
                Selecione a despesa
              </option>
              {expenses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.description} ·{" "}
                  {relatedName(item.suppliers) ||
                    item.free_recipient ||
                    "Destinatário não informado"}{" "}
                  · saldo {money.format(Number(item.remaining_value))}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Valor da parcela *
            <input
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="valor"
              required
              min="0.01"
              max={
                selectedExpense
                  ? Number(selectedExpense.remaining_value)
                  : undefined
              }
              step="0.01"
              type="number"
            />
            {selectedExpense ? (
              <span className="text-xs font-normal text-muted-foreground">
                Máximo: {money.format(Number(selectedExpense.remaining_value))}.
                O valor não pode ultrapassar o saldo.
              </span>
            ) : null}
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Data *
            <input
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="data_pagamento"
              required
              type="date"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Forma de pagamento
            <Input
              className="w-full"
              name="forma_pagamento"
              maxLength={160}
              placeholder="PIX, transferência..."
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Link do comprovante no Drive
            <Input
              className="w-full"
              name="link_comprovante"
              type="url"
              maxLength={1000}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Observações
            <textarea
              className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm"
              name="observacoes"
              maxLength={2000}
            />
          </label>
          <div className="md:col-span-2">
            <Button type="submit" disabled={expenses.length === 0}>
              Registrar parcela
            </Button>
            {expenses.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Não há despesas abertas para pagamento.
              </p>
            ) : null}
          </div>
        </form>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Despesas com saldo a pagar</CardTitle>
          <CardDescription>
            {expenses.length} despesas abertas · {money.format(totalOpen)} em
            parcelas pendentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">
              Todas as despesas estão quitadas ou não há despesas aprovadas.
            </p>
          ) : (
            <>
              <div className="grid gap-3 lg:grid-cols-2">
                {openExpensePage.items.map((item) => (
                  <article
                    key={item.id}
                    className={`rounded-lg border p-3 ${item.id === selectedExpense?.id ? "border-primary/50 bg-primary/5" : ""}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Para:{" "}
                          {relatedName(item.suppliers) ||
                            item.free_recipient ||
                            "—"}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {item.status === "parcialmente_paga"
                          ? "Parcialmente paga"
                          : "Aprovada"}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <p>
                        <span className="block text-muted-foreground">
                          Aprovado
                        </span>
                        <strong>
                          {money.format(Number(item.approved_value))}
                        </strong>
                      </p>
                      <p>
                        <span className="block text-muted-foreground">
                          Já pago
                        </span>
                        <strong>{money.format(Number(item.paid_value))}</strong>
                      </p>
                      <p>
                        <span className="block text-muted-foreground">
                          Próxima parcela
                        </span>
                        <strong>
                          {money.format(Number(item.remaining_value))}
                        </strong>
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              <Pagination
                page={openExpensePage.page}
                totalPages={openExpensePage.totalPages}
                params={{ despesa: query.despesa, pagina: query.pagina }}
                pageParam="pagina_despesas"
                label="despesas com saldo"
              />
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pagamentos registrados</CardTitle>
          <CardDescription>
            {payments.length} parcelas no histórico, identificadas pela despesa
            e destinatário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Nenhum pagamento registrado ainda.
            </p>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {paymentPage.items.map((item) => {
                  const expense = expenseDetails(item.expenses);
                  return (
                    <article key={item.id} className="rounded-lg border p-3">
                      <strong>{expense?.description || "Despesa"}</strong>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Para:{" "}
                        {relatedName(expense?.suppliers) ||
                          expense?.free_recipient ||
                          "—"}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {money.format(Number(item.amount))} ·{" "}
                        {date.format(
                          new Date(`${item.payment_date}T00:00:00Z`),
                        )}
                      </p>
                    </article>
                  );
                })}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Despesa</TableHead>
                      <TableHead>Destinatário</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Forma</TableHead>
                      <TableHead>Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentPage.items.map((item) => {
                      const expense = expenseDetails(item.expenses);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {expense?.description || "—"}
                          </TableCell>
                          <TableCell>
                            {relatedName(expense?.suppliers) ||
                              expense?.free_recipient ||
                              "—"}
                          </TableCell>
                          <TableCell>
                            {relatedName(item.projects) || "—"}
                          </TableCell>
                          <TableCell>
                            {date.format(
                              new Date(`${item.payment_date}T00:00:00Z`),
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {item.payment_method || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {money.format(Number(item.amount))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={paymentPage.page}
                totalPages={paymentPage.totalPages}
                params={{ despesa: query.despesa }}
                label="pagamentos"
              />
            </>
          )}
        </CardContent>
      </Card>
    </RegisterPageShell>
  );
}
