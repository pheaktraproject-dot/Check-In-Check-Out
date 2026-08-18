import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"checking" | "success" | "error">("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This confirmation link is missing its token. Please use the link from your email exactly as sent.");
      return;
    }
    api
      .get<{ message: string }>(`/verify-email?token=${encodeURIComponent(token)}`)
      .then((data) => {
        setStatus("success");
        setMessage(data.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-xl2 bg-white p-6 text-center shadow-sm">
        {status === "checking" && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" />
            <p className="text-forest-400">Confirming your email…</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="font-display text-2xl text-forest-700">Email confirmed</h1>
            <p className="mt-2 text-sm text-forest-400">{message}</p>
            <Link
              to="/login"
              className="mt-6 inline-block w-full rounded-full bg-forest-600 py-3 font-medium text-white"
            >
              Go to Sign In
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="font-display text-2xl text-clay-500">Couldn't confirm your email</h1>
            <p className="mt-2 text-sm text-forest-400">{message}</p>
            <Link
              to="/login"
              className="mt-6 inline-block w-full rounded-full bg-forest-600 py-3 font-medium text-white"
            >
              Go to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
