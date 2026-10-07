import { ReceiptText } from "lucide-react";

import { createQuotation } from "@/lib/actions/base-registers";
import { QuotationEditDialog } from "@/components/quotations/quotation-edit-dialog";
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
import { getProjectWorkspaceAccess, getWorkspaceProfile } from "@/lib/project-access";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const statusLabel: Record<string, string> = {
  em_analise: "Em análise",
  aprovada: "Aprovada",
  reprovada: "Reprovada",
};

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ mensagem?: string; erro?: string; pagina?: string; projeto?: string }>;
}) {
  const query = await searchParams;
  const projectId = query.projeto;
  const returnTo = projectId ? `/projetos/${projectId}/cotacoes` : undefined;
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const profile = supabase ? await getWorkspaceProfile() : null;
  const access = projectId && supabase ? await getProjectWorkspaceAccess(projectId) : null;
  const activeRole = access?.projectRole ?? profile?.role;
  const canEditQuotation = ["admin", "financeiro", "aprovador"].includes(activeRole ?? "");
  const projects = supabase
    ? ((await (projectId
        ? supabase.from("projects").select("id, name").eq("id", projectId)
        : supabase.from("projects").select("id, name").order("name")))
        .data ?? [])
    : [];
  const stages = supabase
    ? ((
        await (projectId
          ? supabase.from("project_stages").select("id, name, project_id, projects(name)").eq("project_id", projectId).eq("status", "ativo").order("sort_order")
          : supabase
          .from("project_stages")
          .select("id, name, project_id, projects(name)")
          .eq("status", "ativo")
          .order("sort_order"))
      ).data ?? [])
    : [];
  const categories = supabase
    ? ((
        await (projectId
          ? supabase.from("categories").select("id, name, project_id, projects(name)").eq("project_id", projectId).eq("status", "ativo").order("name")
          : supabase
          .from("categories")
          .select("id, name, project_id, projects(name)")
          .eq("status", "ativo")
          .order("name"))
      ).data ?? [])
    : [];
  const supplierLinks = supabase
    ? ((await (projectId
      ? supabase.from("project_suppliers").select("project_id, supplier_id").eq("project_id", projectId).eq("status", "ativo")
      : supabase.from("project_suppliers").select("project_id, supplier_id").eq("status", "ativo"))).data ?? [])
    : [];
  const supplierIds = supplierLinks.map((item) => item.supplier_id);
  const suppliers = supabase
    ? ((
        await (projectId
          ? (supplierIds.length ? supabase.from("suppliers").select("id, name").in("id", supplierIds).eq("status", "ativo").order("name") : supabase.from("suppliers").select("id, name").eq("id", "00000000-0000-0000-0000-000000000000"))
          : (supplierIds.length ? supabase.from("suppliers").select("id, name").in("id", supplierIds).eq("status", "ativo").order("name") : supabase.from("suppliers").select("id, name").eq("id", "00000000-0000-0000-0000-000000000000")))
      ).data ?? [])
    : [];
  const quotations = supabase
    ? ((
        await (projectId
          ? supabase
              .from("quotations")
              .select(
                "id, project_id, stage_id, category_id, supplier_id, title, description, proponent_name, proponent_phone, proponent_email, total_value, execution_deadline, quotation_date, proposal_valid_until, payment_method, payment_terms, included_scope, excluded_scope, warranty, drive_document_url, notes, status, projects(name), project_stages(name), categories(name)",
              )
              .eq("project_id", projectId)
              .order("created_at", { ascending: false })
          : supabase
          .from("quotations")
          .select(
            "id, project_id, stage_id, category_id, supplier_id, title, description, proponent_name, proponent_phone, proponent_email, total_value, execution_deadline, quotation_date, proposal_valid_until, payment_method, payment_terms, included_scope, excluded_scope, warranty, drive_document_url, notes, status, projects(name), project_stages(name), categories(name)",
          )
          .order("created_at", { ascending: false }))
      ).data ?? [])
    : [];
  const quotationPage = paginate(quotations, query.pagina);
  const dependsOnBaseRecords =
    projects.length === 0 || stages.length === 0 || categories.length === 0;

  return (
    <RegisterPageShell
      title="Cotações"
      description="Registre propostas. Projeto, etapa e categoria são obrigatórios; fornecedor pode ser informado depois."
      icon={ReceiptText}
      createLabel="Criar cotação"
      formTitle="Nova cotação"
      message={query.mensagem}
      error={query.erro}
      form={
        <form action={createQuotation} className="grid gap-4 md:grid-cols-2">
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
            Etapa *
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="etapa_id"
              required
              defaultValue=""
            >
              <option disabled value="">
                Selecione
              </option>
              {stages.map((item) => (
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
            Categoria *
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="categoria_id"
              required
              defaultValue=""
            >
              <option disabled value="">
                Selecione
              </option>
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
            Fornecedor
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="fornecedor_id"
              defaultValue=""
            >
              <option value="">Ainda não cadastrado</option>
              {suppliers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Título da cotação *
            <Input
              className="w-full"
              name="titulo"
              required
              maxLength={160}
              placeholder="Ex.: Estrutura metálica para cobertura"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Proponente/fornecedor *
            <Input
              className="w-full"
              name="proponente"
              required
              maxLength={160}
              placeholder="Nome informado na proposta"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Valor total *
            <input
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="valor_total"
              required
              min="0.01"
              step="0.01"
              type="number"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Telefone do proponente
            <Input
              className="w-full"
              name="telefone"
              type="tel"
              maxLength={30}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            E-mail do proponente
            <Input
              className="w-full"
              name="email"
              type="email"
              maxLength={160}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Data da cotação
            <input
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="data_cotacao"
              type="date"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Validade da proposta
            <input
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="validade_proposta"
              type="date"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Prazo de execução
            <Input
              className="w-full"
              name="prazo_execucao"
              maxLength={160}
              placeholder="Ex.: 30 dias"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Forma de pagamento
            <Input className="w-full" name="forma_pagamento" maxLength={160} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Condições de pagamento
            <Input
              className="w-full"
              name="condicoes_pagamento"
              maxLength={500}
            />
          </label>
          <p className="self-end rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            Novas cotações começam em <strong>Em análise</strong>.
          </p>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Escopo incluso
            <textarea
              className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm"
              name="escopo_incluso"
              maxLength={2000}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Escopo excluído
            <textarea
              className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm"
              name="escopo_excluso"
              maxLength={2000}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Garantia
            <Input className="w-full" name="garantia" maxLength={500} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Link do documento no Drive
            <Input
              className="w-full"
              name="link_drive"
              type="url"
              maxLength={1000}
              placeholder="https://drive.google.com/..."
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Descrição/observações
            <textarea
              className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm"
              name="descricao"
              maxLength={2000}
            />
          </label>
          <input name="observacoes" type="hidden" value="" />
          <div className="md:col-span-2">
            <Button type="submit" disabled={dependsOnBaseRecords}>
              Salvar cotação
            </Button>
            {dependsOnBaseRecords ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Crie ao menos um projeto, uma etapa e uma categoria antes de
                cadastrar cotações.
              </p>
            ) : null}
          </div>
        </form>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Cotações registradas</CardTitle>
          <CardDescription>
            {quotations.length} propostas disponíveis para comparação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quotations.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Nenhuma cotação cadastrada ainda.
            </p>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {quotationPage.items.map((item) => (
                  <article key={item.id} className="rounded-lg border p-3">
                    <div className="flex justify-between gap-2">
                      <strong>{item.title}</strong>
                      <Badge variant="secondary">
                        {statusLabel[item.status]}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.proponent_name} ·{" "}
                      {money.format(Number(item.total_value))}
                    </p>
                    {canEditQuotation && item.status === "em_analise" ? (
                      <div className="mt-3">
                        <QuotationEditDialog quotation={item} projects={projects} stages={stages} categories={categories} suppliers={suppliers} projectSupplierLinks={supplierLinks} returnTo={returnTo} />
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cotação</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Proponente</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      {canEditQuotation ? <TableHead>Ações</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotationPage.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.title}
                        </TableCell>
                        <TableCell>{item.projects?.[0]?.name || "—"}</TableCell>
                        <TableCell>
                          {item.project_stages?.[0]?.name || "—"}
                        </TableCell>
                        <TableCell>{item.proponent_name}</TableCell>
                        <TableCell>
                          {money.format(Number(item.total_value))}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {statusLabel[item.status]}
                          </Badge>
                        </TableCell>
                        {canEditQuotation ? (
                          <TableCell>
                            {item.status === "em_analise" ? (
                              <QuotationEditDialog quotation={item} projects={projects} stages={stages} categories={categories} suppliers={suppliers} projectSupplierLinks={supplierLinks} returnTo={returnTo} />
                            ) : (
                              <span className="text-xs text-muted-foreground">Encerrada</span>
                            )}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={quotationPage.page}
                totalPages={quotationPage.totalPages}
                label="cotações"
              />
            </>
          )}
        </CardContent>
      </Card>
    </RegisterPageShell>
  );
}
