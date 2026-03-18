"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";

interface AnnualEventType {
  id: string;
  name: string;
  office?: { name: string };
  _count?: {
    peopleAnnualEventTypes: number;
    partnerAnnualEventTypes: number;
    partnerRoleAnnualEventTypes: number;
  };
}

interface RelationshipType {
  id: string;
  relationshipDesc: string;
  notes: string | null;
  _count?: { relationships: number };
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

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const role = session?.user?.role;
  const isSystemAdmin = role === "SYSTEM_ADMIN";
  const isOfficeAdmin = role === "OFFICE_ADMIN";
  const canManageUsers = isSystemAdmin || isOfficeAdmin;

  const [relTypes, setRelTypes] = useState<RelationshipType[]>([]);
  const [loading, setLoading] = useState(true);

  // New type form
  const [showForm, setShowForm] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [reassignNeeded, setReassignNeeded] = useState<{ id: string; count: number } | null>(null);
  const [reassignTo, setReassignTo] = useState("");

  // Annual event types state
  const [aetTypes, setAetTypes] = useState<AnnualEventType[]>([]);
  const [aetLoading, setAetLoading] = useState(true);
  const [showAetForm, setShowAetForm] = useState(false);
  const [newAetName, setNewAetName] = useState("");
  const [aetSubmitting, setAetSubmitting] = useState(false);
  const [aetError, setAetError] = useState("");
  const [editingAetId, setEditingAetId] = useState<string | null>(null);
  const [editAetName, setEditAetName] = useState("");
  const [deletingAetId, setDeletingAetId] = useState<string | null>(null);
  const aetInputRef = useRef<HTMLInputElement>(null);

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

  function fetchAetTypes() {
    fetch("/api/lookup/annual-event-types")
      .then((res) => res.json())
      .then((data) => {
        setAetTypes(data);
        setAetLoading(false);
      })
      .catch(() => setAetLoading(false));
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

  useEffect(() => {
    if (showForm && relTypeInputRef.current) relTypeInputRef.current.focus();
  }, [showForm]);

  useEffect(() => {
    if (showAetForm && aetInputRef.current) aetInputRef.current.focus();
  }, [showAetForm]);

  useEffect(() => {
    if (showUserForm && userFirstNameRef.current) userFirstNameRef.current.focus();
  }, [showUserForm]);

  useEffect(() => {
    if (showOfficeForm && officeNameRef.current) officeNameRef.current.focus();
  }, [showOfficeForm]);

  useEffect(() => {
    if (isSystemAdmin) {
      fetchTypes();
      fetchAetTypes();
    }
  }, [isSystemAdmin]);

  useEffect(() => {
    if (canManageUsers) {
      fetchUsers();
      fetchOffices();
    }
  }, [canManageUsers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/lookup/relationship-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationshipDesc: newDesc, notes: newNotes }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }

      setNewDesc("");
      setNewNotes("");
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
        body: JSON.stringify({ relationshipDesc: editDesc, notes: editNotes }),
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
    setDeletingId(null);
  }

  async function handleCreateAet(e: React.FormEvent) {
    e.preventDefault();
    setAetSubmitting(true);
    setAetError("");

    try {
      const res = await fetch("/api/lookup/annual-event-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newAetName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }

      setNewAetName("");
      setShowAetForm(false);
      fetchAetTypes();
    } catch (err: unknown) {
      setAetError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setAetSubmitting(false);
    }
  }

  async function handleUpdateAet(id: string) {
    setAetSubmitting(true);
    setAetError("");

    try {
      const res = await fetch(`/api/lookup/annual-event-types/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editAetName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      setEditingAetId(null);
      fetchAetTypes();
    } catch (err: unknown) {
      setAetError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setAetSubmitting(false);
    }
  }

  async function handleDeleteAet(id: string) {
    setAetError("");

    try {
      const res = await fetch(`/api/lookup/annual-event-types/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      setDeletingAetId(null);
      fetchAetTypes();
    } catch (err: unknown) {
      setAetError(err instanceof Error ? err.message : "An error occurred");
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

      {/* Relationship Types — SYSTEM_ADMIN only */}
      {isSystemAdmin && <div className="bg-white rounded-lg shadow p-6">
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
                        {rt._count?.relationships ?? 0}
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
                          {rt._count?.relationships ?? 0}
                        </span>
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

      {/* Annual Event Types — SYSTEM_ADMIN only */}
      {isSystemAdmin && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-indigo-900">Annual Event Types</h2>
            {!showAetForm && (
              <button
                onClick={() => { setShowAetForm(true); setEditingAetId(null); }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm"
              >
                Add Event Type
              </button>
            )}
          </div>

          {aetError && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-3 mb-4 text-sm">
              {aetError}
            </div>
          )}

          {showAetForm && (
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50 mb-4">
              <h3 className="font-semibold text-indigo-900 mb-3 text-sm">New Annual Event Type</h3>
              <form onSubmit={handleCreateAet} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={aetInputRef}
                    type="text"
                    required
                    value={newAetName}
                    onChange={(e) => setNewAetName(e.target.value)}
                    placeholder="e.g. Gala, Golf Tournament"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={aetSubmitting}
                    className="bg-indigo-600 text-white px-4 py-1.5 rounded-md hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                  >
                    {aetSubmitting ? "Saving..." : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAetForm(false); setAetError(""); }}
                    className="text-gray-500 hover:text-gray-700 text-sm px-3 py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {aetLoading ? (
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
                {aetTypes.map((aet) => {
                  const usageCount =
                    (aet._count?.peopleAnnualEventTypes ?? 0) +
                    (aet._count?.partnerAnnualEventTypes ?? 0) +
                    (aet._count?.partnerRoleAnnualEventTypes ?? 0);
                  return (
                    <tr key={aet.id} className="hover:bg-gray-50">
                      {editingAetId === aet.id ? (
                        <>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={editAetName}
                              onChange={(e) => setEditAetName(e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                          {isSystemAdmin && <td className="px-4 py-2 text-gray-600">{aet.office?.name ?? "—"}</td>}
                          <td className="px-4 py-2 text-gray-600">{usageCount}</td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleUpdateAet(aet.id)}
                                disabled={aetSubmitting}
                                className="text-indigo-600 hover:underline text-xs disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingAetId(null)}
                                className="text-gray-500 hover:text-gray-700 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-medium">{aet.name}</td>
                          {isSystemAdmin && <td className="px-4 py-3 text-gray-600">{aet.office?.name ?? "—"}</td>}
                          <td className="px-4 py-3">
                            <span className="inline-block bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">
                              {usageCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex gap-3 justify-end">
                              <button
                                onClick={() => { setEditingAetId(aet.id); setEditAetName(aet.name); setDeletingAetId(null); }}
                                className="text-indigo-600 hover:underline text-xs"
                              >
                                Edit
                              </button>
                              {deletingAetId === aet.id ? (
                                <span className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleDeleteAet(aet.id)}
                                    className="text-red-600 hover:underline text-xs font-medium"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeletingAetId(null)}
                                    className="text-gray-500 hover:text-gray-700 text-xs"
                                  >
                                    Cancel
                                  </button>
                                </span>
                              ) : (
                                <button
                                  onClick={() => setDeletingAetId(aet.id)}
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
                {aetTypes.length === 0 && (
                  <tr>
                    <td colSpan={isSystemAdmin ? 4 : 3} className="px-4 py-8 text-center text-gray-400">
                      No annual event types defined.
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
                    <input
                      type="password"
                      required
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder="Temporary password"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
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
                          <input
                            type="password"
                            value={editUserPassword}
                            onChange={(e) => setEditUserPassword(e.target.value)}
                            placeholder="New password (leave blank to keep)"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
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
                            {{ SYSTEM_ADMIN: "System Admin", OFFICE_ADMIN: "Office Admin", OFFICE_USER: "Office User", CONNECTOR: "Connector" }[user.role] || user.role}
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
    </div>
  );
}
