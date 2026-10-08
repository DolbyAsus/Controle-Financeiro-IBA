"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle, UserPlus } from "lucide-react";

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
import { inviteUser } from "@/lib/actions/base-registers";

type UserInviteDialogProps =
  | { scope: "global" }
  | { scope: "project"; projectId: string; projectName: string };

const globalRoles = [
  ["visualizador", "Visualizador"],
  ["financeiro", "Financeiro"],
  ["aprovador", "Aprovador"],
  ["admin", "Administrador geral"],
] as const;

const projectRoles = [
  ["visualizador", "Visualizador"],
  ["financeiro", "Financeiro"],
  ["aprovador", "Aprovador"],
  ["admin", "Administrador do projeto"],
] as const;

function InviteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <UserPlus className="size-4" aria-hidden="true" />
      )}
      {pending ? "Enviando convite..." : "Enviar convite"}
    </Button>
  );
}

export function UserInviteDialog(props: UserInviteDialogProps) {
  const isProject = props.scope === "project";
  const roles = isProject ? projectRoles : globalRoles;

  return (
    <Dialog>
      <DialogTrigger render={<Button className="w-full sm:w-auto" />}>
        <UserPlus className="size-4" aria-hidden="true" />
        Convidar usuário
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Convidar novo usuário</DialogTitle>
          <DialogDescription>
            {isProject
              ? `O acesso será concedido somente à equipe de ${props.projectName}.`
              : "A pessoa receberá um e-mail para ativar a conta e definir a senha."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form action={inviteUser} className="space-y-5">
            {isProject ? (
              <>
                <input type="hidden" name="projeto_id" value={props.projectId} />
                <input
                  type="hidden"
                  name="retorno"
                  value={`/projetos/${props.projectId}/usuarios`}
                />
              </>
            ) : (
              <input type="hidden" name="retorno" value="/usuarios" />
            )}

            <div className="grid gap-4">
              <label className="grid gap-1.5 text-sm font-medium">
                Nome completo *
                <Input
                  name="nome"
                  autoComplete="name"
                  minLength={2}
                  maxLength={160}
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                E-mail *
                <Input
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={160}
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                {isProject ? "Função no projeto *" : "Função global *"}
                <select
                  className="h-9 rounded-lg border border-input bg-background px-3"
                  name={isProject ? "funcao_projeto" : "funcao"}
                  defaultValue="visualizador"
                  required
                >
                  {roles.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              {isProject
                ? "O perfil global será criado como usuário padrão. A função escolhida valerá somente neste projeto."
                : "O link de convite é individual e expira conforme a política de segurança do aplicativo."}
            </p>
            <InviteSubmitButton />
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
