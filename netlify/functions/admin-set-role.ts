import type { Handler } from "@netlify/functions";
import { supabase } from "./_lib/supabase";
import { ok, fail, parseBody } from "./_lib/http";
import { requireAdmin } from "./_lib/auth";
import { logAction } from "./_lib/settings";

interface Body {
  userId: string;
  role?: "staff" | "admin";
  isActive?: boolean;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return fail(405, "Method not allowed");

  let admin;
  try {
    admin = await requireAdmin(event as any);
  } catch {
    return fail(403, "Admin access required.");
  }

  let body: Body;
  try {
    body = parseBody<Body>(event);
  } catch {
    return fail(400, "Invalid request body");
  }

  if (!body.userId) return fail(400, "userId is required.");

  const update: Record<string, unknown> = {};
  if (body.role) update.role = body.role;
  if (typeof body.isActive === "boolean") update.is_active = body.isActive;

  if (Object.keys(update).length === 0) return fail(400, "Nothing to update.");

  const { error } = await supabase.from("users").update(update).eq("id", body.userId);
  if (error) return fail(500, "Could not update this account.");

  await logAction(admin.id, "admin_update_staff", { targetUserId: body.userId, update });

  return ok({ success: true });
};
