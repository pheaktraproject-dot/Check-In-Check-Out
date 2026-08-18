import type { Handler } from "@netlify/functions";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { supabase } from "./_lib/supabase";
import { ok, fail, parseBody } from "./_lib/http";
import { signSession } from "./_lib/auth";
import { logAction } from "./_lib/settings";

const RP_ID = process.env.RP_ID ?? "localhost";
const ORIGIN = process.env.ORIGIN ?? "http://localhost:5173";

interface Body {
  email: string;
  response: { id: string; rawId: string; [key: string]: unknown };
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
  if (!email || !body.response) return fail(400, "Missing email or passkey response.");

  const { data: user } = await supabase
    .from("users")
    .select("id, name, email, role, is_active")
    .eq("email", email)
    .maybeSingle();

  if (!user || !user.is_active) {
    await logAction(null, "passkey_login_failed", { email, reason: "not_found_or_inactive" });
    return fail(401, "We couldn't sign you in. Please try again.");
  }

  const { data: credRow } = await supabase
    .from("webauthn_credentials")
    .select("*")
    .eq("credential_id", body.response.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!credRow) {
    await logAction(user.id, "passkey_login_failed", { reason: "unknown_credential" });
    return fail(401, "This passkey is not registered to this account.");
  }

  const { data: challengeRow } = await supabase
    .from("webauthn_challenges")
    .select("challenge, expires_at")
    .eq("user_id", user.id)
    .eq("challenge_type", "authentication")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!challengeRow || new Date(challengeRow.expires_at) < new Date()) {
    return fail(400, "This sign-in request expired. Please try again.");
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response as any,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: credRow.credential_id,
        credentialPublicKey: Buffer.from(credRow.public_key, "base64url"),
        counter: Number(credRow.counter),
        transports: credRow.transports ?? undefined
      }
    });
  } catch {
    await logAction(user.id, "passkey_login_failed", { reason: "verification_error" });
    return fail(401, "We couldn't verify that passkey. Please try again.");
  }

  if (!verification.verified) {
    await logAction(user.id, "passkey_login_failed", { reason: "not_verified" });
    return fail(401, "We couldn't verify that passkey. Please try again.");
  }

  // Update the stored counter (replay-attack protection) and last-used time.
  await supabase
    .from("webauthn_credentials")
    .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
    .eq("id", credRow.id);

  await supabase.from("webauthn_challenges").delete().eq("user_id", user.id).eq("challenge_type", "authentication");

  const token = signSession({ sub: user.id, email: user.email, role: user.role });
  await logAction(user.id, "passkey_login_success");

  return ok({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
};
