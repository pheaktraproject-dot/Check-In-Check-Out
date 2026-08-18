import type { Handler } from "@netlify/functions";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { supabase } from "./_lib/supabase";
import { ok, fail, parseBody } from "./_lib/http";

const RP_ID = process.env.RP_ID ?? "localhost";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

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
    .select("id, is_active, email_verified")
    .eq("email", email)
    .maybeSingle();

  // Deliberately vague error so this endpoint can't be used to test which
  // emails have accounts. If there's no matching, active, verified user,
  // still generate options with no allowCredentials — the browser will
  // simply fail to find a matching passkey, and we return the same shape
  // either way.
  const allowCredentials: { id: string; transports?: any }[] = [];
  const eligible = Boolean(user?.is_active && user?.email_verified);

  if (eligible && user) {
    const { data: creds } = await supabase
      .from("webauthn_credentials")
      .select("credential_id, transports")
      .eq("user_id", user.id);

    for (const c of creds ?? []) {
      allowCredentials.push({ id: c.credential_id, transports: c.transports ?? undefined });
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "preferred",
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined
  });

  if (eligible && user) {
    await supabase.from("webauthn_challenges").delete().eq("user_id", user.id).eq("challenge_type", "authentication");
    await supabase.from("webauthn_challenges").insert({
      user_id: user.id,
      challenge: options.challenge,
      challenge_type: "authentication",
      expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString()
    });
  }

  return ok({ options, hasPasskey: allowCredentials.length > 0 });
};
