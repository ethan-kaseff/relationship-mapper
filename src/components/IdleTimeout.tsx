"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { logoutTo } from "@/lib/logout";

// Sign a logged-in user out after a period of inactivity, to protect donor and
// financial data on an unattended machine. A warning with a countdown appears
// shortly before logout so nobody loses unsaved work. Tabs share activity via
// localStorage, so being active in any tab keeps them all signed in.
const IDLE_LIMIT_MS = 15 * 60 * 1000; // 15 minutes of inactivity → sign out
const WARNING_MS = 60 * 1000; // show the "Still there?" warning 1 minute before
const ACTIVITY_KEY = "rm:lastActivityAt"; // shared across tabs
const EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"];

export default function IdleTimeout() {
  const { status } = useSession();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null); // null = no warning shown
  const lastActivity = useRef(Date.now());
  const lastWrite = useRef(0);
  const loggingOut = useRef(false);
  const warningActive = useRef(false);

  const authed = status === "authenticated";

  // Passive activity (mouse, keyboard, scroll) keeps the session alive — but
  // only while the warning is NOT showing. Once the warning is up we ignore
  // passive movement, otherwise reaching for the button would dismiss it.
  // Staying signed in then requires an explicit click.
  const registerActivity = useCallback(() => {
    if (warningActive.current) return;
    const now = Date.now();
    lastActivity.current = now;
    if (now - lastWrite.current > 1000) {
      lastWrite.current = now;
      try {
        localStorage.setItem(ACTIVITY_KEY, String(now));
      } catch {
        // localStorage unavailable (private mode, etc.) — per-tab timing still works.
      }
    }
  }, []);

  // Explicit "Stay signed in" click — always resets, even with the warning open.
  const staySignedIn = useCallback(() => {
    const now = Date.now();
    warningActive.current = false;
    lastActivity.current = now;
    lastWrite.current = now;
    setSecondsLeft(null);
    try {
      localStorage.setItem(ACTIVITY_KEY, String(now));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!authed) {
      warningActive.current = false;
      setSecondsLeft(null);
      return;
    }

    loggingOut.current = false;
    warningActive.current = false;
    lastActivity.current = Date.now();

    // Real activity in another tab keeps this one alive too.
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVITY_KEY && e.newValue) {
        lastActivity.current = Math.max(lastActivity.current, Number(e.newValue));
      }
    };

    EVENTS.forEach((evt) =>
      window.addEventListener(evt, registerActivity, { passive: true })
    );
    window.addEventListener("storage", onStorage);

    const interval = setInterval(() => {
      const remaining = IDLE_LIMIT_MS - (Date.now() - lastActivity.current);
      if (remaining <= 0) {
        if (!loggingOut.current) {
          loggingOut.current = true;
          clearInterval(interval);
          logoutTo("/?timeout=1");
        }
      } else if (remaining <= WARNING_MS) {
        warningActive.current = true;
        setSecondsLeft(Math.ceil(remaining / 1000));
      } else {
        warningActive.current = false;
        setSecondsLeft((prev) => (prev === null ? prev : null));
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      EVENTS.forEach((evt) => window.removeEventListener(evt, registerActivity));
      window.removeEventListener("storage", onStorage);
    };
  }, [authed, registerActivity]);

  if (!authed || secondsLeft === null) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4 text-center">
        <h2 className="text-lg font-bold text-indigo-900 mb-2">Still there?</h2>
        <p className="text-sm text-gray-600 mb-4">
          You&apos;ve been inactive for a while. For security, you&apos;ll be signed
          out in{" "}
          <span className="font-semibold text-indigo-900">{secondsLeft}</span> second
          {secondsLeft === 1 ? "" : "s"}.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={staySignedIn}
            className="bg-indigo-900 text-white px-4 py-2 rounded font-medium hover:bg-opacity-90 transition-colors"
          >
            Stay signed in
          </button>
          <button
            onClick={() => logoutTo("/")}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded font-medium hover:bg-gray-50 transition-colors"
          >
            Sign out now
          </button>
        </div>
      </div>
    </div>
  );
}
