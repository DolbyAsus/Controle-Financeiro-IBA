import { ClipboardList } from "lucide-react";

import { createStage, updateStage } from "@/lib/actions/base-registers";
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

export default async function StagesPage({
  searchParams,
}: {
  searchParams: Promise<{ mensagem?: string; erro?: string; pagina?: string; projeto?: string }>;
}) {
  const query = await searchParams;
  const projectId = query.projeto;
  const returnTo = projectId ? `/projetos/${projectId}/etapas` : undefined;
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const projects = supabase
    ? ((await (projectId
        ? supabase.from("projects").select("id, name").eq("id", projectId)
        : supabase.from("projects").select("id, name").order("name")))
        .data ?? [])
    : [];
  const stages = supabase
    ? ((
        await (projectId
          ? supabase
              .from("project_stages")
              .select(
                "id, name, code, description, sort_order, planned_budget, expected_start_date, expected_end_date, status, notes, projects(name)",
              )
              .eq("project_id", projectId)
              .order("sort_order")
          : supabase
          .from("project_stages")
          .select(
            "id, name, code, description, sort_order, planned_budget, expected_start_date, expected_end_date, status, notes, projects(name)",
          )
          .order("sort_order"))
      ).data ?? [])
    : [];
  const stagePage = paginate(stages, query.pagina);
  return (
    <RegisterPageShell
      title="Etapas"
      description="Defina etapas, prazo e orçamento planejado para cada projeto."
      icon={ClipboardList}
      createLabel="Criar etapa"
      formTitle="Nova etapa"
      message={query.mensagem}
      error={query.erro}
      form={
        <form action={createStage} className="grid gap-4 md:grid-cols-2">
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
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>}
          <label className="grid gap-1.5 text-sm font-medium">
            Nome da etapa *
            <Input
              className="w-full"
              name="nome"
              required
              maxLength={120}
              placeholder="Ex.: Fundação"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Código
            <Input
              className="w-full"
              name="codigo"
              maxLength={30}
              placeholder="ET-01"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Ordem
            <input
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="ordem"
              min="0"
              type="number"
              placeholder="Automática"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Orçamento planejado
            <input
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="orcamento_planejado"
              min="0"
              step="0.01"
              type="number"
              defaultValue="0"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Status *
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="status"
              defaultValue="ativo"
            >
              <option value="ativo">Ativa</option>
              <option value="inativo">Inativa</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Previsão de início
            <input
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="previsao_inicio"
              type="date"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Previsão de término
            <input
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="previsao_termino"
              type="date"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Descrição
            <textarea
              className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm"
              name="descricao"
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
            <Button type="submit" disabled={projects.length === 0}>
              Salvar etapa
            </Button>
            {projects.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Cadastre um projeto antes de incluir etapas.
              </p>
            ) : null}
          </div>
        </form>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Etapas cadastradas</CardTitle>
          <CardDescription>{stages.length} etapas disponíveis.</CardDescription>
        </CardHeader>
        <CardContent>
          {stages.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Nenhuma etapa cadastrada ainda.
            </p>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {stagePage.items.map((stage) => (
                  <article key={stage.id} className="rounded-lg border p-3">
                    <div className="flex justify-between gap-2">
                      <strong>{stage.name}</strong>
                      <Badge variant="secondary">{stage.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {stage.projects?.[0]?.name || "Projeto"} ·{" "}
                      {money.format(Number(stage.planned_budget))}
                    </p>
                  </article>
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Ordem</TableHead>
                      <TableHead>Planejado</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stagePage.items.map((stage) => (
                      <TableRow key={stage.id}>
                        <TableCell className="font-medium">
                          {stage.code ? `${stage.code} · ` : ""}
                          {stage.name}
                        </TableCell>
                        <TableCell>
                          {stage.projects?.[0]?.name || "—"}
                        </TableCell>
                        <TableCell>{stage.sort_order}</TableCell>
                        <TableCell>
                          {money.format(Number(stage.planned_budget))}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{stage.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={stagePage.page}
                totalPages={stagePage.totalPages}
                label="etapas"
              />
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Editar ou inativar etapa</CardTitle>
          <CardDescription>
            Inative etapas que não devem receber novos lançamentos; os registros
            existentes serão preservados.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {stagePage.items.map((stage) => (
            <details key={stage.id} className="rounded-lg border p-3">
              <summary className="cursor-pointer font-medium">
                {stage.code ? `${stage.code} · ` : ""}
                {stage.name}
              </summary>
              <form
                action={updateStage}
                className="mt-3 grid gap-3 md:grid-cols-2"
              >
                <input name="etapa_id" type="hidden" value={stage.id} />
                {returnTo ? <input name="retorno" type="hidden" value={returnTo} /> : null}
                <label className="grid gap-1 text-sm">
                  Nome
                  <Input name="nome" required defaultValue={stage.name} />
                </label>
                <label className="grid gap-1 text-sm">
                  Código
                  <Input name="codigo" defaultValue={stage.code || ""} />
                </label>
                <label className="grid gap-1 text-sm">
                  Ordem
                  <input
                    className="h-9 rounded-lg border border-input bg-transparent px-3"
                    name="ordem"
                    type="number"
                    min="0"
                    required
                    defaultValue={stage.sort_order}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Orçamento planejado
                  <input
                    className="h-9 rounded-lg border border-input bg-transparent px-3"
                    name="orcamento_planejado"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={stage.planned_budget}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Início
                  <input
                    className="h-9 rounded-lg border border-input bg-transparent px-3"
                    name="previsao_inicio"
                    type="date"
                    defaultValue={stage.expected_start_date || ""}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Término
                  <input
                    className="h-9 rounded-lg border border-input bg-transparent px-3"
                    name="previsao_termino"
                    type="date"
                    defaultValue={stage.expected_end_date || ""}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Status
                  <select
                    className="h-9 rounded-lg border border-input bg-background px-3"
                    name="status"
                    defaultValue={stage.status}
                  >
                    <option value="ativo">Ativa</option>
                    <option value="inativo">Inativa</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  Descrição
                  <textarea
                    className="min-h-16 rounded-lg border border-input bg-transparent p-2"
                    name="descricao"
                    defaultValue={stage.description || ""}
                  />
                </label>
                <label className="grid gap-1 text-sm md:col-span-2">
                  Observações
                  <textarea
                    className="min-h-16 rounded-lg border border-input bg-transparent p-2"
                    name="observacoes"
                    defaultValue={stage.notes || ""}
                  />
                </label>
                <div className="md:col-span-2">
                  <Button size="sm" type="submit">
                    Salvar alterações
                  </Button>
                </div>
              </form>
            </details>
          ))}
        </CardContent>
      </Card>
    </RegisterPageShell>
  );
}
