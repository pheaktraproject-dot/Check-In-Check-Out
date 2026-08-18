import type { Handler } from "@netlify/functions";
import bcrypt from "bcryptjs";
import { supabase } from "./_lib/supabase";
import { ok, fail, parseBody } from "./_lib/http";
import { signSession } from "./_lib/auth";
import { logAction } from "./_lib/settings";

interface LoginBody {
  email: string;
  password: string;
}

// Password login exists only as a bootstrap step: right after registration,
// before a passkey has been set up on the device, and as a fallback if
// someone needs to add a passkey from a new device. Day-to-day check-in and
// check-out is designed around the WebAuthn (passkey) flow instead.
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return fail(405, "Method not allowed");

  let body: LoginBody;
  try {
    body = parseBody<LoginBody>(event);
  } catch {
    return fail(400, "Invalid request body");
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) return fail(400, "Email and password are required.");

  const { data: user } = await supabase
    .from("users")
    .select("id, name, email, password_hash, role, is_active")
    .eq("email", email)
    .maybeSingle();

  if (!user || !user.is_active) {
    await logAction(null, "login_failed", { email, reason: "not_found_or_inactive" });
    return fail(401, "Incorrect email or password.");
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    await logAction(user.id, "login_failed", { reason: "bad_password" });
    return fail(401, "Incorrect email or password.");
  }

  const { data: credentials } = await supabase
    .from("webauthn_credentials")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  const token = signSession({ sub: user.id, email: user.email, role: user.role });
  await logAction(user.id, "login_password_success");

  return ok({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    hasPasskey: (credentials ?? []).length > 0
  });
};
