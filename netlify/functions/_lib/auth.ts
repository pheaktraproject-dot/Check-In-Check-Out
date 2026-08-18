import jwt from "jsonwebtoken";
import { supabase } from "./supabase";

export interface SessionPayload {
  sub: string; // user id
  email: string;
  role: "staff" | "admin";
}

const JWT_SECRET = process.env.JWT_SECRET ?? "";

export function signSession(payload: SessionPayload): string {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

export function verifySession(token: string): SessionPayload {
  return jwt.verify(token, JWT_SECRET) as SessionPayload;
}

/**
 * Extracts and verifies the bearer token from an incoming request, then
 * confirms the user still exists and is active in the database (so a
 * disabled account can't keep using an old, still-unexpired token).
 * Throws on any failure — callers should catch and return 401.
 */
export async function requireUser(event: { headers: Record<string, string | undefined> }) {
  const authHeader = event.headers.authorization ?? event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing bearer token");
  }
  const token = authHeader.slice("Bearer ".length);
  const payload = verifySession(token);

  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, is_active")
    .eq("id", payload.sub)
    .single();

  if (error || !data || !data.is_active) {
    throw new Error("User not found or inactive");
  }

  return data as { id: string; name: string; email: string; role: "staff" | "admin"; is_active: boolean };
}

export async function requireAdmin(event: { headers: Record<string, string | undefined> }) {
  const user = await requireUser(event);
  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return user;
}
