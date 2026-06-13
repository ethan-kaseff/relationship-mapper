"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DIETARY_OPTIONS } from "@/lib/seating-constants";
import { useSession } from "next-auth/react";

interface Tag {
  id: string;
  name: string;
  office?: { id: string; name: string };
  _count?: { personTags: number; partnerTags: number; partnerRoleTags: number };
}

interface CommunicationMethod {
  id: string;
  name: string;
  _count?: { people: number };
}

interface OrganizationType {
  id: string;
  typeName: string;
  color: string | null;
}

function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return ((h * 60) + 360) % 360;
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function checkOrgTypeColor(
  hex: string,
  others?: { id: string; typeName: string; color: string | null }[],
  excludeId?: string,
): string | null {
  const hue = hexToHue(hex);
  if (hue >= 230 && hue <= 325) return "Too similar to guest seat color (purple/violet). Choose red, green, blue, or teal.";
  if (hue >= 20 && hue <= 70) return "Too similar to placeholder seat color (amber/yellow). Choose red, green, blue, or teal.";
  if (others) {
    for (const ot of others) {
      if (ot.id === excludeId || !ot.color) continue;
      if (hueDistance(hue, hexToHue(ot.color)) < 30) {
        return `Too similar to "${ot.typeName}" color. Choose something more distinct.`;
      }
    }
  }
  return null;
}

interface RelationshipType {
  id: string;
  relationshipDesc: string;
  notes: string | null;
  highlightOnProfile?: boolean;
  _count?: { relationshipToTypes: number };
}

interface DietaryOptionRecord {
  id: string;
  name: string;
}

interface Office {
  id: string;
  name: string;
  isSiloed: boolean;
  _count?: { users: number; people: number; partners: number };
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  officeId: string;
  office?: { name: string };
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  office?: { id: string; name: string };
}

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const role = session?.user?.role;
  const isSystemAdmin = role === "SYSTEM_ADMIN";
  const isOfficeAdmin = role === "OFFICE_ADMIN";
  const canManageUsers = isSystemAdmin || isOfficeAdmin;
  const canEditTemplates = role !== "CONNECTOR" && role !== "VIEWER" && !!role;

  const [relTypes, setRelTypes] = useState<RelationshipType[]>([]);
  const [loading, setLoading] = useState(true);

  // New type form
  const [showForm, setShowForm] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newHighlight, setNewHighlight] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editHighlight, setEditHighlight] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [reassignNeeded, setReassignNeeded] = useState<{ id: string; count: number } | null>(null);
  const [reassignTo, setReassignTo] = useState("");

  // Tags state
  const [tagTypes, setTagTypes] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [showTagForm, setShowTagForm] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagOfficeId, setNewTagOfficeId] = useState("");
  const [tagSubmitting, setTagSubmitting] = useState(false);
  const [tagError, setTagError] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState("");
  const [editTagOfficeId, setEditTagOfficeId] = useState("");
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Email templates state
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateSubject, setNewTemplateSubject] = useState("");
  const [newTemplateBody, setNewTemplateBody] = useState("");
  const [newTemplateOfficeId, setNewTemplateOfficeId] = useState("");
  const [templateSubmitting, setTemplateSubmitting] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editTemplateName, setEditTemplateName] = useState("");
  const [editTemplateSubject, setEditTemplateSubject] = useState("");
  const [editTemplateBody, setEditTemplateBody] = useState("");
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("OFFICE_ADMIN");
  const [userSubmitting, setUserSubmitting] = useState(false);
  const [userError, setUserError] = useState("");
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserFirstName, setEditUserFirstName] = useState("");
  const [editUserLastName, setEditUserLastName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserRole, setEditUserRole] = useState("");
  const [editUserOfficeId, setEditUserOfficeId] = useState("");
  const [editUserPassword, setEditUserPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Office management state
  const [offices, setOffices] = useState<Office[]>([]);
  const [officesLoading, setOfficesLoading] = useState(true);
  const [showOfficeForm, setShowOfficeForm] = useState(false);
  const [officeName, setOfficeName] = useState("");
  const [officeSubmitting, setOfficeSubmitting] = useState(false);
  const [officeError, setOfficeError] = useState("");
  const [editingOfficeId, setEditingOfficeId] = useState<string | null>(null);
  const [editOfficeName, setEditOfficeName] = useState("");
  const [editOfficeSiloed, setEditOfficeSiloed] = useState(false);
  const [deletingOfficeId, setDeletingOfficeId] = useState<string | null>(null);

  // Office dropdown for user form
  const [userOfficeId, setUserOfficeId] = useState("");

  // Email platform toggle
  const [emailPlatform, setEmailPlatform] = useState<"constant_contact" | "zeffy">("zeffy");

  // Constant Contact integration state
  const [ccConnected, setCcConnected] = useState(false);
  const [ccLoading, setCcLoading] = useState(true);
  const [ccDisconnecting, setCcDisconnecting] = useState(false);
  const [ccMessage, setCcMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Stripe integration state
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(true);

  // QuickBooks integration state
  const [qbConnected, setQbConnected] = useState(false);
  const [qbLoading, setQbLoading] = useState(true);
  const [qbDisconnecting, setQbDisconnecting] = useState(false);
  const [qbMessage, setQbMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Zeffy integration state
  const [zeffyConnected, setZeffyConnected] = useState(false);
  const [zeffyLoading, setZeffyLoading] = useState(true);
  const [zeffyApiKey, setZeffyApiKey] = useState("");
  const [zeffyConnecting, setZeffyConnecting] = useState(false);
  const [zeffyDisconnecting, setZeffyDisconnecting] = useState(false);
  const [zeffySyncing, setZeffySyncing] = useState(false);
  const [zeffyMessage, setZeffyMessage] = useState<{ type: "success" | "error"; text: string } | null>(() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(sessionStorage.getItem("zeffy-sync-message") ?? "null"); } catch { return null; }
  });
  const [pendingDuplicates, setPendingDuplicates] = useState<Array<{
    zeffyContact: { firstName: string; lastName: string; email: string; phoneNumber: string | null; address: string | null; city: string | null; state: string | null; zip: string | null };
    existingPerson: { id: string; firstName: string; lastName: string; email1: string | null; email2: string | null };
    resolving?: boolean;
  }>>([]);

  // Claude AI integration state
  const [aiConnected, setAiConnected] = useState(false);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiConnecting, setAiConnecting] = useState(false);
  const [aiDisconnecting, setAiDisconnecting] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Data management state
  const [importType, setImportType] = useState<"people" | "partners" | "roles">("people");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    total: number;
    errors: { row: number; message: string }[];
  } | null>(null);
  const [importError, setImportError] = useState("");
  const [importErrorFile, setImportErrorFile] = useState("");
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Communication methods state
  const [commMethods, setCommMethods] = useState<CommunicationMethod[]>([]);
  const [commMethodsLoading, setCommMethodsLoading] = useState(true);
  const [showCommMethodForm, setShowCommMethodForm] = useState(false);
  const [newCommMethodName, setNewCommMethodName] = useState("");
  const [commMethodSubmitting, setCommMethodSubmitting] = useState(false);
  const [commMethodError, setCommMethodError] = useState("");
  const [editingCommMethodId, setEditingCommMethodId] = useState<string | null>(null);
  const [editCommMethodName, setEditCommMethodName] = useState("");
  const [deletingCommMethodId, setDeletingCommMethodId] = useState<string | null>(null);
  const commMethodInputRef = useRef<HTMLInputElement>(null);

  // Organization types state
  const [orgTypes, setOrgTypes] = useState<OrganizationType[]>([]);
  const [orgTypesLoading, setOrgTypesLoading] = useState(true);
  const [showOrgTypeForm, setShowOrgTypeForm] = useState(false);
  const [newOrgTypeName, setNewOrgTypeName] = useState("");
  const [newOrgTypeColor, setNewOrgTypeColor] = useState("#6366F1");
  const [orgTypeSubmitting, setOrgTypeSubmitting] = useState(false);
  const [orgTypeError, setOrgTypeError] = useState("");
  const [savingOrgTypeColorId, setSavingOrgTypeColorId] = useState<string | null>(null);
  const [orgTypeColorError, setOrgTypeColorError] = useState<Record<string, string>>({});

  // Dietary options state
  const [dietaryOptions, setDietaryOptions] = useState<DietaryOptionRecord[]>([]);
  const [dietaryOptionsLoading, setDietaryOptionsLoading] = useState(true);
  const [deletingDietaryId, setDeletingDietaryId] = useState<string | null>(null);

  // Auto-focus refs
  const relTypeInputRef = useRef<HTMLInputElement>(null);
  const userFirstNameRef = useRef<HTMLInputElement>(null);
  const officeNameRef = useRef<HTMLInputElement>(null);

  function fetchTypes() {
    fetch("/api/lookup/relationship-types")
      .then((res) => res.json())
      .then((data) => {
        setRelTypes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  function fetchTags() {
    fetch("/api/tags")
      .then((res) => res.json())
      .then((data) => {
        setTagTypes(data);
        setTagsLoading(false);
      })
      .catch(() => setTagsLoading(false));
  }

  function fetchUsers() {
    if (!canManageUsers) return;
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setUsersLoading(false);
      })
      .catch(() => setUsersLoading(false));
  }

  function fetchOffices() {
    if (!canManageUsers) return;
    fetch("/api/offices")
      .then((res) => res.json())
      .then((data) => {
        setOffices(data);
        setOfficesLoading(false);
      })
      .catch(() => setOfficesLoading(false));
  }

  function fetchCommMethods() {
    fetch("/api/lookup/communication-methods")
      .then((res) => res.json())
      .then((data) => {
        setCommMethods(Array.isArray(data) ? data : []);
        setCommMethodsLoading(false);
      })
      .catch(() => setCommMethodsLoading(false));
  }

  function fetchOrgTypes() {
    fetch("/api/lookup/organization-types")
      .then((res) => res.json())
      .then((data) => {
        setOrgTypes(Array.isArray(data) ? data : []);
        setOrgTypesLoading(false);
      })
      .catch(() => setOrgTypesLoading(false));
  }

  function fetchDietaryOptions() {
    fetch("/api/lookup/dietary-options")
      .then((res) => res.json())
      .then((data) => {
        setDietaryOptions(Array.isArray(data) ? data : []);
        setDietaryOptionsLoading(false);
      })
      .catch(() => setDietaryOptionsLoading(false));
  }

  function fetchEmailTemplates() {
    fetch("/api/email-templates")
      .then((res) => res.json())
      .then((data) => {
        setEmailTemplates(Array.isArray(data) ? data : []);
        setTemplatesLoading(false);
      })
      .catch(() => setTemplatesLoading(false));
  }

  useEffect(() => {
    if (showForm && relTypeInputRef.current) relTypeInputRef.current.focus();
  }, [showForm]);

  useEffect(() => {
    if (showTagForm && tagInputRef.current) tagInputRef.current.focus();
  }, [showTagForm]);

  useEffect(() => {
    if (showUserForm && userFirstNameRef.current) userFirstNameRef.current.focus();
  }, [showUserForm]);

  useEffect(() => {
    if (showOfficeForm && officeNameRef.current) officeNameRef.current.focus();
  }, [showOfficeForm]);

  useEffect(() => {
    if (showCommMethodForm && commMethodInputRef.current) commMethodInputRef.current.focus();
  }, [showCommMethodForm]);

  useEffect(() => {
    if (isSystemAdmin) fetchTypes();
  }, [isSystemAdmin]);

  useEffect(() => {
    fetchCommMethods();
    fetchOrgTypes();
    fetchDietaryOptions();
  }, []);

  useEffect(() => {
    if (canManageUsers) fetchTags();
  }, [canManageUsers]);

  useEffect(() => {
    if (canManageUsers) {
      fetchUsers();
      fetchOffices();
    }
  }, [canManageUsers]);

  useEffect(() => {
    if (canEditTemplates) fetchEmailTemplates();
  }, [canEditTemplates]);

  // Constant Contact: check status & handle OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ccConnectedParam = params.get("cc_connected");
    const ccError = params.get("cc_error");

    if (ccConnectedParam === "true") {
      setCcMessage({ type: "success", text: "Constant Contact connected successfully!" });
    } else if (ccError) {
      const errorMessages: Record<string, string> = {
        auth_denied: "Authorization was denied.",
        no_code: "No authorization code received.",
        token_exchange: "Failed to complete authentication. Please try again.",
      };
      setCcMessage({ type: "error", text: errorMessages[ccError] || "An error occurred." });
    }

    fetch("/api/constant-contact/status")
      .then((res) => res.json())
      .then((data) => {
        setCcConnected(data.connected);
        if (data.connected) setEmailPlatform("constant_contact");
        setCcLoading(false);
      })
      .catch(() => setCcLoading(false));

    fetch("/api/stripe/status")
      .then((res) => res.json())
      .then((data) => {
        setStripeConnected(data.connected);
        setStripeLoading(false);
      })
      .catch(() => setStripeLoading(false));

    // QuickBooks OAuth callback params
    const qbConnectedParam = params.get("qb_connected");
    const qbError = params.get("qb_error");

    if (qbConnectedParam === "true") {
      setQbMessage({ type: "success", text: "QuickBooks connected successfully!" });
    } else if (qbError) {
      const errorMessages: Record<string, string> = {
        auth_denied: "Authorization was denied.",
        no_code: "No authorization code received.",
        token_exchange: "Failed to complete authentication. Please try again.",
      };
      setQbMessage({ type: "error", text: errorMessages[qbError] || "An error occurred." });
    }

    fetch("/api/quickbooks/status")
      .then((res) => res.json())
      .then((data) => {
        setQbConnected(data.connected);
        setQbLoading(false);
      })
      .catch(() => setQbLoading(false));

    fetch("/api/zeffy/status")
      .then((res) => res.json())
      .then((data) => {
        setZeffyConnected(data.connected);
        setZeffyLoading(false);
      })
      .catch(() => setZeffyLoading(false));

    fetch("/api/anthropic/status")
      .then((res) => res.json())
      .then((data) => {
        setAiConnected(data.connected);
        setAiLoading(false);
      })
      .catch(() => setAiLoading(false));
  }, []);

  async function handleQbDisconnect() {
    if (!confirm("Disconnect QuickBooks? Donations will no longer sync.")) return;
    setQbDisconnecting(true);
    try {
      const res = await fetch("/api/quickbooks/disconnect", { method: "POST" });
      if (res.ok) {
        setQbConnected(false);
        setQbMessage({ type: "success", text: "QuickBooks disconnected." });
      } else {
        setQbMessage({ type: "error", text: "Failed to disconnect." });
      }
    } catch {
      setQbMessage({ type: "error", text: "Failed to disconnect." });
    } finally {
      setQbDisconnecting(false);
    }
  }


  async function handleCcDisconnect() {
    if (!confirm("Disconnect Constant Contact? You can reconnect later.")) return;
    setCcDisconnecting(true);
    try {
      const res = await fetch("/api/constant-contact/disconnect", { method: "POST" });
      if (res.ok) {
        setCcConnected(false);
        setCcMessage({ type: "success", text: "Constant Contact disconnected." });
      } else {
        setCcMessage({ type: "error", text: "Failed to disconnect." });
      }
    } catch {
      setCcMessage({ type: "error", text: "Failed to disconnect." });
    } finally {
      setCcDisconnecting(false);
    }
  }

  async function handleSwitchEmailPlatform(platform: "constant_contact" | "zeffy") {
    if (platform === emailPlatform) return;
    if (platform === "zeffy" && ccConnected) {
      if (!confirm("Switching to Zeffy will disconnect Constant Contact. Continue?")) return;
      try {
        await fetch("/api/constant-contact/disconnect", { method: "POST" });
        setCcConnected(false);
      } catch { /* ignore */ }
    } else if (platform === "constant_contact" && zeffyConnected) {
      if (!confirm("Switching to Constant Contact will disconnect Zeffy. Continue?")) return;
      try {
        await fetch("/api/zeffy/disconnect", { method: "POST" });
        setZeffyConnected(false);
      } catch { /* ignore */ }
    }
    setEmailPlatform(platform);
    setCcMessage(null);
    setZeffyMessage(null);
  }

  async function handleZeffyConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!zeffyApiKey.trim()) return;
    setZeffyConnecting(true);
    setZeffyMessage(null);
    try {
      const res = await fetch("/api/zeffy/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: zeffyApiKey }),
      });
      if (res.ok) {
        setZeffyConnected(true);
        setZeffyApiKey("");
        setZeffyMessage({ type: "success", text: "Zeffy connected successfully!" });
      } else {
        const data = await res.json();
        setZeffyMessage({ type: "error", text: data.error || "Failed to connect." });
      }
    } catch {
      setZeffyMessage({ type: "error", text: "Failed to connect." });
    } finally {
      setZeffyConnecting(false);
    }
  }

  async function handleZeffyDisconnect() {
    if (!confirm("Disconnect Zeffy? Donations will no longer sync.")) return;
    setZeffyDisconnecting(true);
    try {
      const res = await fetch("/api/zeffy/disconnect", { method: "POST" });
      if (res.ok) {
        setZeffyConnected(false);
        setZeffyMessage({ type: "success", text: "Zeffy disconnected." });
      } else {
        setZeffyMessage({ type: "error", text: "Failed to disconnect." });
      }
    } catch {
      setZeffyMessage({ type: "error", text: "Failed to disconnect." });
    } finally {
      setZeffyDisconnecting(false);
    }
  }

  async function handleAiConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!aiApiKey.trim()) return;
    setAiConnecting(true);
    setAiMessage(null);
    try {
      const res = await fetch("/api/anthropic/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: aiApiKey }),
      });
      if (res.ok) {
        setAiConnected(true);
        setAiApiKey("");
        setAiMessage({ type: "success", text: "Claude AI connected! AI features are now live for your office." });
      } else {
        const data = await res.json();
        const detail = Array.isArray(data.details) && data.details[0]?.message;
        setAiMessage({ type: "error", text: detail || data.error || "Failed to connect." });
      }
    } catch {
      setAiMessage({ type: "error", text: "Failed to connect." });
    } finally {
      setAiConnecting(false);
    }
  }

  async function handleAiDisconnect() {
    if (!confirm("Disconnect Claude AI? AI features will stop working for your office until a new key is added.")) return;
    setAiDisconnecting(true);
    try {
      const res = await fetch("/api/anthropic/disconnect", { method: "POST" });
      if (res.ok) {
        setAiConnected(false);
        setAiMessage({ type: "success", text: "Claude AI disconnected." });
      } else {
        setAiMessage({ type: "error", text: "Failed to disconnect." });
      }
    } catch {
      setAiMessage({ type: "error", text: "Failed to disconnect." });
    } finally {
      setAiDisconnecting(false);
    }
  }

  async function handleZeffySync() {
    setZeffySyncing(true);
    saveZeffyMessage(null);
    setPendingDuplicates([]);
    try {
      const res = await fetch("/api/zeffy/sync", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const parts: string[] = [];
        if (data.donations.synced > 0) parts.push(`${data.donations.synced} donation(s) synced`);
        if (data.contacts.created > 0) parts.push(`${data.contacts.created} contact(s) created`);
        const dupes = data.contacts.pendingDuplicates ?? [];
        if (dupes.length > 0) parts.push(`${dupes.length} possible duplicate(s) need review`);
        if (parts.length === 0) parts.push("Everything is up to date");
        const totalErrors = (data.donations.errors ?? 0) + (data.contacts.errors ?? 0);
        const errorSuffix = totalErrors > 0 ? ` — ${totalErrors} item(s) had errors and were skipped` : "";
        const msg = { type: totalErrors > 0 && parts[0] === "Everything is up to date" ? "error" as const : "success" as const, text: parts.join(", ") + errorSuffix };
        saveZeffyMessage(msg);
        if (dupes.length > 0) setPendingDuplicates(dupes);
      } else {
        saveZeffyMessage({ type: "error", text: "Sync failed. Check server logs for details." });
      }
    } catch {
      saveZeffyMessage({ type: "error", text: "Sync failed. Check server logs for details." });
    } finally {
      setZeffySyncing(false);
    }
  }

  async function handleResolveDuplicate(index: number, action: "link" | "create") {
    const dupe = pendingDuplicates[index];
    setPendingDuplicates((prev) => prev.map((d, i) => i === index ? { ...d, resolving: true } : d));
    try {
      await fetch("/api/zeffy/resolve-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, zeffyContact: dupe.zeffyContact, existingPersonId: dupe.existingPerson.id }),
      });
      setPendingDuplicates((prev) => prev.filter((_, i) => i !== index));
    } catch {
      setPendingDuplicates((prev) => prev.map((d, i) => i === index ? { ...d, resolving: false } : d));
    }
  }

  function saveZeffyMessage(msg: { type: "success" | "error"; text: string } | null) {
    setZeffyMessage(msg);
    if (msg) sessionStorage.setItem("zeffy-sync-message", JSON.stringify(msg));
    else sessionStorage.removeItem("zeffy-sync-message");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/lookup/relationship-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationshipDesc: newDesc, notes: newNotes, highlightOnProfile: newHighlight }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }

      setNewDesc("");
      setNewNotes("");
      setNewHighlight(false);
      setShowForm(false);
      fetchTypes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(id: string) {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/lookup/relationship-types/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationshipDesc: editDesc, notes: editNotes, highlightOnProfile: editHighlight }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      setEditingId(null);
      fetchTypes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteError("");

    try {
      const res = await fetch(`/api/lookup/relationship-types/${id}`, {
        method: "DELETE",
      });

      if (res.status === 409) {
        const data = await res.json();
        setReassignNeeded({ id, count: data.count });
        setReassignTo("");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      setDeletingId(null);
      setReassignNeeded(null);
      fetchTypes();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function handleDeleteWithReassign() {
    if (!reassignNeeded || !reassignTo) return;
    setDeleteError("");

    try {
      const res = await fetch(
        `/api/lookup/relationship-types/${reassignNeeded.id}?reassignTo=${reassignTo}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      setDeletingId(null);
      setReassignNeeded(null);
      setReassignTo("");
      fetchTypes();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  function startEdit(rt: RelationshipType) {
    setEditingId(rt.id);
    setEditDesc(rt.relationshipDesc);
    setEditNotes(rt.notes ?? "");
    setEditHighlight(rt.highlightOnProfile ?? false);
    setDeletingId(null);
  }

  async function handleCreateTag(e: React.FormEvent) {
    e.preventDefault();
    setTagSubmitting(true);
    setTagError("");

    try {
      const body: { name: string; officeId?: string } = { name: newTagName };
      if (isSystemAdmin && newTagOfficeId) body.officeId = newTagOfficeId;

      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }

      setNewTagName("");
      setNewTagOfficeId("");
      setShowTagForm(false);
      fetchTags();
    } catch (err: unknown) {
      setTagError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setTagSubmitting(false);
    }
  }

  async function handleUpdateTag(id: string) {
    setTagSubmitting(true);
    setTagError("");

    try {
      const body: { name: string; officeId?: string } = { name: editTagName };
      if (isSystemAdmin && editTagOfficeId) body.officeId = editTagOfficeId;

      const res = await fetch(`/api/tags/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      setEditingTagId(null);
      setEditTagOfficeId("");
      fetchTags();
    } catch (err: unknown) {
      setTagError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setTagSubmitting(false);
    }
  }

  async function handleDeleteTag(id: string) {
    setTagError("");

    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      setDeletingTagId(null);
      fetchTags();
    } catch (err: unknown) {
      setTagError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault();
    setTemplateSubmitting(true);
    setTemplateError("");
    try {
      const templatePayload: Record<string, string> = { name: newTemplateName, subject: newTemplateSubject, body: newTemplateBody };
      if (isSystemAdmin && newTemplateOfficeId) templatePayload.officeId = newTemplateOfficeId;
      const res = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templatePayload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create template");
      }
      setNewTemplateName(""); setNewTemplateSubject(""); setNewTemplateBody(""); setNewTemplateOfficeId("");
      setShowTemplateForm(false);
      fetchEmailTemplates();
    } catch (err: unknown) {
      setTemplateError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setTemplateSubmitting(false);
    }
  }

  async function handleSaveTemplate(id: string) {
    setTemplateError("");
    try {
      const res = await fetch(`/api/email-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editTemplateName, subject: editTemplateSubject, body: editTemplateBody }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update template");
      }
      setEditingTemplateId(null);
      fetchEmailTemplates();
    } catch (err: unknown) {
      setTemplateError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function handleDeleteTemplate(id: string) {
    setTemplateError("");
    try {
      const res = await fetch(`/api/email-templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete template");
      }
      setDeletingTemplateId(null);
      fetchEmailTemplates();
    } catch (err: unknown) {
      setTemplateError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setUserSubmitting(true);
    setUserError("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: userFirstName, lastName: userLastName, email: userEmail, password: userPassword, role: userRole, officeId: userOfficeId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create user");
      }

      setUserFirstName("");
      setUserLastName("");
      setUserEmail("");
      setUserPassword("");
      setUserRole("OFFICE_ADMIN");
      setUserOfficeId("");
      setShowUserForm(false);
      fetchUsers();
    } catch (err: unknown) {
      setUserError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setUserSubmitting(false);
    }
  }

  async function handleDeleteUser(id: string) {
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete user");
      }

      setDeletingUserId(null);
      fetchUsers();
    } catch (err: unknown) {
      setUserError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  function startEditUser(user: User) {
    setEditingUserId(user.id);
    setEditUserFirstName(user.firstName);
    setEditUserLastName(user.lastName);
    setEditUserEmail(user.email);
    setEditUserRole(user.role);
    setEditUserOfficeId(user.officeId);
    setEditUserPassword("");
    setDeletingUserId(null);
  }

  async function handleUpdateUser(id: string) {
    setUserSubmitting(true);
    setUserError("");

    try {
      const body: Record<string, string> = {
        firstName: editUserFirstName,
        lastName: editUserLastName,
        email: editUserEmail,
        role: editUserRole,
        officeId: editUserOfficeId,
      };
      if (editUserPassword) body.password = editUserPassword;

      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update user");
      }

      setEditingUserId(null);
      fetchUsers();
    } catch (err: unknown) {
      setUserError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setUserSubmitting(false);
    }
  }

  async function handleCreateOffice(e: React.FormEvent) {
    e.preventDefault();
    setOfficeSubmitting(true);
    setOfficeError("");

    try {
      const res = await fetch("/api/offices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: officeName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create office");
      }

      setOfficeName("");
      setShowOfficeForm(false);
      fetchOffices();
    } catch (err: unknown) {
      setOfficeError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setOfficeSubmitting(false);
    }
  }

  async function handleUpdateOffice(id: string) {
    setOfficeSubmitting(true);
    setOfficeError("");

    try {
      const res = await fetch(`/api/offices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editOfficeName, isSiloed: editOfficeSiloed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update office");
      }

      setEditingOfficeId(null);
      fetchOffices();
    } catch (err: unknown) {
      setOfficeError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setOfficeSubmitting(false);
    }
  }

  async function handleDeleteOffice(id: string) {
    setOfficeError("");

    try {
      const res = await fetch(`/api/offices/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete office");
      }

      setDeletingOfficeId(null);
      fetchOffices();
    } catch (err: unknown) {
      setOfficeError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  const handleExport = useCallback(async (format: "xlsx" | "csv", type?: string) => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ format });
      if (format === "csv" && type) params.set("type", type);
      const res = await fetch(`/api/export?${params}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "xlsx"
        ? "relationship-mapper-export.xlsx"
        : `${type}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }, []);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    setImportError("");
    setImportErrorFile("");

    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("type", importType);

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Import failed");
      }

      const result = await res.json();
      setImportResult(result);

      // Auto-download errors CSV if there were any errors
      if (result.errors && result.errors.length > 0) {
        const baseName = importFile.name.replace(/\.(csv|xlsx|xls)$/i, "");
        const csvHeader = "Row,Message";
        const csvRows = result.errors.map(
          (err: { row: number; message: string }) =>
            `${err.row},"${err.message.replace(/"/g, '""')}"`
        );
        const csvContent = [csvHeader, ...csvRows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const errorFileName = `${baseName}_errors.csv`;
        a.download = errorFileName;
        a.click();
        URL.revokeObjectURL(url);
        setImportErrorFile(errorFileName);
      }

      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setImporting(false);
    }
  }

  if (sessionStatus === "loading") {
    return (
      <div>
        <h1 className="text-2xl font-bold text-indigo-900 mb-6">Settings</h1>
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-indigo-900 mb-6">Settings</h1>

      {/* Email Templates */}
      {canEditTemplates && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-indigo-900">Email Templates</h2>
            {!showTemplateForm && (
              <button
                onClick={() => setShowTemplateForm(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm"
              >
                Add Template
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Templates are used when reaching out to prospects. Use <code className="bg-gray-100 px-1 rounded text-xs">{"{{firstName}}"}</code>, <code className="bg-gray-100 px-1 rounded text-xs">{"{{senderName}}"}</code>, or <code className="bg-gray-100 px-1 rounded text-xs">{"{{senderFirstName}}"}</code> as placeholders.
          </p>

          {templateError && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-3 mb-4 text-sm">{templateError}</div>
          )}

          {showTemplateForm && (
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50 mb-4">
              <h3 className="font-semibold text-indigo-900 mb-3 text-sm">New Template</h3>
              <form onSubmit={handleCreateTemplate} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    required
                    placeholder="e.g. Initial Outreach"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {isSystemAdmin && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Office <span className="text-red-500">*</span></label>
                    <select
                      value={newTemplateOfficeId}
                      onChange={(e) => setNewTemplateOfficeId(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">— Select office —</option>
                      {offices.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Subject <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newTemplateSubject}
                    onChange={(e) => setNewTemplateSubject(e.target.value)}
                    required
                    placeholder="e.g. Connecting with {{firstName}}"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Body <span className="text-red-500">*</span></label>
                  <textarea
                    value={newTemplateBody}
                    onChange={(e) => setNewTemplateBody(e.target.value)}
                    required
                    rows={6}
                    placeholder={"Dear {{firstName}},\n\nI wanted to reach out..."}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={templateSubmitting}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50">
                    {templateSubmitting ? "Saving…" : "Save Template"}
                  </button>
                  <button type="button" onClick={() => { setShowTemplateForm(false); setTemplateError(""); }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {templatesLoading ? (
            <p className="text-sm text-gray-400">Loading templates…</p>
          ) : (
            <div className="space-y-3">
              {emailTemplates.map((t) => (
                <div key={t.id} className="border border-gray-200 rounded-md p-4">
                  {editingTemplateId === t.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                        <input type="text" value={editTemplateName} onChange={(e) => setEditTemplateName(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                        <input type="text" value={editTemplateSubject} onChange={(e) => setEditTemplateSubject(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Body</label>
                        <textarea value={editTemplateBody} onChange={(e) => setEditTemplateBody(e.target.value)}
                          rows={6}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 font-mono" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveTemplate(t.id)}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
                          Save
                        </button>
                        <button onClick={() => setEditingTemplateId(null)}
                          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-medium text-gray-900 text-sm">{t.name}</div>
                            {isSystemAdmin && t.office && (
                              <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded-full">{t.office.name}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">Subject: {t.subject}</div>
                        </div>
                        <div className="flex gap-3 text-xs">
                          <button
                            onClick={() => { setEditingTemplateId(t.id); setEditTemplateName(t.name); setEditTemplateSubject(t.subject); setEditTemplateBody(t.body); }}
                            className="text-indigo-600 hover:underline"
                          >Edit</button>
                          {deletingTemplateId === t.id ? (
                            <span className="flex items-center gap-2">
                              <button onClick={() => handleDeleteTemplate(t.id)} className="text-red-600 hover:underline font-medium">Confirm</button>
                              <button onClick={() => setDeletingTemplateId(null)} className="text-gray-500 hover:text-gray-700">Cancel</button>
                            </span>
                          ) : (
                            <button onClick={() => setDeletingTemplateId(t.id)} className="text-red-600 hover:underline">Delete</button>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-400 whitespace-pre-wrap line-clamp-3">{t.body}</div>
                    </div>
                  )}
                </div>
              ))}
              {emailTemplates.length === 0 && (
                <p className="text-sm text-gray-400">No email templates defined. Add one above.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tags — Office Admin and System Admin */}
      {canManageUsers && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-indigo-900">Tags</h2>
            {!showTagForm && (
              <button
                onClick={() => { setShowTagForm(true); setEditingTagId(null); }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm"
              >
                Add Tag
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Tags can be assigned to people, partner roles, and partners. Use them to auto-invite groups to events or export mailing lists.
          </p>

          {tagError && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-3 mb-4 text-sm">
              {tagError}
            </div>
          )}

          {showTagForm && (
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50 mb-4">
              <h3 className="font-semibold text-indigo-900 mb-3 text-sm">New Tag</h3>
              <form onSubmit={handleCreateTag} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={tagInputRef}
                    type="text"
                    required
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g. Gala, Annual Appeal, Board Member"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                {isSystemAdmin && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Office <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={newTagOfficeId}
                      onChange={(e) => setNewTagOfficeId(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select an office…</option>
                      {offices.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={tagSubmitting}
                    className="bg-indigo-600 text-white px-4 py-1.5 rounded-md hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                  >
                    {tagSubmitting ? "Saving..." : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowTagForm(false); setTagError(""); setNewTagOfficeId(""); }}
                    className="text-gray-500 hover:text-gray-700 text-sm px-3 py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {tagsLoading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-indigo-900">Name</th>
                  {isSystemAdmin && <th className="text-left px-4 py-3 font-semibold text-indigo-900">Office</th>}
                  <th className="text-left px-4 py-3 font-semibold text-indigo-900">In Use</th>
                  <th className="text-right px-4 py-3 font-semibold text-indigo-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tagTypes.map((tag) => {
                  const usageCount =
                    (tag._count?.personTags ?? 0) +
                    (tag._count?.partnerTags ?? 0) +
                    (tag._count?.partnerRoleTags ?? 0);
                  return (
                    <tr key={tag.id} className="hover:bg-gray-50">
                      {editingTagId === tag.id ? (
                        <>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={editTagName}
                              onChange={(e) => setEditTagName(e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                          {isSystemAdmin && (
                            <td className="px-4 py-2">
                              <select
                                value={editTagOfficeId}
                                onChange={(e) => setEditTagOfficeId(e.target.value)}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="">Select office…</option>
                                {offices.map((o) => (
                                  <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                              </select>
                            </td>
                          )}
                          <td className="px-4 py-2 text-gray-600">{usageCount}</td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleUpdateTag(tag.id)}
                                disabled={tagSubmitting}
                                className="text-indigo-600 hover:underline text-xs disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingTagId(null)}
                                className="text-gray-500 hover:text-gray-700 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-medium">{tag.name}</td>
                          {isSystemAdmin && <td className="px-4 py-3 text-gray-600">{tag.office?.name ?? "—"}</td>}
                          <td className="px-4 py-3">
                            <span className="inline-block bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">
                              {usageCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex gap-3 justify-end">
                              <button
                                onClick={() => { setEditingTagId(tag.id); setEditTagName(tag.name); setEditTagOfficeId(tag.office?.id ?? ""); setDeletingTagId(null); }}
                                className="text-indigo-600 hover:underline text-xs"
                              >
                                Edit
                              </button>
                              {deletingTagId === tag.id ? (
                                <span className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleDeleteTag(tag.id)}
                                    className="text-red-600 hover:underline text-xs font-medium"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeletingTagId(null)}
                                    className="text-gray-500 hover:text-gray-700 text-xs"
                                  >
                                    Cancel
                                  </button>
                                </span>
                              ) : (
                                <button
                                  onClick={() => setDeletingTagId(tag.id)}
                                  className="text-red-600 hover:underline text-xs"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
                {tagTypes.length === 0 && (
                  <tr>
                    <td colSpan={isSystemAdmin ? 4 : 3} className="px-4 py-8 text-center text-gray-400">
                      No tags defined. Add one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* User Management — SYSTEM_ADMIN and OFFICE_ADMIN */}
      {canManageUsers && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-indigo-900">User Management</h2>
            {!showUserForm && (
              <button
                onClick={() => setShowUserForm(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm"
              >
                Add User
              </button>
            )}
          </div>

          {userError && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-3 mb-4 text-sm">
              {userError}
            </div>
          )}

          {/* Add user form */}
          {showUserForm && (
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50 mb-4">
              <h3 className="font-semibold text-indigo-900 mb-3 text-sm">New User</h3>
              <form onSubmit={handleCreateUser} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={userFirstNameRef}
                      type="text"
                      required
                      value={userFirstName}
                      onChange={(e) => setUserFirstName(e.target.value)}
                      placeholder="First name"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={userLastName}
                      onChange={(e) => setUserLastName(e.target.value)}
                      placeholder="Last name"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="user@jcrb.org"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        placeholder="Temporary password"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="OFFICE_ADMIN">Office Admin</option>
                      <option value="OFFICE_USER">Office User</option>
                      <option value="VIEWER">Viewer</option>
                      <option value="CONNECTOR">Connector</option>
                      {isSystemAdmin && <option value="SYSTEM_ADMIN">System Admin</option>}
                    </select>
                  </div>
                  {isSystemAdmin && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Office <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={userOfficeId}
                      onChange={(e) => setUserOfficeId(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">— Select Office —</option>
                      {offices.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={userSubmitting}
                    className="bg-indigo-600 text-white px-4 py-1.5 rounded-md hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                  >
                    {userSubmitting ? "Creating..." : "Create User"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowUserForm(false); setUserError(""); }}
                    className="text-gray-500 hover:text-gray-700 text-sm px-3 py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users table */}
          {usersLoading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-indigo-900">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-indigo-900">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-indigo-900">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-indigo-900">Office</th>
                  <th className="text-right px-4 py-3 font-semibold text-indigo-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    {editingUserId === user.id ? (
                      <>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={editUserFirstName}
                              onChange={(e) => setEditUserFirstName(e.target.value)}
                              placeholder="First"
                              className="w-1/2 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <input
                              type="text"
                              value={editUserLastName}
                              onChange={(e) => setEditUserLastName(e.target.value)}
                              placeholder="Last"
                              className="w-1/2 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="email"
                            value={editUserEmail}
                            onChange={(e) => setEditUserEmail(e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={editUserRole}
                            onChange={(e) => setEditUserRole(e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="OFFICE_ADMIN">Office Admin</option>
                            <option value="OFFICE_USER">Office User</option>
                            <option value="CONNECTOR">Connector</option>
                            {isSystemAdmin && <option value="SYSTEM_ADMIN">System Admin</option>}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          {isSystemAdmin && (
                          <select
                            value={editUserOfficeId}
                            onChange={(e) => setEditUserOfficeId(e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {offices.map((o) => (
                              <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                          </select>
                          )}
                          <div className="relative mt-1">
                            <input
                              type={showEditPassword ? "text" : "password"}
                              value={editUserPassword}
                              onChange={(e) => setEditUserPassword(e.target.value)}
                              placeholder="New password (leave blank to keep)"
                              className="w-full border border-gray-300 rounded px-2 py-1 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => setShowEditPassword(!showEditPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                            >
                              {showEditPassword ? "Hide" : "Show"}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleUpdateUser(user.id)}
                              disabled={userSubmitting}
                              className="text-indigo-600 hover:underline text-xs disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="text-gray-500 hover:text-gray-700 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium">{user.lastName}, {user.firstName}</td>
                        <td className="px-4 py-3 text-gray-600">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                            user.role === "SYSTEM_ADMIN"
                              ? "bg-indigo-900 text-white"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {{ SYSTEM_ADMIN: "System Admin", OFFICE_ADMIN: "Office Admin", OFFICE_USER: "Office User", VIEWER: "Viewer", CONNECTOR: "Connector" }[user.role] || user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{user.office?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-right">
                          {user.id === session?.user?.id ? (
                            <span className="text-gray-400 text-xs">You</span>
                          ) : deletingUserId === user.id ? (
                            <span className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:underline text-xs font-medium"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeletingUserId(null)}
                                className="text-gray-500 hover:text-gray-700 text-xs"
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <div className="flex gap-3 justify-end">
                              <button
                                onClick={() => startEditUser(user)}
                                className="text-indigo-600 hover:underline text-xs"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeletingUserId(user.id)}
                                className="text-red-600 hover:underline text-xs"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Relationship Types — SYSTEM_ADMIN only */}
      {isSystemAdmin && <div className="bg-white rounded-lg shadow p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-indigo-900">Relationship Types</h2>
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setEditingId(null); }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm"
            >
              Add Relationship Type
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="border border-gray-200 rounded-md p-4 bg-gray-50 mb-4">
            <h3 className="font-semibold text-indigo-900 mb-3 text-sm">New Relationship Type</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  ref={relTypeInputRef}
                  type="text"
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="e.g. Board Member"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Optional description of this relationship type"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newHighlight}
                  onChange={(e) => setNewHighlight(e.target.checked)}
                  className="rounded accent-indigo-600"
                />
                <span className="text-xs font-medium text-gray-700">Show prominently at the top of a person&apos;s profile (e.g. Spouse)</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 text-white px-4 py-1.5 rounded-md hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(""); }}
                  className="text-gray-500 hover:text-gray-700 text-sm px-3 py-1.5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-indigo-900">Description</th>
                <th className="text-left px-4 py-3 font-semibold text-indigo-900">Notes</th>
                <th className="text-left px-4 py-3 font-semibold text-indigo-900">In Use</th>
                <th className="text-left px-4 py-3 font-semibold text-indigo-900">On Profile</th>
                <th className="text-right px-4 py-3 font-semibold text-indigo-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {relTypes.map((rt) => (
                <tr key={rt.id} className="hover:bg-gray-50">
                  {editingId === rt.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {rt._count?.relationshipToTypes ?? 0}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={editHighlight}
                          onChange={(e) => setEditHighlight(e.target.checked)}
                          className="rounded accent-indigo-600"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleUpdate(rt.id)}
                            disabled={submitting}
                            className="text-indigo-600 hover:underline text-xs disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-500 hover:text-gray-700 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium">{rt.relationshipDesc}</td>
                      <td className="px-4 py-3 text-gray-600">{rt.notes ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          {rt._count?.relationshipToTypes ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {rt.highlightOnProfile
                          ? <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">Featured</span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-3 justify-end">
                          <button
                            onClick={() => startEdit(rt)}
                            className="text-indigo-600 hover:underline text-xs"
                          >
                            Edit
                          </button>
                          {deletingId === rt.id ? (
                            reassignNeeded?.id === rt.id ? (
                              <div className="flex flex-col items-end gap-2">
                                <span className="text-amber-700 text-xs">
                                  {reassignNeeded.count} relationship(s) use this type. Move them to:
                                </span>
                                <div className="flex items-center gap-2">
                                  <select
                                    value={reassignTo}
                                    onChange={(e) => setReassignTo(e.target.value)}
                                    className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  >
                                    <option value="">Select type...</option>
                                    {relTypes
                                      .filter((t) => t.id !== rt.id)
                                      .map((t) => (
                                        <option key={t.id} value={t.id}>
                                          {t.relationshipDesc}
                                        </option>
                                      ))}
                                  </select>
                                  <button
                                    onClick={handleDeleteWithReassign}
                                    disabled={!reassignTo}
                                    className="text-red-600 hover:underline text-xs font-medium disabled:opacity-50"
                                  >
                                    Move &amp; Delete
                                  </button>
                                  <button
                                    onClick={() => { setDeletingId(null); setReassignNeeded(null); setDeleteError(""); }}
                                    className="text-gray-500 hover:text-gray-700 text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                {deleteError && (
                                  <span className="text-red-600 text-xs">{deleteError}</span>
                                )}
                              </div>
                            ) : (
                              <span className="flex items-center gap-2">
                                {deleteError && (
                                  <span className="text-red-600 text-xs">{deleteError}</span>
                                )}
                                <button
                                  onClick={() => handleDelete(rt.id)}
                                  className="text-red-600 hover:underline text-xs font-medium"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => { setDeletingId(null); setDeleteError(""); }}
                                  className="text-gray-500 hover:text-gray-700 text-xs"
                                >
                                  Cancel
                                </button>
                              </span>
                            )
                          ) : (
                            <button
                              onClick={() => { setDeletingId(rt.id); setReassignNeeded(null); setDeleteError(""); }}
                              className="text-red-600 hover:underline text-xs"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {relTypes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    No relationship types defined.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>}

      {/* Communication Methods */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-indigo-900">Preferred Contact Methods</h2>
          {!showCommMethodForm && (
            <button
              onClick={() => { setShowCommMethodForm(true); setCommMethodError(""); setNewCommMethodName(""); }}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-200 px-2 py-1 rounded-md hover:bg-indigo-50"
            >
              + Add Method
            </button>
          )}
        </div>

        {showCommMethodForm && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newCommMethodName.trim()) return;
              setCommMethodSubmitting(true);
              setCommMethodError("");
              const res = await fetch("/api/lookup/communication-methods", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newCommMethodName.trim() }),
              });
              if (!res.ok) {
                const data = await res.json();
                setCommMethodError(data.error || "Failed to create method");
              } else {
                setNewCommMethodName("");
                setShowCommMethodForm(false);
                fetchCommMethods();
              }
              setCommMethodSubmitting(false);
            }}
            className="flex gap-2 items-center mb-4"
          >
            <input
              ref={commMethodInputRef}
              type="text"
              value={newCommMethodName}
              onChange={(e) => setNewCommMethodName(e.target.value)}
              placeholder="Method name"
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
              required
            />
            <button
              type="submit"
              disabled={commMethodSubmitting}
              className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {commMethodSubmitting ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowCommMethodForm(false)}
              className="text-gray-500 hover:text-gray-700 text-sm px-2 py-1.5"
            >
              Cancel
            </button>
            {commMethodError && <span className="text-red-600 text-xs">{commMethodError}</span>}
          </form>
        )}

        {commMethodsLoading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Name</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">In Use</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {commMethods.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  {editingCommMethodId === m.id ? (
                    <>
                      <td className="px-4 py-2" colSpan={2}>
                        <input
                          type="text"
                          value={editCommMethodName}
                          onChange={(e) => setEditCommMethodName(e.target.value)}
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                          autoFocus
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center gap-3 justify-end">
                          <button
                            onClick={async () => {
                              if (!editCommMethodName.trim()) return;
                              const res = await fetch(`/api/lookup/communication-methods/${m.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ name: editCommMethodName.trim() }),
                              });
                              if (res.ok) { setEditingCommMethodId(null); fetchCommMethods(); }
                            }}
                            className="text-indigo-600 hover:underline text-xs font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingCommMethodId(null)}
                            className="text-gray-500 hover:text-gray-700 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 text-gray-800">{m.name}</td>
                      <td className="px-4 py-2 text-gray-500">{m._count?.people ?? 0}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center gap-3 justify-end">
                          <button
                            onClick={() => { setEditingCommMethodId(m.id); setEditCommMethodName(m.name); }}
                            className="text-indigo-600 hover:underline text-xs"
                          >
                            Edit
                          </button>
                          {deletingCommMethodId === m.id ? (
                            <span className="flex items-center gap-2">
                              <span className="text-xs text-gray-600">Delete?</span>
                              {(m._count?.people ?? 0) > 0 && (
                                <span className="text-red-600 text-xs">In use by {m._count?.people} {(m._count?.people ?? 0) === 1 ? "person" : "people"} — remove assignments first.</span>
                              )}
                              {(m._count?.people ?? 0) === 0 && (
                                <>
                                  <button
                                    onClick={async () => {
                                      const res = await fetch(`/api/lookup/communication-methods/${m.id}`, { method: "DELETE" });
                                      if (res.ok) { setDeletingCommMethodId(null); fetchCommMethods(); }
                                    }}
                                    className="text-red-600 hover:underline text-xs font-medium"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeletingCommMethodId(null)}
                                    className="text-gray-500 hover:text-gray-700 text-xs"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                              {(m._count?.people ?? 0) > 0 && (
                                <button
                                  onClick={() => setDeletingCommMethodId(null)}
                                  className="text-gray-500 hover:text-gray-700 text-xs"
                                >
                                  Cancel
                                </button>
                              )}
                            </span>
                          ) : (
                            <button
                              onClick={() => setDeletingCommMethodId(m.id)}
                              className="text-red-600 hover:underline text-xs"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {commMethods.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                    No communication methods defined.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Organization Types */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-indigo-900">Organization Types</h2>
          {!showOrgTypeForm && (
            <button
              onClick={() => { setShowOrgTypeForm(true); setOrgTypeError(""); setNewOrgTypeName(""); setNewOrgTypeColor("#6366F1"); }}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-200 px-2 py-1 rounded-md hover:bg-indigo-50"
            >
              + Add Type
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-4">Assign a color to each organization type — seats on the seating chart will use these colors.</p>

        {showOrgTypeForm && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newOrgTypeName.trim()) return;
              setOrgTypeSubmitting(true);
              setOrgTypeError("");
              const res = await fetch("/api/lookup/organization-types", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ typeName: newOrgTypeName.trim(), color: newOrgTypeColor }),
              });
              if (!res.ok) {
                const data = await res.json();
                setOrgTypeError(data.error || "Failed to create type");
              } else {
                setNewOrgTypeName("");
                setNewOrgTypeColor("#6366F1");
                setShowOrgTypeForm(false);
                fetchOrgTypes();
              }
              setOrgTypeSubmitting(false);
            }}
            className="flex gap-2 items-center mb-4 flex-wrap"
          >
            <input
              type="text"
              value={newOrgTypeName}
              onChange={(e) => setNewOrgTypeName(e.target.value)}
              placeholder="Type name"
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
              required
              autoFocus
            />
            <div className="flex flex-col gap-1">
              <input
                type="color"
                value={newOrgTypeColor}
                onInput={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  setNewOrgTypeColor(val);
                  setOrgTypeError(checkOrgTypeColor(val, orgTypes) ?? "");
                }}
                onChange={(e) => {
                  setNewOrgTypeColor(e.target.value);
                  setOrgTypeError(checkOrgTypeColor(e.target.value, orgTypes) ?? "");
                }}
                className={`w-10 h-8 rounded cursor-pointer border-2 ${checkOrgTypeColor(newOrgTypeColor, orgTypes) ? "border-red-500" : "border-gray-300"}`}
                title="Pick a color"
              />
              {checkOrgTypeColor(newOrgTypeColor, orgTypes) && (
                <span className="text-red-600 text-xs max-w-[240px] leading-tight">{checkOrgTypeColor(newOrgTypeColor, orgTypes)}</span>
              )}
            </div>
            <button
              type="submit"
              disabled={orgTypeSubmitting || !!checkOrgTypeColor(newOrgTypeColor, orgTypes)}
              className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {orgTypeSubmitting ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowOrgTypeForm(false)}
              className="text-gray-500 hover:text-gray-700 text-sm px-2 py-1.5"
            >
              Cancel
            </button>
            {orgTypeError && <span className="text-red-600 text-xs">{orgTypeError}</span>}
          </form>
        )}

        {orgTypesLoading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Name</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Seat Color</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orgTypes.map((ot) => (
                <tr key={ot.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800">{ot.typeName}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <input
                          type="color"
                          defaultValue={ot.color ?? "#6366F1"}
                          className={`w-8 h-7 rounded cursor-pointer border-2 ${orgTypeColorError[ot.id] ? "border-red-500" : "border-gray-300"}`}
                          title="Pick a color"
                          onInput={(e) => {
                            const val = (e.target as HTMLInputElement).value;
                            const err = checkOrgTypeColor(val, orgTypes, ot.id);
                            setOrgTypeColorError((prev) => ({ ...prev, [ot.id]: err ?? "" }));
                          }}
                          onChange={(e) => {
                            const err = checkOrgTypeColor(e.target.value, orgTypes, ot.id);
                            setOrgTypeColorError((prev) => ({ ...prev, [ot.id]: err ?? "" }));
                          }}
                          onBlur={async (e) => {
                            const color = e.target.value;
                            const err = checkOrgTypeColor(color, orgTypes, ot.id);
                            if (err) return;
                            if (color === (ot.color ?? "#6366F1")) return;
                            setSavingOrgTypeColorId(ot.id);
                            const res = await fetch(`/api/lookup/organization-types/${ot.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ color }),
                            });
                            if (!res.ok) {
                              const data = await res.json();
                              setOrgTypeColorError((prev) => ({ ...prev, [ot.id]: data.error ?? "Failed to save" }));
                            }
                            setSavingOrgTypeColorId(null);
                            fetchOrgTypes();
                          }}
                        />
                        {orgTypeColorError[ot.id] && (
                          <span className="text-red-600 text-xs max-w-[220px] leading-tight">{orgTypeColorError[ot.id]}</span>
                        )}
                      </div>
                      {ot.color ? (
                        <span className="inline-block w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: ot.color }} />
                      ) : (
                        <span className="text-gray-400 text-xs">No color set</span>
                      )}
                      {savingOrgTypeColorId === ot.id && <span className="text-xs text-gray-400">Saving...</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {orgTypes.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-gray-400">
                    No organization types defined.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Dietary Options */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-indigo-900">Dietary Options</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Built-in options are always available. Custom options are added on-the-fly from any event&apos;s Invites tab and can be deleted here.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-2 font-medium text-gray-600">Option</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Type</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {DIETARY_OPTIONS.map((name) => (
              <tr key={name} className="border-b border-gray-100 bg-gray-50">
                <td className="px-4 py-3 text-gray-800">{name}</td>
                <td className="px-4 py-3 text-xs text-gray-400">Built-in</td>
                <td className="px-4 py-3"></td>
              </tr>
            ))}
            {dietaryOptionsLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-3 text-sm text-gray-400">Loading custom options...</td>
              </tr>
            ) : dietaryOptions.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-3 text-sm text-gray-400 italic">No custom options yet — add them from any event&apos;s Invites tab.</td>
              </tr>
            ) : (
              dietaryOptions.map((opt) => (
                <tr key={opt.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{opt.name}</td>
                  <td className="px-4 py-3 text-xs text-indigo-600 font-medium">Custom</td>
                  <td className="px-4 py-3 text-right">
                    {deletingDietaryId === opt.id ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs text-gray-600">Delete &ldquo;{opt.name}&rdquo;?</span>
                        <button
                          onClick={async () => {
                            await fetch(`/api/lookup/dietary-options/${opt.id}`, { method: "DELETE" });
                            setDeletingDietaryId(null);
                            fetchDietaryOptions();
                          }}
                          className="text-red-600 hover:underline text-xs font-medium"
                        >
                          Yes, delete
                        </button>
                        <button
                          onClick={() => setDeletingDietaryId(null)}
                          className="text-gray-500 hover:text-gray-700 text-xs"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setDeletingDietaryId(opt.id)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Data Management — SYSTEM_ADMIN and OFFICE_ADMIN */}
      {canManageUsers && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-lg font-semibold text-navy mb-4">Data Management</h2>

          {/* Export section */}
          <div className="mb-6">
            <h3 className="font-medium text-navy mb-3 text-sm">Export Data</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleExport("xlsx")}
                disabled={exporting}
                className="bg-[#2E75B6] text-white px-4 py-2 rounded-md hover:bg-[#245d91] transition-colors text-sm disabled:opacity-50"
              >
                {exporting ? "Exporting..." : "Export All (XLSX)"}
              </button>
              <button
                onClick={() => handleExport("csv", "people")}
                disabled={exporting}
                className="border border-gray-300 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
              >
                People CSV
              </button>
              <button
                onClick={() => handleExport("csv", "partners")}
                disabled={exporting}
                className="border border-gray-300 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
              >
                Partners CSV
              </button>
              <button
                onClick={() => handleExport("csv", "relationships")}
                disabled={exporting}
                className="border border-gray-300 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
              >
                Relationships CSV
              </button>
              <button
                onClick={() => handleExport("csv", "interactions")}
                disabled={exporting}
                className="border border-gray-300 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
              >
                Interactions CSV
              </button>
              <button
                onClick={() => handleExport("csv", "roles")}
                disabled={exporting}
                className="border border-gray-300 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
              >
                Roles CSV
              </button>
            </div>
          </div>

          {/* Import section */}
          <div>
            <h3 className="font-medium text-navy mb-3 text-sm">Import Data</h3>
            <form onSubmit={handleImport} className="space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Entity Type
                  </label>
                  <select
                    value={importType}
                    onChange={(e) => setImportType(e.target.value as "people" | "partners" | "roles")}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
                  >
                    <option value="people">People</option>
                    <option value="partners">Partners</option>
                    <option value="roles">Roles</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    File (.csv or .xlsx)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  />
                </div>
                <button
                  type="submit"
                  disabled={importing || !importFile}
                  className="bg-[#2E75B6] text-white px-4 py-2 rounded-md hover:bg-[#245d91] transition-colors text-sm disabled:opacity-50"
                >
                  {importing ? "Importing..." : "Import"}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                CSV files should have a header row. Expected columns for People: First Name, Last Name, Address, City, State, Zip, Phone, Email, Is Connector, Annual Events{isSystemAdmin ? ", Office" : ""}.
                For Partners: Type, Name, Org Type, Address, City, State, Zip, Phone, Email, Website, Priority{isSystemAdmin ? ", Office" : ""}.
                For Roles: Partner Name, Role Description, Person (optional, as &quot;First Last&quot;), Annual Events.
              </p>
            </form>

            {importError && (
              <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-3 mt-3 text-sm">
                {importError}
              </div>
            )}

            {importResult && (
              <div className={`border rounded-md p-3 mt-3 text-sm ${importResult.errors.length > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
                <p className="font-medium">
                  Created {importResult.created} of {importResult.total} records.
                </p>
                {importResult.errors.length > 0 && (
                  <div className="mt-2">
                    {importErrorFile && (
                      <p className="text-amber-800 text-xs mb-2">
                        An error log has been saved as <span className="font-medium">{importErrorFile}</span> in your Downloads folder.
                      </p>
                    )}
                    <p className="text-amber-800 font-medium text-xs mb-1">Errors:</p>
                    <ul className="text-xs text-amber-700 list-disc list-inside max-h-32 overflow-y-auto">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>Row {err.row}: {err.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Office Management — SYSTEM_ADMIN only */}
      {isSystemAdmin && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-indigo-900">Offices</h2>
            {!showOfficeForm && (
              <button
                onClick={() => setShowOfficeForm(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm"
              >
                Add Office
              </button>
            )}
          </div>

          {officeError && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-3 mb-4 text-sm">
              {officeError}
            </div>
          )}

          {showOfficeForm && (
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50 mb-4">
              <h3 className="font-semibold text-indigo-900 mb-3 text-sm">New Office</h3>
              <form onSubmit={handleCreateOffice} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Office Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={officeNameRef}
                    type="text"
                    required
                    value={officeName}
                    onChange={(e) => setOfficeName(e.target.value)}
                    placeholder="e.g. Kansas City Office"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={officeSubmitting}
                    className="bg-indigo-600 text-white px-4 py-1.5 rounded-md hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                  >
                    {officeSubmitting ? "Creating..." : "Create Office"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowOfficeForm(false); setOfficeError(""); }}
                    className="text-gray-500 hover:text-gray-700 text-sm px-3 py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {officesLoading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-indigo-900">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-indigo-900">Siloed</th>
                  <th className="text-left px-4 py-3 font-semibold text-indigo-900">Users</th>
                  <th className="text-left px-4 py-3 font-semibold text-indigo-900">People</th>
                  <th className="text-left px-4 py-3 font-semibold text-indigo-900">Partners</th>
                  <th className="text-right px-4 py-3 font-semibold text-indigo-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {offices.map((office) => (
                  <tr key={office.id} className="hover:bg-gray-50">
                    {editingOfficeId === office.id ? (
                      <>
                        <td className="px-4 py-2" colSpan={2}>
                          <input
                            type="text"
                            value={editOfficeName}
                            onChange={(e) => setEditOfficeName(e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-2" colSpan={3}>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={editOfficeSiloed}
                              onChange={(e) => setEditOfficeSiloed(e.target.checked)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            Data Siloed
                          </label>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleUpdateOffice(office.id)}
                              disabled={officeSubmitting}
                              className="text-indigo-600 hover:underline text-xs disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingOfficeId(null)}
                              className="text-gray-500 hover:text-gray-700 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium">{office.name}</td>
                        <td className="px-4 py-3">
                          {office.isSiloed ? (
                            <span className="inline-block bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full">
                              Siloed
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{office._count?.users ?? 0}</td>
                        <td className="px-4 py-3 text-gray-600">{office._count?.people ?? 0}</td>
                        <td className="px-4 py-3 text-gray-600">{office._count?.partners ?? 0}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-3 justify-end">
                            <button
                              onClick={() => { setEditingOfficeId(office.id); setEditOfficeName(office.name); setEditOfficeSiloed(office.isSiloed); }}
                              className="text-indigo-600 hover:underline text-xs"
                            >
                              Edit
                            </button>
                            {deletingOfficeId === office.id ? (
                              <span className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDeleteOffice(office.id)}
                                  className="text-red-600 hover:underline text-xs font-medium"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeletingOfficeId(null)}
                                  className="text-gray-500 hover:text-gray-700 text-xs"
                                >
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => setDeletingOfficeId(office.id)}
                                className="text-red-600 hover:underline text-xs"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {offices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No offices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Constant Contact Integration */}
      {(isSystemAdmin || isOfficeAdmin) && (
        <div className="bg-white rounded-lg shadow p-6 mb-6 mt-6">
          <h2 className="text-lg font-semibold text-indigo-900 mb-1">Integrations</h2>
          <p className="text-sm text-gray-500 mb-4">
            Connect third-party services to sync your event data.
          </p>

          {/* Email Platform — Constant Contact or Zeffy toggle */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-gray-900">Email Platform</h3>
                <p className="text-sm text-gray-500">Choose one platform for email campaigns and fundraising</p>
              </div>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                <button
                  onClick={() => handleSwitchEmailPlatform("constant_contact")}
                  className={`px-4 py-1.5 transition-colors ${emailPlatform === "constant_contact" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  Constant Contact
                </button>
                <button
                  onClick={() => handleSwitchEmailPlatform("zeffy")}
                  className={`px-4 py-1.5 border-l border-gray-200 transition-colors ${emailPlatform === "zeffy" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  Zeffy
                </button>
              </div>
            </div>

            {emailPlatform === "constant_contact" && ccMessage && (
              <div className={`mb-3 p-3 rounded-md text-sm ${ccMessage.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                {ccMessage.text}
                <button onClick={() => setCcMessage(null)} className="float-right text-xs underline">Dismiss</button>
              </div>
            )}
            {emailPlatform === "zeffy" && zeffyMessage && (
              <div className={`mb-3 p-3 rounded-md text-sm ${zeffyMessage.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                {zeffyMessage.text}
                <button onClick={() => saveZeffyMessage(null)} className="float-right text-xs underline">Dismiss</button>
              </div>
            )}

            {emailPlatform === "zeffy" && pendingDuplicates.length > 0 && (
              <div className="mb-3 border border-amber-200 rounded-md bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  Possible duplicate{pendingDuplicates.length > 1 ? "s" : ""} — please review before importing
                </p>
                <div className="space-y-2">
                  {pendingDuplicates.map((dupe, i) => (
                    <div key={i} className="bg-white border border-amber-200 rounded p-3 text-sm">
                      <p className="font-medium text-gray-900">{dupe.zeffyContact.firstName} {dupe.zeffyContact.lastName}</p>
                      <p className="text-gray-500 text-xs mt-0.5">Zeffy email: {dupe.zeffyContact.email}</p>
                      <p className="text-gray-500 text-xs">Existing record: {dupe.existingPerson.email1 ?? dupe.existingPerson.email2 ?? "no email on file"}</p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleResolveDuplicate(i, "link")}
                          disabled={dupe.resolving}
                          className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {dupe.resolving ? "Saving…" : "Link to existing record"}
                        </button>
                        <button
                          onClick={() => handleResolveDuplicate(i, "create")}
                          disabled={dupe.resolving}
                          className="px-3 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                          Create as new person
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  {emailPlatform === "constant_contact" ? (
                    <>
                      <p className="font-medium text-gray-900 text-sm">Constant Contact</p>
                      <p className="text-xs text-gray-500">Sync event invite lists as email contact lists</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-gray-900 text-sm">Zeffy</p>
                      <p className="text-xs text-gray-500">Free fundraising platform — import donations and sync contacts</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {emailPlatform === "constant_contact" ? (
                  ccLoading ? (
                    <span className="text-sm text-gray-400">Checking...</span>
                  ) : ccConnected ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        Connected
                      </span>
                      <button
                        onClick={handleCcDisconnect}
                        disabled={ccDisconnecting}
                        className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
                      >
                        {ccDisconnecting ? "Disconnecting..." : "Disconnect"}
                      </button>
                    </>
                  ) : (
                    <a
                      href="/api/constant-contact/auth"
                      className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Connect
                    </a>
                  )
                ) : (
                  zeffyLoading ? (
                    <span className="text-sm text-gray-400">Checking...</span>
                  ) : zeffyConnected ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        Connected
                      </span>
                      <button
                        onClick={handleZeffySync}
                        disabled={zeffySyncing}
                        className="px-3 py-1.5 text-sm text-indigo-600 border border-indigo-300 rounded-md hover:bg-indigo-50 disabled:opacity-50"
                      >
                        {zeffySyncing ? "Syncing..." : "Sync Now"}
                      </button>
                      <button
                        onClick={handleZeffyDisconnect}
                        disabled={zeffyDisconnecting}
                        className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
                      >
                        {zeffyDisconnecting ? "Disconnecting..." : "Disconnect"}
                      </button>
                    </>
                  ) : (
                    <form onSubmit={handleZeffyConnect} className="flex items-center gap-2">
                      <input
                        type="password"
                        value={zeffyApiKey}
                        onChange={(e) => setZeffyApiKey(e.target.value)}
                        placeholder="Zeffy API Key"
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <button
                        type="submit"
                        disabled={zeffyConnecting || !zeffyApiKey.trim()}
                        className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {zeffyConnecting ? "Connecting..." : "Connect"}
                      </button>
                    </form>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Stripe Integration */}
          <div className="border border-gray-200 rounded-lg p-4 mt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Stripe</h3>
                  <p className="text-sm text-gray-500">
                    Accept online donations via Stripe Checkout
                  </p>
                  {stripeConnected && (
                    <p className="text-xs text-gray-400 mt-1">
                      Webhook URL: <span className="font-mono">{typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/stripe</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {stripeLoading ? (
                  <span className="text-sm text-gray-400">Checking...</span>
                ) : stripeConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-500 text-sm rounded-full">
                    Not configured
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* QuickBooks Integration */}
          {qbMessage && (
            <div
              className={`mt-4 p-3 rounded-md text-sm ${
                qbMessage.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {qbMessage.text}
              <button
                onClick={() => setQbMessage(null)}
                className="float-right text-xs underline"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="border border-gray-200 rounded-lg p-4 mt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">QuickBooks</h3>
                  <p className="text-sm text-gray-500">
                    Sync donations as Sales Receipts in QuickBooks
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {qbLoading ? (
                  <span className="text-sm text-gray-400">Checking...</span>
                ) : qbConnected ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                      Connected
                    </span>
                    <button
                      onClick={handleQbDisconnect}
                      disabled={qbDisconnecting}
                      className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
                    >
                      {qbDisconnecting ? "Disconnecting..." : "Disconnect"}
                    </button>
                  </>
                ) : (
                  <a
                    href="/api/quickbooks/auth"
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Connect
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Claude AI Integration */}
          {aiMessage && (
            <div
              className={`mt-4 p-3 rounded-md text-sm ${
                aiMessage.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {aiMessage.text}
              <button
                onClick={() => setAiMessage(null)}
                className="float-right text-xs underline"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="border border-gray-200 rounded-lg p-4 mt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Claude AI</h3>
                  <p className="text-sm text-gray-500">
                    Powers AI features like person briefings. Each office uses its own
                    Anthropic key and pays for its own usage.
                  </p>
                  {!aiConnected && !aiLoading && (
                    <p className="text-xs text-gray-400 mt-1">
                      Create a key at console.anthropic.com → API Keys, then paste it here.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {aiLoading ? (
                  <span className="text-sm text-gray-400">Checking...</span>
                ) : aiConnected ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                      Connected
                    </span>
                    <button
                      onClick={handleAiDisconnect}
                      disabled={aiDisconnecting}
                      className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
                    >
                      {aiDisconnecting ? "Disconnecting..." : "Disconnect"}
                    </button>
                  </>
                ) : (
                  <form onSubmit={handleAiConnect} className="flex items-center gap-2">
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="Anthropic API Key (sk-ant-...)"
                      className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      disabled={aiConnecting || !aiApiKey.trim()}
                      className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {aiConnecting ? "Verifying..." : "Connect"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
