import { createClient } from "@supabase/supabase-js";

// This client uses the SERVICE ROLE key and must only ever be imported from
// server-side code (Netlify Functions). It is never bundled into the
// frontend because the frontend build (Vite) only includes files under
// src/, not netlify/functions/.
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  // Fail loudly at cold start rather than silently misbehaving.
  // eslint-disable-next-line no-console
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

export const supabase = createClient(url ?? "", serviceKey ?? "", {
  auth: { persistSession: false, autoRefreshToken: false }
});
