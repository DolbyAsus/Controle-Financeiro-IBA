import { BanknoteArrowUp } from "lucide-react";

import { createIncomeEntry } from "@/lib/actions/base-registers";
import { IncomeEditDialog } from "@/components/incomes/income-edit-dialog";
import { RegisterPageShell } from "@/components/modules/register-page-shell";
import { Pagination, databasePage, paginationRange } from "@/components/modules/pagination";
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
import { getProjectWorkspaceAccess, getWorkspaceProfile } from "@/lib/project-access";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ mensagem?: string; erro?: string; pagina?: string; projeto?: string }>;
}) {
  const query = await searchParams;
  const projectId = query.projeto;
  const returnTo = projectId ? `/projetos/${projectId}/entradas` : undefined;
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const profile = supabase ? await getWorkspaceProfile() : null;
  const access = projectId && supabase ? await getProjectWorkspaceAccess(projectId) : null;
  const activeRole = access?.projectRole ?? profile?.role;
  const canEditIncome = ["admin", "financeiro"].includes(activeRole ?? "");
  const pageRange = paginationRange(query.pagina);
  const projects = supabase
    ? ((await (projectId
        ? supabase.from("projects").select("id, name").eq("id", projectId)
        : supabase.from("projects").select("id, name").order("name")))
        .data ?? [])
    : [];
  const categories = supabase
    ? ((
        await (projectId
          ? supabase
              .from("categories")
              .select("id, name, type, project_id, projects(name)")
              .eq("project_id", projectId)
              .in("type", ["entrada", "ambos"])
              .eq("status", "ativo")
              .order("name")
          : supabase
          .from("categories")
              .select("id, name, type, project_id, projects(name)")
          .in("type", ["entrada", "ambos"])
          .eq("status", "ativo")
          .order("name"))
      ).data ?? [])
    : [];
  const entriesResult = supabase
    ? await (projectId
          ? supabase
              .from("income_entries")
              .select(
                "id, project_id, category_id, amount, received_date, origin, description, payment_method, drive_receipt_url, notes, status, projects(name), categories(name)",
                { count: "exact" },
              )
              .eq("project_id", projectId)
              .order("received_date", { ascending: false })
          : supabase
          .from("income_entries")
          .select(
                "id, project_id, category_id, amount, received_date, origin, description, payment_method, drive_receipt_url, notes, status, projects(name), categories(name)",
                { count: "exact" },
          )
          .order("received_date", { ascending: false }))
        .order("id", { ascending: false })
        .range(pageRange.from, pageRange.to)
    : null;
  const entries = entriesResult?.data ?? [];
  const entryPage = databasePage(entries, entriesResult?.count ?? 0, pageRange.page);
  return (
    <RegisterPageShell
      title="Entradas"
      description="Registre recursos já recebidos. Entradas atualizam o dashboard e o relatório mensal."
      icon={BanknoteArrowUp}
      createLabel="Registrar entrada"
      formTitle="Nova entrada recebida"
      message={query.mensagem}
      error={query.erro}
      form={
        <form action={createIncomeEntry} className="grid gap-4 md:grid-cols-2">
          {projectId ? <><input name="projeto_id" type="hidden" value={projectId} /><input name="retorno" type="hidden" value={returnTo} /></> : <label className="grid gap-1.5 text-sm font-medium">
            Projeto *
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="projeto_id"
              required
              defaultValue=""
            >
              <option disabled value="">
                Selecione
              </option>
              {projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>}
          <label className="grid gap-1.5 text-sm font-medium">
            Categoria
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="categoria_id"
              defaultValue=""
            >
              <option value="">Não classificada</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.projects?.[0]?.name
                    ? ` · ${item.projects[0].name}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Origem *
            <Input
              className="w-full"
              name="origem"
              required
              maxLength={160}
              placeholder="Ex.: Doação para a obra"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Valor *
            <input
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="valor"
              required
              min="0.01"
              step="0.01"
              type="number"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Data de recebimento *
            <input
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="data_recebimento"
              required
              type="date"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Forma de recebimento
            <Input
              className="w-full"
              name="forma_recebimento"
              maxLength={160}
              placeholder="PIX, transferência..."
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Link do comprovante no Drive
            <Input
              className="w-full"
              name="link_comprovante"
              type="url"
              maxLength={1000}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Descrição
            <textarea
              className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm"
              name="descricao"
              maxLength={2000}
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
            <Button type="submit" disabled={projects.length === 0}>
              Registrar entrada
            </Button>
          </div>
        </form>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Entradas recebidas</CardTitle>
          <CardDescription>
            {entryPage.count} registros financeiros.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Nenhuma entrada registrada ainda.
            </p>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {entryPage.items.map((item) => (
                  <article key={item.id} className="rounded-lg border p-3">
                    <div className="flex justify-between gap-2">
                      <strong>{item.origin}</strong>
                      <Badge variant="secondary">
                        {money.format(Number(item.amount))}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.projects?.[0]?.name || "Projeto"} ·{" "}
                      {item.received_date}
                    </p>
                    {canEditIncome ? <div className="mt-3"><IncomeEditDialog income={item} categories={categories} returnTo={returnTo} /></div> : null}
                  </article>
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origem</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Recebimento</TableHead>
                      <TableHead>Valor</TableHead>
                      {canEditIncome ? <TableHead>Ações</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entryPage.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.origin}
                        </TableCell>
                        <TableCell>{item.projects?.[0]?.name || "—"}</TableCell>
                        <TableCell>
                          {item.categories?.[0]?.name || "—"}
                        </TableCell>
                        <TableCell>
                          {new Intl.DateTimeFormat("pt-BR", {
                            timeZone: "UTC",
                          }).format(
                            new Date(`${item.received_date}T00:00:00Z`),
                          )}
                        </TableCell>
                        <TableCell>{item.payment_method || "—"}</TableCell>
                        <TableCell>
                          {money.format(Number(item.amount))}
                        </TableCell>
                        {canEditIncome ? <TableCell><IncomeEditDialog income={item} categories={categories} returnTo={returnTo} /></TableCell> : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={entryPage.page}
                totalPages={entryPage.totalPages}
                label="entradas"
              />
            </>
          )}
        </CardContent>
      </Card>
    </RegisterPageShell>
  );
}
