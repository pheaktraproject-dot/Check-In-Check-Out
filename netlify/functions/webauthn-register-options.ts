import type { Handler } from "@netlify/functions";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { supabase } from "./_lib/supabase";
import { ok, fail } from "./_lib/http";
import { requireUser } from "./_lib/auth";

const RP_ID = process.env.RP_ID ?? "localhost";
const RP_NAME = process.env.RP_NAME ?? "Alongsiders Attendance";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return fail(405, "Method not allowed");

  let user;
  try {
    user = await requireUser(event as any);
  } catch {
    return fail(401, "Please log in again.");
  }

  const { data: existingCreds } = await supabase
    .from("webauthn_credentials")
    .select("credential_id, transports")
    .eq("user_id", user.id);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.email,
    userDisplayName: user.name,
    attestationType: "none",
    excludeCredentials: (existingCreds ?? []).map((c) => ({
      id: c.credential_id,
      transports: (c.transports ?? undefined) as any
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      // Prefer the device's built-in authenticator (fingerprint/Face ID)
      // over a security key, matching the phone-first use case.
      authenticatorAttachment: "platform"
    }
  });

  await supabase.from("webauthn_challenges").delete().eq("user_id", user.id).eq("challenge_type", "registration");
  await supabase.from("webauthn_challenges").insert({
    user_id: user.id,
    challenge: options.challenge,
    challenge_type: "registration",
    expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString()
  });

  return ok({ options });
};
