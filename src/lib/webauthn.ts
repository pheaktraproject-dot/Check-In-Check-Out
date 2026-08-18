import { startRegistration, startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { api } from "./api";

export { browserSupportsWebAuthn };

export async function registerPasskey(nickname?: string): Promise<void> {
  const { options } = await api.post<{ options: any }>("/webauthn-register-options");
  const response = await startRegistration(options);
  await api.post("/webauthn-register-verify", { response, nickname });
}

export async function loginWithPasskey(email: string): Promise<{ token: string; user: any }> {
  const { options, hasPasskey } = await api.post<{ options: any; hasPasskey: boolean }>(
    "/webauthn-login-options",
    { email }
  );
  if (!hasPasskey) {
    throw new Error("NO_PASSKEY");
  }
  const response = await startAuthentication(options);
  return api.post<{ token: string; user: any }>("/webauthn-login-verify", { email, response });
}
