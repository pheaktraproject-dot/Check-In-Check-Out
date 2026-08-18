import type { Handler } from "@netlify/functions";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { supabase } from "./_lib/supabase";
import { ok, fail, parseBody } from "./_lib/http";
import { requireUser } from "./_lib/auth";
import { logAction } from "./_lib/settings";

const RP_ID = process.env.RP_ID ?? "localhost";
const ORIGIN = process.env.ORIGIN ?? "http://localhost:5173";

interface VerifyBody {
  response: unknown;
  nickname?: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return fail(405, "Method not allowed");

  let user;
  try {
    user = await requireUser(event as any);
  } catch {
    return fail(401, "Please log in again.");
  }

  let body: VerifyBody;
  try {
    body = parseBody<VerifyBody>(event);
  } catch {
    return fail(400, "Invalid request body");
  }

  const { data: challengeRow } = await supabase
    .from("webauthn_challenges")
    .select("challenge, expires_at")
    .eq("user_id", user.id)
    .eq("challenge_type", "registration")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!challengeRow || new Date(challengeRow.expires_at) < new Date()) {
    return fail(400, "This setup request expired. Please try adding your passkey again.");
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response as any,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID
    });
  } catch (err) {
    return fail(400, "We couldn't verify that passkey. Please try again.");
  }

  if (!verification.verified || !verification.registrationInfo) {
    return fail(400, "We couldn't verify that passkey. Please try again.");
  }

  const info = verification.registrationInfo;

  // Only the public key and metadata are stored below. The actual
  // fingerprint / Face ID data never leaves the user's device — it is not
  // part of this response at all.
  const { error } = await supabase.from("webauthn_credentials").insert({
    user_id: user.id,
    credential_id: info.credentialID,
    public_key: Buffer.from(info.credentialPublicKey).toString("base64url"),
    counter: info.counter,
    device_type: info.credentialDeviceType,
    backed_up: info.credentialBackedUp,
    transports: (body.response as any)?.response?.transports ?? [],
    nickname: body.nickname ?? null
  });

  if (error) {
    return fail(500, "Could not save your passkey. Please try again.");
  }

  await supabase.from("webauthn_challenges").delete().eq("user_id", user.id).eq("challenge_type", "registration");
  await logAction(user.id, "passkey_registered");

  return ok({ success: true });
};
