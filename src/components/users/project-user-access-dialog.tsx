"use client";

import { Pencil, UserPlus } from "lucide-react";

import { manageProjectMembership } from "@/lib/actions/base-registers";
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

export type ProjectUserAccess = {
  role: "admin" | "financeiro" | "aprovador" | "visualizador";
  status: "ativo" | "inativo";
};

type ProjectUserAccessDialogProps = {
  user: { id: string; name: string; email: string; status: "ativo" | "inativo" };
  membership?: ProjectUserAccess;
  projectId: string;
  projectName: string;
  canAdd: boolean;
};

const roleLabel: Record<ProjectUserAccess["role"], string> = {
  admin: "Administrador do projeto",
  financeiro: "Financeiro",
  aprovador: "Aprovador",
  visualizador: "Visualizador",
};

export function ProjectUserAccessDialog({
  user,
  membership,
  projectId,
  projectName,
  canAdd,
}: ProjectUserAccessDialogProps) {
  if (!membership && !canAdd) return null;

  const isNew = !membership;

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        {isNew ? <UserPlus className="size-3.5" aria-hidden="true" /> : <Pencil className="size-3.5" aria-hidden="true" />}
        {isNew ? "Conceder acesso" : "Editar acesso"}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? "Conceder acesso ao projeto" : "Editar acesso do usuário"}</DialogTitle>
          <DialogDescription>
            {projectName}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form action={manageProjectMembership} className="space-y-5">
            <input type="hidden" name="projeto_id" value={projectId} />
            <input type="hidden" name="usuario_id" value={user.id} />
            <input type="hidden" name="retorno" value={`/projetos/${projectId}/usuarios`} />

            <section className="rounded-lg border bg-muted/30 p-3" aria-label="Usuário selecionado">
              <p className="font-medium">{user.name}</p>
              <p className="break-all text-sm text-muted-foreground">{user.email}</p>
              {user.status !== "ativo" ? <Badge className="mt-2" variant="destructive">Perfil global inativo</Badge> : null}
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Função no projeto
                <select
                  className="h-9 rounded-lg border border-input bg-background px-3"
                  name="funcao_projeto"
                  defaultValue={membership?.role ?? "visualizador"}
                >
                  {Object.entries(roleLabel).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Status do acesso
                <select
                  className="h-9 rounded-lg border border-input bg-background px-3"
                  name="status"
                  defaultValue={membership?.status ?? "ativo"}
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </label>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              A função é válida somente neste projeto. Alterar ou inativar o vínculo não modifica o perfil global da pessoa.
            </p>
            <Button type="submit">{isNew ? "Conceder acesso" : "Salvar alterações"}</Button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
