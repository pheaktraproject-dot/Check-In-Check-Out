import type { Handler } from "@netlify/functions";
import bcrypt from "bcryptjs";
import { supabase } from "./_lib/supabase";
import { ok, fail, parseBody } from "./_lib/http";
import { signSession } from "./_lib/auth";
import { logAction } from "./_lib/settings";

const ALLOWED_DOMAIN = (process.env.VITE_ALLOWED_EMAIL_DOMAIN ?? "alongsiders.org").toLowerCase();

interface RegisterBody {
  name: string;
  email: string;
  password: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return fail(405, "Method not allowed");

  let body: RegisterBody;
  try {
    body = parseBody<RegisterBody>(event);
  } catch {
    return fail(400, "Invalid request body");
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!name || !email || !password) {
    return fail(400, "Name, email, and password are all required.");
  }

  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    return fail(403, `Please use your @${ALLOWED_DOMAIN} email address.`);
  }

  if (password.length < 8) {
    return fail(400, "Password must be at least 8 characters.");
  }

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return fail(409, "An account with this email already exists. Please log in instead.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { data: created, error } = await supabase
    .from("users")
    .insert({ name, email, password_hash: passwordHash, role: "staff" })
    .select("id, name, email, role")
    .single();

  if (error || !created) {
    return fail(500, "Could not create account. Please try again.");
  }

  await logAction(created.id, "register", { email });

  // Issue a session right away so the client can immediately follow up with
  // a WebAuthn registration ceremony (adding a passkey) while authenticated.
  // From then on, the person logs in with the passkey, not this password.
  const token = signSession({ sub: created.id, email: created.email, role: created.role });

  return ok({ user: created, token }, 201);
};
