const ACCEPTED_CALLBACK_TYPES = new Set(["invite", "recovery"]);
const EMAIL_CONFIRMATION_HASH_PREFIX = "#confirmation_url=";

type AuthErrorLike = {
  code?: string;
  status?: number;
};

export type EmailConfirmationType = "invite" | "recovery";

export type EmailConfirmationAction = {
  type: EmailConfirmationType;
  url: string;
};

function decodeUrlCandidate(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getSafeEmailConfirmationAction(
  hash: string,
  supabaseUrl: string,
): EmailConfirmationAction | null {
  if (!hash.startsWith(EMAIL_CONFIRMATION_HASH_PREFIX)) return null;

  try {
    const expectedOrigin = new URL(supabaseUrl).origin;
    const hashValue = hash.slice(EMAIL_CONFIRMATION_HASH_PREFIX.length);
    const candidates = [hashValue, decodeUrlCandidate(hashValue)];

    for (const candidate of candidates) {
      try {
        const url = new URL(candidate);
        const type = url.searchParams.get("type");
        const hasToken = Boolean(
          url.searchParams.get("token") || url.searchParams.get("token_hash"),
        );

        if (
          url.origin === expectedOrigin &&
          url.pathname === "/auth/v1/verify" &&
          type &&
          ACCEPTED_CALLBACK_TYPES.has(type) &&
          hasToken
        )
          return {
            type: type as EmailConfirmationType,
            url: url.toString(),
          };
      } catch {
        continue;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function getImplicitCallbackCredentials(hash: string) {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const type = params.get("type");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (
    !type ||
    !ACCEPTED_CALLBACK_TYPES.has(type) ||
    !accessToken ||
    !refreshToken
  )
    return null;

  return { accessToken, refreshToken };
}

export function hasAuthCallbackError(url: string) {
  const parsedUrl = new URL(url);
  const hashParams = new URLSearchParams(parsedUrl.hash.slice(1));
  return Boolean(
    parsedUrl.searchParams.get("error") ||
      parsedUrl.searchParams.get("error_code") ||
      hashParams.get("error") ||
      hashParams.get("error_code"),
  );
}

export function getRecoveryRequestErrorMessage(error: AuthErrorLike) {
  if (error.code === "captcha_failed")
    return "A verificação de segurança expirou. Conclua-a novamente.";

  if (error.code === "over_email_send_rate_limit" || error.status === 429)
    return "O limite temporário de e-mails foi atingido. Aguarde até uma hora e tente novamente.";

  if (error.code === "email_provider_disabled")
    return "A recuperação por e-mail está temporariamente indisponível. Avise o administrador.";

  return "Não foi possível enviar o link agora. Tente novamente.";
}
