const ACCEPTED_CALLBACK_TYPES = new Set(["invite", "recovery"]);

type AuthErrorLike = {
  code?: string;
  status?: number;
};

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

  return "Não foi possível enviar o link agora. Tente novamente.";
}
