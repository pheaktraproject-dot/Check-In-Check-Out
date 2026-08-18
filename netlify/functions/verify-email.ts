import type { Handler } from "@netlify/functions";
import { supabase } from "./_lib/supabase";
import { ok, fail } from "./_lib/http";
import { logAction } from "./_lib/settings";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return fail(405, "Method not allowed");

  const token = event.queryStringParameters?.token;
  if (!token) return fail(400, "Missing verification token.");

  const { data: user } = await supabase
    .from("users")
    .select("id, email_verified, verification_expires")
    .eq("verification_token", token)
    .maybeSingle();

  if (!user) {
    return fail(400, "This confirmation link is invalid. Please request a new one.");
  }

  if (user.email_verified) {
    return ok({ message: "This email was already confirmed. You can log in now." });
  }

  if (!user.verification_expires || new Date(user.verification_expires) < new Date()) {
    return fail(400, "This confirmation link has expired. Please request a new one.");
  }

  const { error } = await supabase
    .from("users")
    .update({ email_verified: true, verification_token: null, verification_expires: null })
    .eq("id", user.id);

  if (error) return fail(500, "Could not confirm your email. Please try again.");

  await logAction(user.id, "email_verified");

  return ok({ message: "Your email has been confirmed. You can log in now." });
};
