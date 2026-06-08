"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FUNDRAISER_NOTICE_FIELDS,
  OPERATORS,
  defaultOperator,
  evaluateFundraiserNotice,
  type NoticeCondition,
  type EvalDonation,
} from "@/lib/notice-fields";

interface FundraiserNotice {
  id: string;
  name: string;
  conditions: NoticeCondition[];
  conditionLogic: "AND" | "OR";
  isActive: boolean;
  displayOrder: number;
}

export interface DonationForEval {
  id: string;
  donorName: string | null;
  isAnonymous: boolean;
  amount: number;
  approvalStatus: string;
  qbSyncStatus: string;
  isRecurring: boolean;
  paymentMethod: string;
  sponsoredSeats: number | null;
  seatsUsed: number | null;
  notes: string | null;
  sponsorshipLevel: { name: string } | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    status: string;
    city: string | null;
    state: string | null;
    zip: string | null;
    phoneNumber: string | null;
    email1: string | null;
    email2: string | null;
    communicationMethod: { name: string } | null;
    assignedTo: { id: string; firstName: string; lastName: string } | null;
    tags: { tag: { id: string; name: string } }[];
    partnerRoles: { partner: { organizationType: { typeName: string } | null } }[];
  } | null;
}

interface Tag { id: string; name: string; }
interface StaffUser { id: string; firstName: string; lastName: string; }

interface FormState {
  name: string;
  conditionLogic: "AND" | "OR";
  conditions: NoticeCondition[];
  isActive: boolean;
}

const EMPTY_FORM: FormState = { name: "", conditionLogic: "AND", conditions: [], isActive: true };

function toEvalDonation(d: DonationForEval): EvalDonation {
  return {
    id: d.id,
    amount: d.amount,
    approvalStatus: d.approvalStatus,
    qbSyncStatus: d.qbSyncStatus,
    isRecurring: d.isRecurring,
    sponsorshipLevelName: d.sponsorshipLevel?.name ?? null,
    paymentMethod: d.paymentMethod,
    sponsoredSeats: d.sponsoredSeats,
    seatsUsed: d.seatsUsed,
    isAnonymous: d.isAnonymous,
    notes: d.notes,
    person: d.person
      ? {
          status: d.person.status,
          city: d.person.city,
          state: d.person.state,
          zip: d.person.zip,
          phoneNumber: d.person.phoneNumber,
          email1: d.person.email1,
          email2: d.person.email2,
          communicationMethod: d.person.communicationMethod?.name ?? null,
          assignedTo: d.person.assignedTo ? { id: d.person.assignedTo.id } : null,
          tags: d.person.tags,
          partnerRoles: d.person.partnerRoles,
        }
      : null,
  };
}

function donorName(d: DonationForEval): string {
  if (d.person) return `${d.person.firstName} ${d.person.lastName}`;
  return d.donorName || "Anonymous";
}

function newCondition(): NoticeCondition {
  const field = FUNDRAISER_NOTICE_FIELDS[0];
  return { id: crypto.randomUUID(), field: field.key, operator: defaultOperator(field.type), value: "" };
}

export default function FundraiserNoticeManager({
  fundraiserId,
  donations,
  sponsorshipLevelNames,
  isAdmin,
  onEvaluatedRowsChange,
}: {
  fundraiserId: string;
  donations: DonationForEval[];
  sponsorshipLevelNames: string[];
  isAdmin: boolean;
  onEvaluatedRowsChange?: (rows: string[][]) => void;
}) {
  const [notices, setNotices] = useState<FundraiserNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManage, setShowManage] = useState(false);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [lookupOptions, setLookupOptions] = useState<Record<string, string[]>>({});

  const fetchNotices = useCallback(async () => {
    const res = await fetch(`/api/event-notices?fundraiserId=${fundraiserId}`);
    if (res.ok) {
      const data = await res.json();
      setNotices(data);
    }
    setLoading(false);
  }, [fundraiserId]);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/tags").then((r) => r.json()).then((d: Tag[]) => setTags(d));
    fetch("/api/users/assignable").then((r) => r.json()).then((d: StaffUser[]) => setStaff(d));
    const fieldsWithUrl = FUNDRAISER_NOTICE_FIELDS.filter((f) => f.optionsUrl);
    fieldsWithUrl.forEach((f) => {
      fetch(f.optionsUrl!).then((r) => r.json()).then((data: Record<string, string>[]) => {
        const key = f.optionsLabelKey ?? "name";
        const opts = data.map((item) => item[key]).filter(Boolean);
        setLookupOptions((prev) => ({ ...prev, [f.key]: opts }));
      });
    });
  }, [isAdmin]);

  const donationFields = FUNDRAISER_NOTICE_FIELDS.filter((f) => f.group === "Donation");
  const personFields = FUNDRAISER_NOTICE_FIELDS.filter((f) => f.group === "Person");

  const evaluated = notices
    .filter((n) => n.isActive)
    .map((n) => ({
      notice: n,
      matching: donations.filter((d) =>
        evaluateFundraiserNotice(toEvalDonation(d), n.conditions, n.conditionLogic)
      ),
    }))
    .filter((r) => r.matching.length > 0);

  useEffect(() => {
    onEvaluatedRowsChange?.(
      evaluated.flatMap(({ notice, matching }) =>
        matching.map((d) => [notice.name, ...donationRow(d)])
      )
    );
  }, [notices]);

  function startEdit(notice: FundraiserNotice) {
    setForm({ name: notice.name, conditionLogic: notice.conditionLogic, conditions: notice.conditions, isActive: notice.isActive });
    setEditingId(notice.id);
  }

  function startNew() {
    setForm({ ...EMPTY_FORM, conditions: [newCondition()] });
    setEditingId("new");
  }

  function cancelEdit() { setEditingId(null); setForm(EMPTY_FORM); }

  async function saveNotice() {
    setSaving(true);
    const url = editingId === "new" ? "/api/event-notices" : `/api/event-notices/${editingId}`;
    const res = await fetch(url, {
      method: editingId === "new" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        conditions: form.conditions,
        conditionLogic: form.conditionLogic,
        isActive: form.isActive,
        ...(editingId === "new" && { displayOrder: notices.length, fundraiserId }),
      }),
    });
    if (res.ok) { await fetchNotices(); cancelEdit(); }
    setSaving(false);
  }

  async function deleteNotice(id: string) {
    if (!confirm("Delete this notice?")) return;
    await fetch(`/api/event-notices/${id}`, { method: "DELETE" });
    await fetchNotices();
  }

  async function toggleActive(notice: FundraiserNotice) {
    await fetch(`/api/event-notices/${notice.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !notice.isActive }),
    });
    await fetchNotices();
  }

  function addCondition() {
    setForm((f) => ({ ...f, conditions: [...f.conditions, newCondition()] }));
  }

  function removeCondition(id: string) {
    setForm((f) => ({ ...f, conditions: f.conditions.filter((c) => c.id !== id) }));
  }

  function updateCondition(id: string, patch: Partial<NoticeCondition>) {
    setForm((f) => ({
      ...f,
      conditions: f.conditions.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, ...patch };
        if (patch.field !== undefined && patch.field !== c.field) {
          const fd = FUNDRAISER_NOTICE_FIELDS.find((fd) => fd.key === patch.field)!;
          updated.operator = defaultOperator(fd.type);
          updated.value = "";
        }
        if (patch.operator !== undefined && patch.operator !== c.operator) {
          updated.value = "";
        }
        return updated;
      }),
    }));
  }

  function renderValueInput(condition: NoticeCondition) {
    const fieldDef = FUNDRAISER_NOTICE_FIELDS.find((f) => f.key === condition.field);
    if (!fieldDef) return null;
    const opDef = OPERATORS[fieldDef.type].find((o) => o.value === condition.operator);
    if (!opDef?.hasValue) return null;

    if (fieldDef.type === "enum" && fieldDef.options) {
      if (condition.operator === "is_any_of") {
        const selected = condition.value ? condition.value.split(",").map((v) => v.trim()).filter(Boolean) : [];
        return (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            {fieldDef.options.map((opt) => (
              <label key={opt} className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={(e) => {
                    const next = e.target.checked ? [...selected, opt] : selected.filter((v) => v !== opt);
                    updateCondition(condition.id, { value: next.join(",") });
                  }}
                />
                {opt}
              </label>
            ))}
          </div>
        );
      }
      return (
        <select
          value={condition.value}
          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
          className="text-sm border border-gray-300 rounded px-2 py-1"
        >
          <option value="">Select…</option>
          {fieldDef.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }

    if (fieldDef.type === "tags") {
      const selected = condition.value ? condition.value.split(",").map((v) => v.trim()).filter(Boolean) : [];
      if (tags.length === 0) return <span className="text-xs text-gray-400 mt-1">Loading tags…</span>;
      return (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
          {tags.map((tag) => (
            <label key={tag.id} className="flex items-center gap-1 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(tag.id)}
                onChange={(e) => {
                  const next = e.target.checked ? [...selected, tag.id] : selected.filter((v) => v !== tag.id);
                  updateCondition(condition.id, { value: next.join(",") });
                }}
              />
              {tag.name}
            </label>
          ))}
        </div>
      );
    }

    if (fieldDef.type === "staff") {
      return (
        <select
          value={condition.value}
          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
          className="text-sm border border-gray-300 rounded px-2 py-1"
        >
          <option value="">Select…</option>
          {staff.map((u) => (
            <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
          ))}
        </select>
      );
    }

    if (fieldDef.key === "sponsorshipLevel" && sponsorshipLevelNames.length > 0) {
      return (
        <select
          value={condition.value}
          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
          className="text-sm border border-gray-300 rounded px-2 py-1"
        >
          <option value="">Select…</option>
          {sponsorshipLevelNames.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }

    if (fieldDef.optionsUrl) {
      const opts = lookupOptions[fieldDef.key] ?? [];
      if (opts.length === 0) return <span className="text-xs text-gray-400 mt-1">Loading…</span>;
      return (
        <select
          value={condition.value}
          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
          className="text-sm border border-gray-300 rounded px-2 py-1"
        >
          <option value="">Select…</option>
          {opts.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }

    if (fieldDef.type === "number") {
      return (
        <input
          type="number"
          value={condition.value}
          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
          placeholder="Amount"
          className="text-sm border border-gray-300 rounded px-2 py-1 w-28"
          min="0"
          step="1"
        />
      );
    }

    return (
      <input
        type="text"
        value={condition.value}
        onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
        placeholder="Value"
        className="text-sm border border-gray-300 rounded px-2 py-1 w-36"
      />
    );
  }

  function renderNoticeForm(bgClass: string) {
    return (
      <div className={`rounded-md p-3 space-y-3 ${bgClass}`}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notice Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Pending donations over $1000"
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 bg-white"
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-gray-600">Match:</span>
          {(["AND", "OR"] as const).map((logic) => (
            <label key={logic} className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input type="radio" checked={form.conditionLogic === logic} onChange={() => setForm((f) => ({ ...f, conditionLogic: logic }))} />
              {logic === "AND" ? "All (AND)" : "Any (OR)"}
            </label>
          ))}
        </div>
        <div className="space-y-2">
          {form.conditions.map((condition, idx) => {
            const fieldDef = FUNDRAISER_NOTICE_FIELDS.find((fd) => fd.key === condition.field);
            const ops = OPERATORS[fieldDef?.type ?? "text"];
            return (
              <div key={condition.id} className="flex flex-wrap items-start gap-2 border border-gray-200 rounded p-2 bg-white">
                <span className="text-xs text-gray-400 mt-1.5 w-4">{idx + 1}.</span>
                <select
                  value={condition.field}
                  onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <optgroup label="Donation">
                    {donationFields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </optgroup>
                  <optgroup label="Person">
                    {personFields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </optgroup>
                </select>
                <select
                  value={condition.operator}
                  onChange={(e) => updateCondition(condition.id, { operator: e.target.value })}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  {ops.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
                {renderValueInput(condition)}
                <button onClick={() => removeCondition(condition.id)} className="text-gray-400 hover:text-red-500 text-sm mt-1" title="Remove">✕</button>
              </div>
            );
          })}
          <button onClick={addCondition} className="text-xs text-blue-600 hover:text-blue-800">+ Add condition</button>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
          Active
        </label>
        <div className="flex gap-2">
          <button onClick={saveNotice} disabled={saving || !form.name.trim()} className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={cancelEdit} className="text-sm text-gray-600 hover:text-gray-800 px-2">Cancel</button>
        </div>
      </div>
    );
  }

  function donationRow(d: DonationForEval): string[] {
    return [
      donorName(d),
      d.person?.email1 || d.person?.email2 || "",
      d.sponsorshipLevel?.name ?? "",
      (d.amount / 100).toFixed(2),
      d.approvalStatus,
      d.qbSyncStatus,
      d.isRecurring ? "Yes" : "No",
      d.paymentMethod,
      d.sponsoredSeats != null ? String(d.sponsoredSeats) : "",
      d.seatsUsed != null ? String(d.seatsUsed) : "",
    ];
  }

  const XLSX_HEADERS = ["Name", "Email", "Sponsorship Level", "Amount ($)", "Approval Status", "QB Sync", "Recurring", "Payment Method", "Sponsored Seats", "Seats Used"];

  async function downloadXlsx(
    filename: string,
    headersOrSheets: string[] | { name: string; headers: string[]; rows: string[][] }[],
    rows?: string[][]
  ) {
    const body = Array.isArray(headersOrSheets) && headersOrSheets.length > 0 && typeof headersOrSheets[0] === "object" && "name" in headersOrSheets[0]
      ? { filename, sheets: headersOrSheets as { name: string; headers: string[]; rows: string[][] }[] }
      : { filename, headers: headersOrSheets as string[], rows: rows! };
    const res = await fetch("/api/export/xlsx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  function copyNotice(noticeId: string, matching: DonationForEval[]) {
    const text = matching.map(donorName).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(noticeId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function downloadNotice(notice: FundraiserNotice, matching: DonationForEval[]) {
    downloadXlsx(`${notice.name}.xlsx`, XLSX_HEADERS, matching.map(donationRow));
  }

  if (loading) return <div className="text-gray-400 text-sm py-2">Loading notices…</div>;

  return (
    <div className="space-y-3">
      {notices.some((n) => n.isActive) && evaluated.length === 0 && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center gap-2">
          <span>✓</span>
          <span>All custom notices clear — no matches found.</span>
        </div>
      )}
      {notices.length === 0 && !isAdmin && (
        <div className="text-sm text-gray-400">No custom notices defined for this fundraiser.</div>
      )}
      {evaluated.map(({ notice, matching }) => (
        <div key={notice.id} className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <span>⚠</span>
              <div>
                <p className="font-medium">
                  {notice.name}{" "}
                  <span className="font-normal text-amber-700">({matching.length} {matching.length === 1 ? "donation" : "donations"})</span>
                </p>
                <ul className="mt-1.5 space-y-0.5 text-xs">
                  {matching.map((d) => (
                    <li key={d.id} className="font-medium">{donorName(d)}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => copyNotice(notice.id, matching)} className="text-xs text-amber-700 hover:text-amber-900 border border-amber-300 bg-amber-50 hover:bg-amber-100 rounded px-2 py-0.5 transition-colors">
                {copiedId === notice.id ? "Copied!" : "Copy"}
              </button>
              <button onClick={() => downloadNotice(notice, matching)} className="text-xs text-amber-700 hover:text-amber-900 border border-amber-300 bg-amber-50 hover:bg-amber-100 rounded px-2 py-0.5 transition-colors">
                Excel
              </button>
            </div>
          </div>
        </div>
      ))}
      {isAdmin && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowManage((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700"
          >
            <span>Manage Custom Notices ({notices.length})</span>
            <span className="text-gray-400 text-xs">{showManage ? "▲" : "▼"}</span>
          </button>

          {showManage && (
            <div className="p-4 space-y-3">
              {notices.map((n) => (
                <div key={n.id} className="border border-gray-200 rounded-md overflow-hidden">
                  {editingId === n.id ? (
                    <div className="p-3">
                      {renderNoticeForm("bg-gray-50")}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                      <div>
                        <span className="text-sm font-medium text-gray-800">{n.name}</span>
                        <span className="ml-2 text-xs text-gray-400">
                          {n.conditions.length} condition{n.conditions.length !== 1 ? "s" : ""} · {n.conditionLogic}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleActive(n)}
                          className={`text-xs px-2 py-0.5 rounded-full border ${n.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}
                        >
                          {n.isActive ? "Active" : "Inactive"}
                        </button>
                        <button onClick={() => startEdit(n)} className="text-xs text-blue-600 hover:text-blue-800">Edit</button>
                        <button onClick={() => deleteNotice(n.id)} className="text-xs text-red-600 hover:text-red-800">Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {editingId === "new" ? (
                <div className="border border-blue-200 bg-blue-50 rounded-md p-3">
                  <p className="text-xs font-medium text-blue-700 mb-3">New Notice</p>
                  {renderNoticeForm("bg-blue-50")}
                </div>
              ) : (
                <button
                  onClick={startNew}
                  className="w-full text-sm text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 hover:border-blue-400 rounded-md py-2 transition-colors"
                >
                  + Add Notice
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
