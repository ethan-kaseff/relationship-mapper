"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User { id: string; firstName: string; lastName: string; }
interface EmailTemplate { id: string; name: string; subject: string; body: string; }

interface Props {
  personId: string;
  personName: string;
  greeting: string | null;
  email: string | null;
  status: string;
  deceasedDate: string | null;
  forwardingEmail: string | null;
  assignedToId: string | null;
  assignedTo: { firstName: string; lastName: string } | null;
  assignedToName: string | null;
  assignedDate: string | null;
  emailTemplateId: string | null;
  emailTemplate: { subject: string; body: string } | null;
  createdAt: string;
  canEdit: boolean;
  personOfficeId?: string;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  PROSPECT: "Prospect",
  INACTIVE: "Inactive",
  DECEASED: "Deceased",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PROSPECT: "bg-blue-100 text-blue-700",
  INACTIVE: "bg-gray-100 text-gray-500",
  DECEASED: "bg-slate-100 text-slate-500",
};

function fillTemplate(text: string, firstName: string, senderName: string) {
  return text
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{senderName\}\}/g, senderName)
    .replace(/\{\{senderFirstName\}\}/g, senderName.split(" ")[0]);
}

export default function PeopleStatusSection({
  personId, personName, greeting, email, status: initialStatus,
  deceasedDate: initialDeceasedDate, forwardingEmail: initialForwardingEmail,
  assignedToId: initialAssignedToId, assignedTo: initialAssignedTo,
  assignedToName: initialAssignedToName,
  assignedDate: initialAssignedDate, emailTemplateId: initialTemplateId,
  emailTemplate: initialEmailTemplate,
  createdAt, canEdit, personOfficeId,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const [deceasedDate, setDeceasedDate] = useState(
    initialDeceasedDate ? new Date(initialDeceasedDate).toISOString().split("T")[0] : ""
  );
  const [forwardingEmail, setForwardingEmail] = useState(initialForwardingEmail ?? "");
  const [assignedToId, setAssignedToId] = useState(initialAssignedToId ?? "");
  const [templateId, setTemplateId] = useState(initialTemplateId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    if (editing) {
      fetch("/api/users/assignable").then(r => r.json()).then(setUsers).catch(() => {});
      fetch(personOfficeId ? `/api/email-templates?officeId=${personOfficeId}` : "/api/email-templates")
        .then(r => r.json()).then(setTemplates).catch(() => {});
    }
  }, [editing]);

  useEffect(() => {
    if (templateId && templates.length > 0) {
      setSelectedTemplate(templates.find(t => t.id === templateId) ?? null);
    } else {
      setSelectedTemplate(null);
    }
  }, [templateId, templates]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = { status };
    if (status === "DECEASED") {
      body.deceasedDate = deceasedDate ? new Date(deceasedDate).toISOString() : null;
      body.forwardingEmail = forwardingEmail || null;
    }
    if (status === "PROSPECT") {
      body.assignedToId = assignedToId || null;
      body.assignedDate = assignedToId ? new Date().toISOString() : null;
      body.emailTemplateId = templateId || null;
    }
    const res = await fetch(`/api/people/${personId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Failed to save.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  // Build mailto href directly from server-provided template data
  function buildMailtoHref() {
    if (!email || !initialEmailTemplate) return null;
    const firstName = greeting || personName.split(" ")[0];
    const senderName = initialAssignedToName ?? "";
    const subject = fillTemplate(initialEmailTemplate.subject, firstName, senderName);
    const body = fillTemplate(initialEmailTemplate.body, firstName, senderName);
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const mailtoHref = initialStatus === "PROSPECT" && email && initialEmailTemplate
    ? buildMailtoHref()
    : null;

  const displayAssignedTo = initialAssignedTo
    ? `${initialAssignedTo.firstName} ${initialAssignedTo.lastName}` : null;

  const addedDate = new Date(createdAt).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });

  if (!editing) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs text-gray-400">{addedDate}</span>
          <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[initialStatus] ?? "bg-gray-100 text-gray-500"}`}>
            {STATUS_LABELS[initialStatus] ?? initialStatus}
          </span>
          {canEdit && (
            <button onClick={() => setEditing(true)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              Edit
            </button>
          )}
        </div>
        {initialStatus === "DECEASED" && (initialDeceasedDate || initialForwardingEmail) && (
          <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
            {initialDeceasedDate && (
              <span>Passed: {new Date(initialDeceasedDate).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" })}</span>
            )}
            {initialForwardingEmail && (
              <span>Forwarding to: {initialForwardingEmail}</span>
            )}
          </div>
        )}
        {initialStatus === "PROSPECT" && (
          <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap items-center">
            {displayAssignedTo && <span>Assigned to: <span className="text-gray-700 font-medium">{displayAssignedTo}</span></span>}
            {initialAssignedDate && <span>Since: {new Date(initialAssignedDate).toLocaleDateString("en-US", { timeZone: "UTC" })}</span>}
            {mailtoHref && (
              <a href={mailtoHref} className="inline-flex items-center gap-1 text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-md hover:bg-indigo-700">
                ✉ Send Outreach Email
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-indigo-900">Edit Status</h2>
      </div>
      <div className="space-y-4 max-w-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {status === "DECEASED" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Passing</label>
                <input type="date" value={deceasedDate} onChange={e => setDeceasedDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forwarding Email <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input type="email" value={forwardingEmail} onChange={e => setForwardingEmail(e.target.value)}
                  placeholder="family@example.com"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
            </>
          )}

          {status === "PROSPECT" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <select value={assignedToId} onChange={e => setAssignedToId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                  <option value="">— Unassigned —</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Template <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select value={templateId} onChange={e => setTemplateId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                  <option value="">— None —</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              {selectedTemplate && (
                <div className="bg-gray-50 rounded-md p-3 text-xs text-gray-600 space-y-1 border border-gray-200">
                  <div className="font-medium text-gray-700">Subject: {selectedTemplate.subject}</div>
                  <div className="whitespace-pre-wrap line-clamp-4">{selectedTemplate.body}</div>
                </div>
              )}
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); setError(null); }}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
      </div>
    </div>
  );
}
