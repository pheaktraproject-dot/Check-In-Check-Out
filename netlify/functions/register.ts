import type { Handler } from "@netlify/functions";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { supabase } from "./_lib/supabase";
import { ok, fail, parseBody } from "./_lib/http";
import { logAction } from "./_lib/settings";
import { sendEmail, verificationEmailHtml } from "./_lib/email";

const ALLOWED_DOMAIN = (process.env.VITE_ALLOWED_EMAIL_DOMAIN ?? "alongsiders.org").toLowerCase();
const ORIGIN = process.env.ORIGIN ?? "http://localhost:5173";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
  const verificationToken = crypto.randomBytes(32).toString("base64url");
  const verificationExpires = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const { data: created, error } = await supabase
    .from("users")
    .insert({
      name,
      email,
      password_hash: passwordHash,
      role: "staff",
      email_verified: false,
      verification_token: verificationToken,
      verification_expires: verificationExpires
    })
    .select("id, name, email, role")
    .single();

  if (error || !created) {
    return fail(500, "Could not create account. Please try again.");
  }

  await logAction(created.id, "register", { email });

  const verifyUrl = `${ORIGIN}/verify-email?token=${verificationToken}`;
  try {
    await sendEmail(email, "Confirm your Alongsiders Attendance account", verificationEmailHtml(name, verifyUrl));
  } catch {
    // The account was created either way — the person can request the email
    // again from the login page if it doesn't arrive.
    await logAction(created.id, "verification_email_failed");
  }

  // No session token is issued here on purpose. The account cannot be used
  // to log in (password or passkey) until the email link is clicked.
  return ok(
    {
      message: "Account created. Please check your email to confirm your address before signing in."
    },
    201
  );
};
