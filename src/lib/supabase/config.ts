export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return { url, key };
}

export function getPasswordRecoveryUrl() {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const browserOrigin =
    typeof window === "undefined" ? undefined : window.location.origin;
  const candidate = configuredOrigin || browserOrigin;
  if (!candidate)
    throw new Error(
      "Defina NEXT_PUBLIC_SITE_URL para os redirecionamentos de autenticação.",
    );
  const url = new URL(candidate);
  const isLocalHttp =
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (url.protocol !== "https:" && !isLocalHttp)
    throw new Error("A URL da aplicação precisa usar HTTPS.");
  return `${url.origin}/auth/callback`;
}
