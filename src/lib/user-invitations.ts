import type { UserRole } from "@/lib/navigation";

type InvitationInput = {
  name: string;
  email: string;
  role: string;
};

type AuthInviteError = {
  code?: string;
  status?: number;
  message?: string;
};

const userRoles = new Set<UserRole>([
  "admin",
  "financeiro",
  "aprovador",
  "visualizador",
]);

export function normalizeInvitationInput(input: InvitationInput) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (name.length < 2 || name.length > 160)
    throw new Error("Informe um nome entre 2 e 160 caracteres.");

  if (
    email.length > 160 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  )
    throw new Error("Informe um e-mail válido.");

  if (!userRoles.has(input.role as UserRole))
    throw new Error("Selecione uma função válida.");

  return { name, email, role: input.role as UserRole };
}

export function getInvitationErrorMessage(error: AuthInviteError) {
  if (
    error.code === "email_exists" ||
    error.code === "user_already_exists" ||
    error.message?.toLowerCase().includes("already been registered")
  )
    return "Já existe uma conta com este e-mail. Vincule o usuário existente ao projeto ou edite-o na lista global.";

  if (error.code === "over_email_send_rate_limit" || error.status === 429)
    return "O limite temporário de convites foi atingido. Aguarde e tente novamente.";

  if (error.code === "email_provider_disabled")
    return "O envio de convites por e-mail está temporariamente indisponível.";

  return "Não foi possível enviar o convite agora. Tente novamente.";
}
