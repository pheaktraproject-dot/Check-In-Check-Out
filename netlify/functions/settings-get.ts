import type { Handler } from "@netlify/functions";
import { ok, fail } from "./_lib/http";
import { requireAdmin } from "./_lib/auth";
import { getSettings } from "./_lib/settings";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return fail(405, "Method not allowed");

  try {
    await requireAdmin(event as any);
  } catch {
    return fail(403, "Admin access required.");
  }

  const settings = await getSettings();
  return ok({ settings });
};
