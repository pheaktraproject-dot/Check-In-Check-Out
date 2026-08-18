import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";

const ALLOWED_DOMAIN = "alongsiders.org";

type Step = "form" | "check-email";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
      setError(`Please use your @${ALLOWED_DOMAIN} email address.`);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      await api.post("/register", {
        name: name.trim(),
        email: trimmedEmail,
        password
      });
      setStep("check-email");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "check-email") {
    return (
      <CenteredCard>
        <h1 className="font-display text-2xl text-forest-700">Check your email</h1>
        <p className="mt-2 text-sm text-forest-400">
          We've sent a confirmation link to <strong>{email.trim().toLowerCase()}</strong>. Click the link in that
          email to activate your account, then come back and sign in.
        </p>
        <p className="mt-3 text-sm text-forest-400">
          Didn't get it? Check your spam folder, or{" "}
          <Link to="/login" className="font-medium text-forest-600 underline">
            go to the sign-in page
          </Link>{" "}
          to request a new link.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="mt-6 w-full rounded-full bg-forest-600 py-3 font-medium text-white"
        >
          Go to Sign In
        </button>
      </CenteredCard>
    );
  }

  return (
    <CenteredCard>
      <h1 className="font-display text-2xl text-forest-700">Register your account</h1>
      <p className="mt-1 text-sm text-forest-400">Use your official Alongsiders email address.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="Full Name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl2 border border-forest-100 bg-white px-4 py-3 outline-none focus:border-forest-600"
          />
        </Field>
        <Field label="Alongsiders Email">
          <input
            type="email"
            required
            placeholder="john@alongsiders.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl2 border border-forest-100 bg-white px-4 py-3 outline-none focus:border-forest-600"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl2 border border-forest-100 bg-white px-4 py-3 outline-none focus:border-forest-600"
          />
        </Field>

        {error && <p className="rounded-xl2 bg-clay-400/10 px-3 py-2 text-sm text-clay-500">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-forest-600 py-3 font-medium text-white disabled:opacity-50"
        >
          {busy ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-forest-400">
        Already registered?{" "}
        <Link to="/login" className="font-medium text-forest-600 underline">
          Sign in
        </Link>
      </p>
    </CenteredCard>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-xl2 bg-white/60 p-2">
        <div className="rounded-xl2 bg-white p-6 shadow-sm">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">{label}</label>
      {children}
    </div>
  );
}
