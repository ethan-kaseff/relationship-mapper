"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { formatCurrency, dollarsToCents } from "@/lib/currency";

interface Fundraiser {
  id: string;
  title: string;
  description: string | null;
  goalAmount: number;
  currentAmount: number;
  presetAmounts: number[];
  slug: string;
  isActive: boolean;
}

export default function DonatePage() {
  const { slug } = useParams<{ slug: string }>();
  const [fundraiser, setFundraiser] = useState<Fundraiser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState("month");
  const [showTribute, setShowTribute] = useState(false);
  const [tributeType, setTributeType] = useState("in_honor_of");
  const [tributeName, setTributeName] = useState("");

  useEffect(() => {
    fetch(`/api/donate/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => setFundraiser(data))
      .catch(() => setError("Fundraiser not found or is no longer active."))
      .finally(() => setLoading(false));
  }, [slug]);

  const amountInCents = selectedPreset || (customAmount ? dollarsToCents(parseFloat(customAmount)) : 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amountInCents < 100) {
      setError("Minimum donation is $1.00");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/donate/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountInCents,
          donorName: isAnonymous ? "Anonymous" : donorName,
          donorEmail,
          isAnonymous,
          isRecurring,
          recurringInterval: isRecurring ? recurringInterval : undefined,
          tributeType: showTribute ? tributeType : undefined,
          tributeName: showTribute ? tributeName : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start checkout");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!fundraiser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Not Found</h1>
          <p className="text-gray-600">{error || "This fundraiser does not exist."}</p>
        </div>
      </div>
    );
  }

  const pct = fundraiser.goalAmount > 0
    ? Math.min(100, Math.round((fundraiser.currentAmount / fundraiser.goalAmount) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{fundraiser.title}</h1>
          {fundraiser.description && (
            <p className="text-gray-600">{fundraiser.description}</p>
          )}
        </div>

        {/* Progress */}
        <div className="bg-white rounded-lg shadow p-5 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-semibold text-gray-900">
              {formatCurrency(fundraiser.currentAmount)} raised
            </span>
            <span className="text-gray-500">
              of {formatCurrency(fundraiser.goalAmount)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Donation form */}
        <div className="bg-white rounded-lg shadow p-6">
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Amount presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Amount
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(fundraiser.presetAmounts as number[]).map((cents) => (
                  <button
                    key={cents}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(cents);
                      setCustomAmount("");
                    }}
                    className={`py-3 rounded-md text-sm font-medium transition-colors ${
                      selectedPreset === cents
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {formatCurrency(cents)}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Or enter custom amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedPreset(null);
                  }}
                  placeholder="0.00"
                  className="w-full pl-7 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Recurring */}
            <div className="border border-gray-200 rounded-md p-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="text-sm text-gray-700">Make this a recurring donation</span>
              </label>
              {isRecurring && (
                <select
                  value={recurringInterval}
                  onChange={(e) => setRecurringInterval(e.target.value)}
                  className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              )}
            </div>

            {/* Donor info */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="text-sm text-gray-700">Donate anonymously</span>
              </label>

              {!isAnonymous && (
                <input
                  placeholder="Your Name"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}

              <input
                type="email"
                placeholder="Email (for receipt)"
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Tribute */}
            <div>
              <button
                type="button"
                onClick={() => setShowTribute(!showTribute)}
                className="text-sm text-indigo-600 hover:underline"
              >
                {showTribute ? "Remove tribute" : "Make this a tribute gift"}
              </button>
              {showTribute && (
                <div className="mt-2 space-y-2">
                  <select
                    value={tributeType}
                    onChange={(e) => setTributeType(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="in_honor_of">In Honor Of</option>
                    <option value="in_memory_of">In Memory Of</option>
                  </select>
                  <input
                    placeholder="Honoree Name"
                    value={tributeName}
                    onChange={(e) => setTributeName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || amountInCents < 100}
              className="w-full bg-indigo-600 text-white py-3 rounded-md font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting
                ? "Redirecting to checkout..."
                : amountInCents >= 100
                  ? `Donate ${formatCurrency(amountInCents)}${isRecurring ? `/${recurringInterval === "year" ? "year" : "month"}` : ""}`
                  : "Select an amount"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
