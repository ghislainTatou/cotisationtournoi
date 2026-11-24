import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  // Nouvelle clé secrète Supabase (sb_secret_...), avec compatibilité avec l'ancienne service_role (eyJ...).
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase n'est pas configuré. Renseigne SUPABASE_URL et SUPABASE_SECRET_KEY (clé secrète sb_secret_...) dans .env.local.",
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export function errorResponse(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
