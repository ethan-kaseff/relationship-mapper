"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { X, KeyRound } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";

// Backstop so a stalling password-manager extension can't hang the button
// forever — surfaces a clear error instead of an endless spinner.
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

export default function LoginModal({
  onClose,
  notice,
}: {
  onClose: () => void;
  notice?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      setRedirecting(true);
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function handlePasskey() {
    setError("");
    setPasskeyLoading(true);
    try {
      const optionsRes = await fetch("/api/auth/passkey/authenticate/options", {
        method: "POST",
      });
      if (!optionsRes.ok) throw new Error("Could not start passkey sign-in");
      const options = await optionsRes.json();

      const assertion = await withTimeout(
        startAuthentication(options),
        90000,
        "PASSKEY_TIMEOUT"
      );

      const result = await signIn("passkey", {
        response: JSON.stringify(assertion),
        redirect: false,
      });

      if (result?.error) {
        setError("Passkey sign-in failed. Try again or use your password.");
      } else {
        setRedirecting(true);
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        // User cancelled the OS prompt — stay quiet.
      } else if (err instanceof Error && err.message === "PASSKEY_TIMEOUT") {
        setError(
          "That took too long — a password manager may have interrupted it. Try again or use your password."
        );
      } else {
        setError("Passkey sign-in was cancelled or isn't set up on this device.");
      }
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="relative w-full max-w-sm mx-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-2xl font-bold text-indigo-900 text-center mb-6">
            Sign In
          </h2>

          {notice && (
            <div className="bg-amber-50 text-amber-700 text-sm p-3 rounded mb-4 text-center">
              {notice}
            </div>
          )}

          {redirecting ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-900 border-r-transparent mb-4" />
              <p className="text-gray-600 text-sm">Loading dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="modal-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="modal-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="admin@jcrb.org"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="modal-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="modal-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs px-1 py-0.5"
                    tabIndex={-1}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-900 text-white py-2 rounded font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>

              <div className="flex items-center gap-3 pt-1">
                <span className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <span className="h-px flex-1 bg-gray-200" />
              </div>

              <button
                type="button"
                onClick={handlePasskey}
                disabled={passkeyLoading || loading}
                className="w-full flex items-center justify-center gap-2 border border-indigo-900 text-indigo-900 py-2 rounded font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                {passkeyLoading ? "Waiting for passkey…" : "Sign in with a passkey"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
