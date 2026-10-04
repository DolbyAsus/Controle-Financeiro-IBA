import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnvironment } from "./config";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnvironment();

  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // The proxy refreshes a session before Server Components render.
        }
      },
    },
  });
}
