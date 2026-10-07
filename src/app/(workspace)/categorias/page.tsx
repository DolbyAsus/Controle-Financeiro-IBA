import { Tags } from "lucide-react";

import { createCategory, updateCategory } from "@/lib/actions/base-registers";
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
const typeLabel: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ambos: "Entrada e saída",
};

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ mensagem?: string; erro?: string; pagina?: string; projeto?: string }>;
}) {
  const query = await searchParams;
  const projectId = query.projeto;
  const returnTo = projectId ? `/projetos/${projectId}/categorias` : undefined;
  const supabase = isSupabaseConfigured() ? await createClient() : null;
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
              .select("id, name, type, description, status, projects(name)")
              .eq("project_id", projectId)
              .order("name")
          : supabase
          .from("categories")
          .select("id, name, type, description, status, projects(name)")
          .order("name"))
      ).data ?? [])
    : [];
  const categoryPage = paginate(categories, query.pagina);
  return (
    <RegisterPageShell
      title="Categorias"
      description="Classifique entradas, saídas e lançamentos de cada projeto."
      icon={Tags}
      createLabel="Criar categoria"
      formTitle="Nova categoria"
      message={query.mensagem}
      error={query.erro}
      form={
        <form action={createCategory} className="grid gap-4 md:grid-cols-2">
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
            Nome *
            <Input
              className="w-full"
              name="nome"
              required
              maxLength={120}
              placeholder="Ex.: Material de construção"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Uso *
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="tipo"
              defaultValue="saida"
            >
              <option value="saida">Saída</option>
              <option value="entrada">Entrada</option>
              <option value="ambos">Entrada e saída</option>
            </select>
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
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Descrição
            <textarea
              className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm"
              name="descricao"
              maxLength={1000}
            />
          </label>
          <div className="md:col-span-2">
            <Button type="submit" disabled={projects.length === 0}>
              Salvar categoria
            </Button>
            {projects.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Cadastre um projeto antes de incluir categorias.
              </p>
            ) : null}
          </div>
        </form>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Categorias cadastradas</CardTitle>
          <CardDescription>
            {categories.length} categorias disponíveis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Nenhuma categoria cadastrada ainda.
            </p>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {categoryPage.items.map((category) => (
                  <article key={category.id} className="rounded-lg border p-3">
                    <div className="flex justify-between gap-2">
                      <strong>{category.name}</strong>
                      <Badge variant="secondary">
                        {typeLabel[category.type]}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {category.projects?.[0]?.name || "Projeto"} ·{" "}
                      {category.status}
                    </p>
                  </article>
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Uso</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryPage.items.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">
                          {category.name}
                        </TableCell>
                        <TableCell>
                          {category.projects?.[0]?.name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {typeLabel[category.type]}
                          </Badge>
                        </TableCell>
                        <TableCell>{category.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={categoryPage.page}
                totalPages={categoryPage.totalPages}
                label="categorias"
              />
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Editar ou inativar categoria</CardTitle>
          <CardDescription>
            Categorias inativas permanecem no histórico, mas deixam de aparecer
            nos novos lançamentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {categoryPage.items.map((category) => (
            <details key={category.id} className="rounded-lg border p-3">
              <summary className="cursor-pointer font-medium">
                {category.name}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  · {typeLabel[category.type]}
                </span>
              </summary>
              <form
                action={updateCategory}
                className="mt-3 grid gap-3 md:grid-cols-2"
              >
                <input name="categoria_id" type="hidden" value={category.id} />
                {returnTo ? <input name="retorno" type="hidden" value={returnTo} /> : null}
                <label className="grid gap-1 text-sm">
                  Nome
                  <Input name="nome" required defaultValue={category.name} />
                </label>
                <label className="grid gap-1 text-sm">
                  Uso
                  <select
                    className="h-9 rounded-lg border border-input bg-background px-3"
                    name="tipo"
                    defaultValue={category.type}
                  >
                    <option value="saida">Saída</option>
                    <option value="entrada">Entrada</option>
                    <option value="ambos">Entrada e saída</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  Status
                  <select
                    className="h-9 rounded-lg border border-input bg-background px-3"
                    name="status"
                    defaultValue={category.status}
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
                    defaultValue={category.description || ""}
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
