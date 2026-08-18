import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { loginWithPasskey, browserSupportsWebAuthn } from "../lib/webauthn";
import { useAuth } from "../lib/auth-context";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function afterLogin(token: string, user: any) {
    login(token, user);
    navigate(user.role === "admin" ? "/admin" : "/dashboard");
  }

  async function handlePasskeyLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    if (!email.trim()) {
      setError("Please enter your email first.");
      return;
    }
    setBusy(true);
    try {
      const { token, user } = await loginWithPasskey(email.trim().toLowerCase());
      await afterLogin(token, user);
    } catch (err: any) {
      if (err?.message === "NO_PASSKEY") {
        setShowPassword(true);
        setError("No passkey found for this account yet. Please log in with your password once to set one up.");
      } else if (err?.status === 403) {
        setNeedsVerification(true);
        setError(err.message);
      } else {
        setError("We couldn't sign you in with a passkey. Please try again or use your password.");
        setShowPassword(true);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setBusy(true);
    try {
      const { token, user } = await api.post<{ token: string; user: any }>("/login-password", {
        email: email.trim().toLowerCase(),
        password
      });
      await afterLogin(token, user);
    } catch (err: any) {
      setError(err.message ?? "Incorrect email or password.");
      if (err?.status === 403) setNeedsVerification(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setResendMessage(null);
    setBusy(true);
    try {
      const data = await api.post<{ message: string }>("/resend-verification", {
        email: email.trim().toLowerCase()
      });
      setResendMessage(data.message);
    } catch {
      setResendMessage("Could not send the email right now. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-600 text-2xl font-display text-cream">
            A
          </div>
          <h1 className="font-display text-2xl text-forest-700">Alongsiders Attendance</h1>
          <p className="mt-1 text-sm text-forest-400">Sign in with your staff account</p>
        </div>

        <form onSubmit={handlePasskeyLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Alongsiders Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@alongsiders.org"
              className="w-full rounded-xl2 border border-forest-100 bg-white px-4 py-3 text-ink outline-none focus:border-forest-600"
            />
          </div>

          {error && <p className="rounded-xl2 bg-clay-400/10 px-3 py-2 text-sm text-clay-500">{error}</p>}

          {needsVerification && (
            <div className="rounded-xl2 bg-forest-50 px-3 py-3">
              {resendMessage ? (
                <p className="text-sm text-forest-700">{resendMessage}</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={busy}
                  className="text-sm font-medium text-forest-700 underline disabled:opacity-50"
                >
                  Resend confirmation email
                </button>
              )}
            </div>
          )}

          {!showPassword && (
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-forest-600 py-3 font-medium text-white transition hover:bg-forest-700 disabled:opacity-50"
            >
              {busy ? "Checking…" : "Sign in with Passkey"}
            </button>
          )}
        </form>

        {showPassword && (
          <form onSubmit={handlePasswordLogin} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl2 border border-forest-100 bg-white px-4 py-3 text-ink outline-none focus:border-forest-600"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-forest-600 py-3 font-medium text-white transition hover:bg-forest-700 disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign in with Password"}
            </button>
          </form>
        )}

        {!showPassword && (
          <button
            className="mt-3 w-full text-center text-sm text-forest-400 underline"
            onClick={() => setShowPassword(true)}
          >
            Use password instead
          </button>
        )}

        {!browserSupportsWebAuthn() && (
          <p className="mt-3 text-center text-xs text-clay-500">
            Your browser does not support passkeys. Please use your password to sign in.
          </p>
        )}

        <p className="mt-6 text-center text-sm text-forest-400">
          New staff member?{" "}
          <Link to="/register" className="font-medium text-forest-600 underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
