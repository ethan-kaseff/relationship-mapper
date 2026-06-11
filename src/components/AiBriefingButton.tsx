"use client";

import { useState } from "react";

interface AiBriefingButtonProps {
  personId: string;
  personName: string;
}

export default function AiBriefingButton({ personId, personName }: AiBriefingButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "streaming" | "done" | "error">("idle");
  const [briefing, setBriefing] = useState("");
  const [error, setError] = useState("");

  async function fetchBriefing() {
    setState("loading");
    setBriefing("");
    setError("");

    try {
      const res = await fetch(`/api/people/${personId}/briefing`);
      if (!res.ok) {
        throw new Error("Failed to generate briefing");
      }
      if (!res.body) {
        throw new Error("No response body");
      }

      setState("streaming");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setBriefing((prev) => prev + decoder.decode(value, { stream: true }));
      }

      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  function dismiss() {
    setState("idle");
    setBriefing("");
  }

  return (
    <div>
      {state === "idle" && (
        <button
          onClick={fetchBriefing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
            />
          </svg>
          Catch me up
        </button>
      )}

      {(state === "loading" || state === "streaming" || state === "done" || state === "error") && (
        <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-indigo-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                />
              </svg>
              <span className="text-sm font-semibold text-indigo-800">
                AI Briefing — {personName}
              </span>
              {state === "streaming" && (
                <span className="inline-block w-1.5 h-4 bg-indigo-400 rounded-sm animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {state === "done" && (
                <button
                  onClick={fetchBriefing}
                  className="text-xs text-indigo-500 hover:text-indigo-700 underline"
                >
                  Regenerate
                </button>
              )}
              {(state === "done" || state === "error") && (
                <button
                  onClick={dismiss}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Dismiss briefing"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {state === "loading" && (
            <div className="flex items-center gap-2 text-sm text-indigo-500">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating briefing…
            </div>
          )}

          {(state === "streaming" || state === "done") && briefing && (
            <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {briefing}
            </div>
          )}

          {state === "error" && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
