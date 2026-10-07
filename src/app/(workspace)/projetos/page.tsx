import { FolderKanban } from "lucide-react";

import { createProject, updateProject } from "@/lib/actions/base-registers";
import { Pagination, paginate } from "@/components/modules/pagination";
import { RegisterPageShell } from "@/components/modules/register-page-shell";
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
const statusLabel: Record<string, string> = {
  planejado: "Planejado",
  em_andamento: "Em andamento",
  pausado: "Pausado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  project_type: string | null;
  start_date: string | null;
  expected_end_date: string | null;
  status: string;
  main_responsible: string | null;
  notes: string | null;
};

function ProjectEditor({ project }: { project: Project }) {
  return (
    <details className="mt-3 rounded-md border p-3">
      <summary className="cursor-pointer text-sm font-medium text-primary">
        Editar projeto
      </summary>
      <form action={updateProject} className="mt-3 grid gap-3 sm:grid-cols-2">
        <input name="projeto_id" type="hidden" value={project.id} />
        <label className="grid gap-1 text-sm">
          Nome
          <Input name="nome" required defaultValue={project.name} />
        </label>
        <label className="grid gap-1 text-sm">
          Tipo
          <Input name="tipo" defaultValue={project.project_type || ""} />
        </label>
        <label className="grid gap-1 text-sm">
          Início
          <input
            className="h-9 rounded-lg border border-input bg-transparent px-3"
            name="data_inicio"
            type="date"
            defaultValue={project.start_date || ""}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Término
          <input
            className="h-9 rounded-lg border border-input bg-transparent px-3"
            name="previsao_termino"
            type="date"
            defaultValue={project.expected_end_date || ""}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Responsável
          <Input
            name="responsavel"
            defaultValue={project.main_responsible || ""}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Status
          <select
            className="h-9 rounded-lg border border-input bg-background px-3"
            name="status"
            defaultValue={project.status}
          >
            <option value="planejado">Planejado</option>
            <option value="em_andamento">Em andamento</option>
            <option value="pausado">Pausado</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          Descrição
          <textarea
            className="min-h-16 rounded-lg border border-input bg-transparent p-2"
            name="descricao"
            defaultValue={project.description || ""}
          />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          Observações
          <textarea
            className="min-h-16 rounded-lg border border-input bg-transparent p-2"
            name="observacoes"
            defaultValue={project.notes || ""}
          />
        </label>
        <div className="sm:col-span-2">
          <Button size="sm" type="submit">
            Salvar alterações
          </Button>
        </div>
      </form>
    </details>
  );
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ mensagem?: string; erro?: string; pagina?: string }>;
}) {
  const query = await searchParams;
  const projects: Project[] = isSupabaseConfigured()
    ? ((
        await (
          await createClient()
        )
          .from("projects")
          .select(
            "id, name, description, project_type, start_date, expected_end_date, status, main_responsible, notes",
          )
          .order("created_at", { ascending: false })
      ).data ?? [])
    : [];
  const projectPage = paginate(projects, query.pagina);
  return (
    <RegisterPageShell
      title="Projetos"
      description="Organize projetos financeiros independentes da Igreja Batista da Aliança."
      icon={FolderKanban}
      createLabel="Criar projeto"
      formTitle="Novo projeto"
      message={query.mensagem}
      error={query.erro}
      form={
        <form action={createProject} className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            Nome *
            <Input
              name="nome"
              required
              maxLength={120}
              placeholder="Ex.: Colégio Batista"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Tipo do projeto
            <Input name="tipo" maxLength={80} placeholder="Ex.: Construção" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Início
            <input
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="data_inicio"
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
          <label className="grid gap-1.5 text-sm font-medium">
            Responsável principal
            <Input name="responsavel" maxLength={120} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Status *
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="status"
              defaultValue="planejado"
            >
              <option value="planejado">Planejado</option>
              <option value="em_andamento">Em andamento</option>
              <option value="pausado">Pausado</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
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
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Observações
            <textarea
              className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm"
              name="observacoes"
              maxLength={2000}
            />
          </label>
          <div className="md:col-span-2">
            <Button type="submit">Salvar projeto</Button>
          </div>
        </form>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Projetos cadastrados</CardTitle>
          <CardDescription>
            {projects.length} {projects.length === 1 ? "projeto" : "projetos"}{" "}
            disponível(is).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Nenhum projeto cadastrado ainda.
            </p>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {projectPage.items.map((project) => (
                  <article key={project.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <strong>{project.name}</strong>
                      <Badge variant="secondary">
                        {statusLabel[project.status]}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {project.project_type || "Sem tipo"}
                      {project.main_responsible
                        ? ` · ${project.main_responsible}`
                        : ""}
                    </p>
                    <ProjectEditor project={project} />
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectPage.items.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">
                          {project.name}
                        </TableCell>
                        <TableCell>{project.project_type || "—"}</TableCell>
                        <TableCell>{project.main_responsible || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {statusLabel[project.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-96">
                          <ProjectEditor project={project} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={projectPage.page}
                totalPages={projectPage.totalPages}
                label="projetos"
              />
            </>
          )}
        </CardContent>
      </Card>
    </RegisterPageShell>
  );
}
