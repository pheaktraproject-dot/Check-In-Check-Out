import type { Handler } from "@netlify/functions";
import crypto from "crypto";
import QRCode from "qrcode";
import { supabase } from "./_lib/supabase";
import { ok, fail } from "./_lib/http";
import { requireAdmin } from "./_lib/auth";
import { logAction } from "./_lib/settings";

const TTL_SECONDS = Number(process.env.QR_TOKEN_TTL_SECONDS ?? 30);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return fail(405, "Method not allowed");

  let admin;
  try {
    admin = await requireAdmin(event as any);
  } catch {
    return fail(403, "Admin access required.");
  }

  // Invalidate any still-valid token immediately, so clicking
  // "Generate New QR Code" can't leave two codes usable at once.
  await supabase.from("qr_tokens").update({ expires_at: new Date().toISOString() }).gt("expires_at", new Date().toISOString());

  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000);

  const { error } = await supabase.from("qr_tokens").insert({
    token,
    expires_at: expiresAt.toISOString(),
    created_by: admin.id
  });

  if (error) return fail(500, "Could not generate a QR code. Please try again.");

  const qrDataUrl = await QRCode.toDataURL(JSON.stringify({ t: token }), {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 480
  });

  await logAction(admin.id, "qr_generated");

  return ok({
    token,
    expiresAt: expiresAt.toISOString(),
    ttlSeconds: TTL_SECONDS,
    qrDataUrl
  });
};
