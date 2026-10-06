import Link from "next/link";
import { FolderKanban, ArrowRight, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAccessibleProjects, getWorkspaceProfile } from "@/lib/project-access";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  planejado: "Planejado",
  em_andamento: "Em andamento",
  pausado: "Pausado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export default async function SelectProjectPage() {
  const [profile, projects] = await Promise.all([
    getWorkspaceProfile(),
    getAccessibleProjects(),
  ]);

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
      ) : null}

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Você ainda não possui acesso a nenhum projeto. Solicite ao Administrador o vínculo correto.
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Projetos disponíveis">
          {projects.map((project) => (
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
        </section>
      )}
    </div>
  );
}
