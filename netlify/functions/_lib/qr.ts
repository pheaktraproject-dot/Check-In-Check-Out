import { supabase } from "./supabase";

export class QrValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QrValidationError";
  }
}

/**
 * Confirms a scanned QR token is real and has not expired. Does not
 * "consume" the token — the same still-valid token can be used by many
 * different staff members within its short window, which is expected
 * (it's a shared screen), but it can never be reused once it expires,
 * and the admin can invalidate it early by generating a new one.
 */
export async function validateQrToken(rawScannedValue: string): Promise<void> {
  let token: string;
  try {
    const parsed = JSON.parse(rawScannedValue);
    token = parsed.t;
  } catch {
    // Fall back to treating the scanned value as the raw token string.
    token = rawScannedValue;
  }

  if (!token) throw new QrValidationError("This QR code has expired. Please scan the current QR code.");

  const { data: row } = await supabase
    .from("qr_tokens")
    .select("expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!row || new Date(row.expires_at) < new Date()) {
    throw new QrValidationError("This QR code has expired. Please scan the current QR code.");
  }
}
