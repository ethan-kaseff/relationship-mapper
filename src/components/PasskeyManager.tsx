"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, KeyRound, Trash2, ShieldCheck } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";

type Passkey = {
  id: string;
  name: string | null;
  deviceType: string | null;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

// Best-effort friendly default name from the current device.
function defaultDeviceName(): string {
  if (typeof navigator === "undefined") return "This device";
  const ua = navigator.userAgent;
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android phone";
  if (/macintosh|mac os/i.test(ua)) return "Mac";
  if (/windows/i.test(ua)) return "Windows PC";
  return "This device";
}

function formatDate(value: string | null): string {
  if (!value) return "never";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Backstop so a misbehaving authenticator or password-manager extension can't
// leave the UI hanging forever — surfaces a clear error instead of an endless
// "Working…" state.
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

export default function PasskeyManager({ onClose }: { onClose: () => void }) {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/passkey/credentials");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPasskeys(data.passkeys ?? []);
    } catch {
      setError("Could not load your passkeys.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function addPasskey() {
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const optionsRes = await fetch("/api/auth/passkey/register/options", {
        method: "POST",
      });
      if (!optionsRes.ok) throw new Error("Could not start passkey setup");
      const options = await optionsRes.json();

      const registration = await withTimeout(
        startRegistration(options),
        90000,
        "PASSKEY_TIMEOUT"
      );

      const verifyRes = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: registration, name: defaultDeviceName() }),
      });
      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => ({}));
        throw new Error(data.error || "Could not save passkey");
      }
      await load();
      setSuccess("Passkey added — you can now sign in with it.");
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        // User cancelled the OS prompt — stay quiet.
      } else if (err instanceof Error && err.message === "PASSKEY_TIMEOUT") {
        setError(
          "That took too long — a password manager may have interrupted it. Try again, or use your device's built-in Face ID / Touch ID."
        );
      } else {
        setError(err instanceof Error ? err.message : "Could not add passkey");
      }
    } finally {
      setBusy(false);
    }
  }

  async function removePasskey(id: string) {
    if (
      !window.confirm(
        "Remove this passkey? You won't be able to sign in with it anymore."
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/auth/passkey/credentials/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("Could not remove passkey.");
    } finally {
      setBusy(false);
    }
  }

  const hasPasskeys = passkeys.length > 0;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="w-5 h-5 text-indigo-900" />
            <h2 className="text-xl font-bold text-indigo-900">Passkeys</h2>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            Sign in with Face ID, a fingerprint, or your device PIN instead of a
            password. Add one per device you use.
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 text-sm p-3 rounded mb-4">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              {success}
            </div>
          )}

          {loading ? (
            <div className="text-center py-6">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-indigo-900 border-r-transparent" />
            </div>
          ) : !hasPasskeys ? (
            <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded">
              No passkeys yet. Add one to enable passkey sign-in.
            </p>
          ) : (
            <ul className="space-y-2 mb-5">
              {passkeys.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 border border-gray-200 rounded px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                      <span className="truncate">{p.name || "Passkey"}</span>
                      {p.backedUp && (
                        <ShieldCheck
                          className="w-3.5 h-3.5 text-green-600 shrink-0"
                          aria-label="Synced across devices"
                        />
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      Added {formatDate(p.createdAt)} · Last used{" "}
                      {formatDate(p.lastUsedAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => removePasskey(p.id)}
                    disabled={busy}
                    className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 shrink-0"
                    aria-label="Remove passkey"
                    title="Remove passkey"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={addPasskey}
            disabled={busy}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded font-medium transition-colors disabled:opacity-50 ${
              hasPasskeys
                ? "border border-indigo-900 text-indigo-900 hover:bg-indigo-50"
                : "bg-indigo-900 text-white hover:bg-opacity-90"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            {busy
              ? "Working…"
              : hasPasskeys
                ? "Add another passkey"
                : "Add a passkey"}
          </button>

          {hasPasskeys && !busy && (
            <button
              onClick={onClose}
              className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
