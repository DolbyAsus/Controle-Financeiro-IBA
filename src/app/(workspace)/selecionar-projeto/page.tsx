import Link from "next/link";
import { FolderKanban, ArrowRight, PlusCircle, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/modules/pagination";
import { CreateRecordDialog } from "@/components/modules/create-record-dialog";
import { createProject } from "@/lib/actions/base-registers";
import { getAccessibleProjectsPage, getWorkspaceProfile } from "@/lib/project-access";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  planejado: "Planejado",
  em_andamento: "Em andamento",
  pausado: "Pausado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

function CreateProjectDialog() {
  return (
    <CreateRecordDialog
      buttonLabel="Criar novo projeto"
      title="Novo projeto"
      description="O novo projeto ficará disponível para sua operação imediatamente. Campos marcados com * são obrigatórios."
    >
        <form action={createProject} className="grid gap-4 md:grid-cols-2">
          <input name="retorno" type="hidden" value="/selecionar-projeto" />
          <label className="grid gap-1.5 text-sm font-medium">
            Nome do projeto *
            <Input name="nome" required maxLength={120} placeholder="Ex.: Reforma do templo" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Tipo do projeto
            <Input name="tipo" maxLength={80} placeholder="Ex.: Construção" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Início
            <input className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="data_inicio" type="date" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Previsão de término
            <input className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm" name="previsao_termino" type="date" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Responsável principal
            <Input name="responsavel" maxLength={120} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Status *
            <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" name="status" defaultValue="planejado">
              <option value="planejado">Planejado</option>
              <option value="em_andamento">Em andamento</option>
              <option value="pausado">Pausado</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Descrição
            <textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="descricao" maxLength={1000} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Observações
            <textarea className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm" name="observacoes" maxLength={2000} />
          </label>
          <div className="md:col-span-2">
            <Button type="submit">
              <PlusCircle className="size-4" aria-hidden="true" />
              Criar projeto
            </Button>
          </div>
        </form>
    </CreateRecordDialog>
  );
}

export default async function SelectProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const query = await searchParams;
  const profile = await getWorkspaceProfile();
  const projectPage = await getAccessibleProjectsPage(
    profile.churchId,
    query.pagina,
  );

  return (
    <div className="space-y-6">
      <section className="max-w-2xl">
        <p className="text-sm font-medium text-primary">Área de trabalho</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Escolha um projeto</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cada acesso mantém cotações, despesas, pagamentos e relatórios separados.
        </p>
      </section>

      {profile.role === "admin" ? (
        <>
          <Card className="border-primary/20 bg-primary/[0.03]">
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">Resumo geral de Administrador</p>
                  <p className="text-sm text-muted-foreground">Acesse a visão consolidada sem misturar a operação dos projetos.</p>
                </div>
              </div>
              <Button variant="outline" render={<Link href="/admin/resumo-geral" />}>Ver resumo geral</Button>
            </CardContent>
          </Card>
          <CreateProjectDialog />
        </>
      ) : null}

      {projectPage.count === 0 ? (
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Você ainda não possui acesso a nenhum projeto. Solicite ao Administrador o vínculo correto.
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4" aria-label="Projetos disponíveis">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projectPage.items.map((project) => (
            <Card key={project.id} className="flex min-h-52 flex-col">
              <CardHeader>
                <CardDescription className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2"><FolderKanban className="size-4" aria-hidden="true" />{project.project_type || "Projeto"}</span>
                  <Badge variant="secondary">{statusLabel[project.status] || project.status}</Badge>
                </CardDescription>
                <CardTitle className="pt-2 text-lg">{project.name}</CardTitle>
              </CardHeader>
              <CardContent className="mt-auto space-y-4">
                <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">{project.description || "Sem descrição cadastrada."}</p>
                <Button className="w-full" render={<Link href={`/projetos/${project.id}/dashboard`} />}>
                  Abrir projeto <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          ))}
          </div>
          <Pagination page={projectPage.page} totalPages={projectPage.totalPages} label="projetos disponíveis" />
        </section>
      )}
    </div>
  );
}
