"use client";

import { useState, useEffect } from "react";

interface ConnectorLinkSectionProps {
  personId: string;
  initialToken: string | null;
}

export default function ConnectorLinkSection({
  personId,
  initialToken,
}: ConnectorLinkSectionProps) {
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const connectUrl = token && origin
    ? `${origin}/connect/${token}`
    : null;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/people/${personId}/connector-token`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.connectorToken);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    setLoading(true);
    try {
      const res = await fetch(`/api/people/${personId}/connector-token`, {
        method: "DELETE",
      });
      if (res.ok) {
        setToken(null);
        setCopied(false);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!connectUrl) return;
    await navigator.clipboard.writeText(connectUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold text-navy mb-4">Connector Link</h2>

      {!token ? (
        <div>
          <p className="text-sm text-gray-500 mb-3">
            Generate a unique link this connector can use to log interactions
            without logging in.
          </p>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-[#2E75B6] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#245d92] disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Link"}
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              readOnly
              value={connectUrl ?? ""}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-700"
            />
            <button
              onClick={handleCopy}
              className="bg-[#2E75B6] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#245d92] whitespace-nowrap"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={handleRevoke}
            disabled={loading}
            className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Revoking..." : "Revoke Link"}
          </button>
        </div>
      )}
    </div>
  );
}
