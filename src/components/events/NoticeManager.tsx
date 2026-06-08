"use client";

import { useState, useEffect, useCallback } from "react";
import {
  NOTICE_FIELDS,
  OPERATORS,
  defaultOperator,
  evaluateNotice,
  type NoticeCondition,
  type EvalInvite,
  type EvalContext,
} from "@/lib/notice-fields";

interface EventNotice {
  id: string;
  name: string;
  conditions: NoticeCondition[];
  conditionLogic: "AND" | "OR";
  isActive: boolean;
  displayOrder: number;
}

interface InviteForEval {
  id: string;
  peopleId: string | null;
  rsvpStatus: string;
  ticketType: string;
  group: string;
  meal: string;
  dietary: string[];
  notes: string | null;
  tableId: string | null;
  isGuest: boolean;
  isPlaceholder: boolean;
  attended: boolean;
  seatingRequest: string | null;
  tableRequest: string | null;
  guestName: string | null;
  guestEmail: string | null;
  person: {
    firstName: string;
    lastName: string;
    email1: string | null;
    email2: string | null;
    status: string;
    city: string | null;
    state: string | null;
    assignedTo: { id: string } | null;
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

function toEvalInvite(invite: InviteForEval): EvalInvite {
  return {
    rsvpStatus: invite.rsvpStatus,
    ticketType: invite.ticketType,
    group: invite.group,
    meal: invite.meal,
    dietary: invite.dietary,
    notes: invite.notes,
    tableId: invite.tableId,
    isGuest: invite.isGuest,
    isPlaceholder: invite.isPlaceholder,
    attended: invite.attended,
    seatingRequest: invite.seatingRequest,
    tableRequest: invite.tableRequest,
    peopleId: invite.peopleId,
    guestEmail: invite.guestEmail,
    person: invite.person ?? null,
  };
}

function inviteName(invite: InviteForEval): string {
  if (invite.person) return `${invite.person.firstName} ${invite.person.lastName}`;
  return invite.guestName || "Unknown";
}

function newCondition(): NoticeCondition {
  const field = NOTICE_FIELDS[0];
  return { id: crypto.randomUUID(), field: field.key, operator: defaultOperator(field.type), value: "" };
}

export default function NoticeManager({
  eventId,
  invites,
  paidPeopleIds,
  isAdmin,
}: {
  eventId: string;
  invites: InviteForEval[];
  paidPeopleIds: Set<string>;
  isAdmin: boolean;
}) {
  const [notices, setNotices] = useState<EventNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManage, setShowManage] = useState(false);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [lookupOptions, setLookupOptions] = useState<Record<string, string[]>>({});

  const fetchNotices = useCallback(async () => {
    const res = await fetch(`/api/event-notices?eventId=${eventId}`);
    if (res.ok) {
      const data = await res.json();
      setNotices(data);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/tags").then((r) => r.json()).then((d: Tag[]) => setTags(d));
    fetch("/api/users/assignable").then((r) => r.json()).then((d: StaffUser[]) => setStaff(d));
    // Fetch dynamic options for fields with optionsUrl
    const fieldsWithUrl = NOTICE_FIELDS.filter((f) => f.optionsUrl);
    fieldsWithUrl.forEach((f) => {
      fetch(f.optionsUrl!).then((r) => r.json()).then((data: Record<string, string>[]) => {
        const key = f.optionsLabelKey ?? "name";
        const opts = data.map((item) => item[key]).filter(Boolean);
        setLookupOptions((prev) => ({ ...prev, [f.key]: opts }));
      });
    });
  }, [isAdmin]);

  const context: EvalContext = { paidPeopleIds };

  const evaluated = notices
    .filter((n) => n.isActive)
    .map((n) => ({
      notice: n,
      matching: invites.filter((inv) =>
        evaluateNotice(toEvalInvite(inv), n.conditions, n.conditionLogic, context)
      ),
    }))
    .filter((r) => r.matching.length > 0);

  function startEdit(notice: EventNotice) {
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
        ...(editingId === "new" && { displayOrder: notices.length, eventId }),
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

  async function toggleActive(notice: EventNotice) {
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
          const fd = NOTICE_FIELDS.find((fd) => fd.key === patch.field)!;
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

  function ValueInput({ condition }: { condition: NoticeCondition }) {
    const fieldDef = NOTICE_FIELDS.find((f) => f.key === condition.field);
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

    // Dynamic lookup options (dietary, orgType, etc.)
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

  const inviteFields = NOTICE_FIELDS.filter((f) => f.group === "Invite");
  const personFields = NOTICE_FIELDS.filter((f) => f.group === "Person");

  if (loading) return <div className="text-gray-400 text-sm py-2">Loading notices…</div>;

  return (
    <div className="space-y-3">
      {/* Evaluated results for active notices */}
      {notices.some((n) => n.isActive) && evaluated.length === 0 && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center gap-2">
          <span>✓</span>
          <span>All custom notices clear — no matches found.</span>
        </div>
      )}
      {notices.length === 0 && !isAdmin && (
        <div className="text-sm text-gray-400">No custom notices defined for this event.</div>
      )}
      {evaluated.map(({ notice, matching }) => (
        <div key={notice.id} className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <span>⚠</span>
            <div>
              <p className="font-medium">
                {notice.name}{" "}
                <span className="font-normal text-amber-700">({matching.length} {matching.length === 1 ? "person" : "people"})</span>
              </p>
              <ul className="mt-1.5 space-y-0.5 text-xs">
                {matching.map((inv) => (
                  <li key={inv.id} className="font-medium">{inviteName(inv)}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}

      {/* Admin: manage notices */}
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
              {/* Existing notices */}
              {notices.map((n) => (
                <div key={n.id} className="border border-gray-200 rounded-md overflow-hidden">
                  {editingId === n.id ? (
                    <div className="p-3 space-y-3">
                      {/* Edit form */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Notice Name</label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
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
                          const fieldDef = NOTICE_FIELDS.find((fd) => fd.key === condition.field);
                          const ops = OPERATORS[fieldDef?.type ?? "text"];
                          return (
                            <div key={condition.id} className="flex flex-wrap items-start gap-2 bg-gray-50 border border-gray-200 rounded p-2">
                              <span className="text-xs text-gray-400 mt-1.5 w-4">{idx + 1}.</span>
                              <select
                                value={condition.field}
                                onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                              >
                                <optgroup label="Invite">
                                  {inviteFields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
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
                              <ValueInput condition={condition} />
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

              {/* New notice form */}
              {editingId === "new" ? (
                <div className="border border-blue-200 bg-blue-50 rounded-md p-3 space-y-3">
                  <p className="text-xs font-medium text-blue-700">New Notice</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notice Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. VIPs not yet seated"
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
                      const fieldDef = NOTICE_FIELDS.find((fd) => fd.key === condition.field);
                      const ops = OPERATORS[fieldDef?.type ?? "text"];
                      return (
                        <div key={condition.id} className="flex flex-wrap items-start gap-2 bg-white border border-gray-200 rounded p-2">
                          <span className="text-xs text-gray-400 mt-1.5 w-4">{idx + 1}.</span>
                          <select
                            value={condition.field}
                            onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <optgroup label="Invite">
                              {inviteFields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
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
                          <ValueInput condition={condition} />
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
