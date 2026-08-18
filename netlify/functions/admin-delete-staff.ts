import type { Handler } from "@netlify/functions";
import { supabase } from "./_lib/supabase";
import { ok, fail, parseBody } from "./_lib/http";
import { requireAdmin } from "./_lib/auth";
import { logAction } from "./_lib/settings";

interface Body {
  userId: string;
  confirm: string;
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

  if (body.confirm !== "DELETE") {
    return fail(400, 'Please type DELETE to confirm this cannot be undone.');
  }

  if (body.userId === admin.id) {
    return fail(400, "You cannot delete your own account while logged in as it.");
  }

  const { data: target } = await supabase
    .from("users")
    .select("id, name, email, role")
    .eq("id", body.userId)
    .maybeSingle();

  if (!target) return fail(404, "This account no longer exists.");

  if (target.role === "admin") {
    const { count } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count ?? 0) <= 1) {
      return fail(400, "You cannot delete the last remaining admin account.");
    }
  }

  // Attendance history, past QR codes, and audit log entries are kept for
  // record-keeping — only their reference to this specific person is
  // cleared (see the delete migration). This deletes the account itself
  // and its passkeys.
  const { error } = await supabase.from("users").delete().eq("id", body.userId);
  if (error) return fail(500, "Could not delete this account. Please try again.");

  await logAction(admin.id, "admin_delete_staff", { deletedUserId: target.id, deletedEmail: target.email });

  return ok({ success: true });
};
