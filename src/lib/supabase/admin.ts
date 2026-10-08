import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnvironment } from "./config";

export function createAdminClient() {
  const { url } = getSupabaseEnvironment();
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "O serviço de convites ainda não está configurado. Avise o administrador.",
    );
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
