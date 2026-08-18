import type { Handler } from "@netlify/functions";
import crypto from "crypto";
import { supabase } from "./_lib/supabase";
import { ok, fail, parseBody } from "./_lib/http";
import { logAction } from "./_lib/settings";
import { sendEmail, verificationEmailHtml } from "./_lib/email";

const ORIGIN = process.env.ORIGIN ?? "http://localhost:5173";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

interface Body {
  email: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return fail(405, "Method not allowed");

  let body: Body;
  try {
    body = parseBody<Body>(event);
  } catch {
    return fail(400, "Invalid request body");
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) return fail(400, "Email is required.");

  const { data: user } = await supabase
    .from("users")
    .select("id, name, email, email_verified, is_active")
    .eq("email", email)
    .maybeSingle();

  // Always return the same generic message, whether or not the account
  // exists or is already verified — this prevents someone from using this
  // endpoint to check which emails are registered.
  const genericResponse = { message: "If that account needs confirming, a new email is on its way." };

  if (!user || !user.is_active || user.email_verified) {
    return ok(genericResponse);
  }

  const verificationToken = crypto.randomBytes(32).toString("base64url");
  const verificationExpires = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  await supabase
    .from("users")
    .update({ verification_token: verificationToken, verification_expires: verificationExpires })
    .eq("id", user.id);

  const verifyUrl = `${ORIGIN}/verify-email?token=${verificationToken}`;
  try {
    await sendEmail(user.email, "Confirm your Alongsiders Attendance account", verificationEmailHtml(user.name, verifyUrl));
    await logAction(user.id, "verification_email_resent");
  } catch {
    await logAction(user.id, "verification_email_failed");
  }

  return ok(genericResponse);
};
