import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnvironment } from "./config";

export function createClient() {
  const { url, key } = getSupabaseEnvironment();
  return createBrowserClient(url, key);
}
