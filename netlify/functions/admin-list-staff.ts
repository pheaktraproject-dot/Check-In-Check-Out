import type { Handler } from "@netlify/functions";
import { supabase } from "./_lib/supabase";
import { ok, fail } from "./_lib/http";
import { requireAdmin } from "./_lib/auth";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return fail(405, "Method not allowed");

  try {
    await requireAdmin(event as any);
  } catch {
    return fail(403, "Admin access required.");
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, is_active, created_at")
    .order("created_at", { ascending: true });

  if (error) return fail(500, "Could not load staff list.");

  return ok({ staff: data ?? [] });
};
