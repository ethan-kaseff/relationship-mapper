"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/currency";

interface ReportRow {
  id: string;
  donorName: string;
  isOrg: boolean;
  listedAs: string | null;
  solicitor: string | null;
  status: string;
  sponsorshipLevel: string | null;
  askAmount: number | null;
  pledgeAmount: number | null;
  pledgeDate: string | null;
  receivedThis: number;
  palWrittenAt: string | null;
  palSentAt: string | null;
  calWrittenAt: string | null;
  calSentAt: string | null;
  nfgEntered: boolean;
  nfgUpdated: boolean;
  notes: string[];
  pastDonor: boolean;
  lastEventDonationDate: string | null;
  priorPledgeAmount: number | null;
  priorReceived: number | null;
  priorStatus: string | null;
}

interface ReportData {
  fundraiserTitle: string;
  compareTitle: string | null;
  generatedAt: string;
  rows: ReportRow[];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Not Asked",
  SENT: "Asked",
  PLEDGED: "Pledged",
  DONATED: "Received",
  DECLINED: "Declined",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { timeZone: "UTC", month: "numeric", day: "numeric", year: "2-digit" });
}

function letterStatus(writtenAt: string | null, sentAt: string | null): string {
  if (sentAt) return `Sent ${fmtDate(sentAt)}`;
  if (writtenAt) return "Written";
  return "";
}

export default function CommitteeReportTab({ fundraiserId }: { fundraiserId: string }) {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [solicitorFilter, setSolicitorFilter] = useState("");
  const [compareId, setCompareId] = useState("");
  const [fundraiserOptions, setFundraiserOptions] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    fetch("/api/fundraisers")
      .then((r) => r.json())
      .then((list) => {
        const opts = (Array.isArray(list) ? list : [])
          .filter((f: { id: string }) => f.id !== fundraiserId)
          .map((f: { id: string; title: string }) => ({ id: f.id, title: f.title }));
        setFundraiserOptions(opts);
      })
      .catch(() => {});
  }, [fundraiserId]);

  const load = useCallback(() => {
    setLoading(true);
    const url = `/api/fundraisers/${fundraiserId}/committee-report${compareId ? `?compareToFundraiserId=${compareId}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [fundraiserId, compareId]);

  useEffect(() => { load(); }, [load]);

  const solicitors = data
    ? Array.from(new Set(data.rows.map((r) => r.solicitor).filter((s): s is string => !!s))).sort()
    : [];

  const rows = (data?.rows ?? []).filter((r) => !solicitorFilter || r.solicitor === solicitorFilter);

  const totalAsk = rows.reduce((s, r) => s + (r.askAmount ?? 0), 0);
  const totalPledged = rows.reduce((s, r) => s + (r.pledgeAmount ?? 0), 0);
  const totalReceived = rows.reduce((s, r) => s + r.receivedThis, 0);
  const showPrior = !!data?.compareTitle;

  function exportCSV() {
    const headers = [
      "Name", "Listed As", "Org?", "Solicitor", "Status", "Sponsorship Level Ask",
      "Ask Amount", "Pledge Amount", "Pledge Date", "Received", "PAL", "CAL",
      "In NFG", "NFG Updated", "Past Donor", "Last Event Gift",
      ...(showPrior ? [`${data!.compareTitle} Pledge`, `${data!.compareTitle} Received`, `${data!.compareTitle} Status`] : []),
      "Notes",
    ];
    const body = rows.map((r) => [
      r.donorName, r.listedAs ?? "", r.isOrg ? "Yes" : "", r.solicitor ?? "",
      STATUS_LABELS[r.status] ?? r.status, r.sponsorshipLevel ?? "",
      r.askAmount != null ? (r.askAmount / 100).toFixed(2) : "",
      r.pledgeAmount != null ? (r.pledgeAmount / 100).toFixed(2) : "",
      fmtDate(r.pledgeDate), r.receivedThis ? (r.receivedThis / 100).toFixed(2) : "",
      letterStatus(r.palWrittenAt, r.palSentAt), letterStatus(r.calWrittenAt, r.calSentAt),
      r.nfgEntered ? "Yes" : "", r.nfgUpdated ? "Yes" : "",
      r.pastDonor ? "Yes" : "", fmtDate(r.lastEventDonationDate),
      ...(showPrior ? [
        r.priorPledgeAmount != null ? (r.priorPledgeAmount / 100).toFixed(2) : "",
        r.priorReceived != null && r.priorReceived > 0 ? (r.priorReceived / 100).toFixed(2) : "",
        r.priorStatus ? (STATUS_LABELS[r.priorStatus] ?? r.priorStatus) : "",
      ] : []),
      r.notes.join(" | "),
    ]);
    const csv = [headers, ...body]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "committee-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="text-gray-500 py-8 text-center">Building report…</div>;
  if (!data) return <div className="text-red-600 py-8 text-center">Couldn&apos;t load the report.</div>;

  return (
    <div className="space-y-4">
      {/* Toolbar — hidden when printing */}
      <div className="bg-white rounded-lg shadow p-4 print-hide">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-indigo-900">Committee Report</h2>
            <p className="text-sm text-gray-500">
              {rows.length} solicitation{rows.length !== 1 ? "s" : ""} · {formatCurrency(totalAsk)} asked · {formatCurrency(totalPledged)} pledged · {formatCurrency(totalReceived)} received
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={solicitorFilter}
              onChange={(e) => setSolicitorFilter(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All solicitors</option>
              {solicitors.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={compareId}
              onChange={(e) => setCompareId(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              title="Compare against a prior fundraiser"
            >
              <option value="">No prior-year comparison</option>
              {fundraiserOptions.map((f) => <option key={f.id} value={f.id}>Compare to: {f.title}</option>)}
            </select>
            <button onClick={exportCSV} className="px-3 py-1.5 text-sm border border-indigo-300 text-indigo-600 rounded-md hover:bg-indigo-50">
              Export CSV
            </button>
            <button onClick={() => window.print()} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Printed heading */}
      <div className="print-only mb-3">
        <h1 className="text-xl font-bold">{data.fundraiserTitle} — Committee Report</h1>
        <p className="text-sm">
          {solicitorFilter ? `Solicitor: ${solicitorFilter} · ` : ""}
          Generated {new Date(data.generatedAt).toLocaleDateString("en-US")}
          {data.compareTitle ? ` · Compared to ${data.compareTitle}` : ""}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No solicitations to report.</p>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-50 border-b text-left">
              <tr>
                <th className="px-2 py-2 font-semibold text-indigo-900">Name</th>
                <th className="px-2 py-2 font-semibold text-indigo-900">Solicitor</th>
                <th className="px-2 py-2 font-semibold text-indigo-900">Status</th>
                <th className="px-2 py-2 font-semibold text-indigo-900 text-right">Ask</th>
                <th className="px-2 py-2 font-semibold text-indigo-900 text-right">Pledge</th>
                <th className="px-2 py-2 font-semibold text-indigo-900 text-right">Received</th>
                <th className="px-2 py-2 font-semibold text-indigo-900">PAL</th>
                <th className="px-2 py-2 font-semibold text-indigo-900">CAL</th>
                <th className="px-2 py-2 font-semibold text-indigo-900">NFG</th>
                <th className="px-2 py-2 font-semibold text-indigo-900">Prior Gift</th>
                {showPrior && <th className="px-2 py-2 font-semibold text-indigo-900 text-right">{data.compareTitle}</th>}
                <th className="px-2 py-2 font-semibold text-indigo-900">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 align-top">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2">
                    <div className="font-medium text-gray-900">{r.donorName}{r.isOrg && <span className="text-gray-400 font-normal"> (org)</span>}</div>
                    {r.listedAs && <div className="text-gray-400">Listed: {r.listedAs}</div>}
                    {r.sponsorshipLevel && <div className="text-gray-400">{r.sponsorshipLevel}</div>}
                  </td>
                  <td className="px-2 py-2 text-gray-600">{r.solicitor ?? "—"}</td>
                  <td className="px-2 py-2 text-gray-700">{STATUS_LABELS[r.status] ?? r.status}</td>
                  <td className="px-2 py-2 text-right text-gray-600">{r.askAmount != null ? formatCurrency(r.askAmount) : "—"}</td>
                  <td className="px-2 py-2 text-right font-medium">{r.pledgeAmount != null ? formatCurrency(r.pledgeAmount) : "—"}</td>
                  <td className="px-2 py-2 text-right text-green-700">{r.receivedThis ? formatCurrency(r.receivedThis) : "—"}</td>
                  <td className="px-2 py-2 text-gray-600">{letterStatus(r.palWrittenAt, r.palSentAt) || "—"}</td>
                  <td className="px-2 py-2 text-gray-600">{letterStatus(r.calWrittenAt, r.calSentAt) || "—"}</td>
                  <td className="px-2 py-2 text-gray-600">{r.nfgEntered ? (r.nfgUpdated ? "✓✓" : "✓") : "—"}</td>
                  <td className="px-2 py-2 text-gray-600">
                    {r.pastDonor ? "Yes" : "No"}
                    {r.lastEventDonationDate && <div className="text-gray-400">{fmtDate(r.lastEventDonationDate)}</div>}
                  </td>
                  {showPrior && (
                    <td className="px-2 py-2 text-right text-gray-600">
                      {r.priorPledgeAmount != null ? formatCurrency(r.priorPledgeAmount) : "—"}
                      {r.priorStatus && <div className="text-gray-400">{STATUS_LABELS[r.priorStatus] ?? r.priorStatus}</div>}
                    </td>
                  )}
                  <td className="px-2 py-2 text-gray-600 min-w-[12rem]">
                    {r.notes.length === 0 ? "—" : (
                      <ul className="space-y-0.5">
                        {r.notes.map((n, i) => <li key={i}>{n}</li>)}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
