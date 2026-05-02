"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PersonNote {
  id: string;
  content: string;
  createdAt: string;
  author: { firstName: string; lastName: string };
}

interface PersonNotesSectionProps {
  personId: string;
  notes: PersonNote[];
  canEdit: boolean;
}

export default function PersonNotesSection({ personId, notes, canEdit }: PersonNotesSectionProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!text.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/people/${personId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Failed to save.");
      return;
    }
    setText("");
    router.refresh();
  }

  async function handleDelete(noteId: string) {
    if (!confirm("Delete this note?")) return;
    setDeletingId(noteId);
    await fetch(`/api/people/${personId}/notes/${noteId}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold text-indigo-900 mb-4">Notes</h2>

      {notes.length === 0 && !canEdit && (
        <p className="text-sm text-gray-400">No notes yet.</p>
      )}

      {notes.length > 0 && (
        <div className="space-y-4 mb-5">
          {notes.map((note) => (
            <div key={note.id} className="border border-gray-100 rounded-md p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">
                  {note.author.firstName} {note.author.lastName}
                  {" · "}
                  {new Date(note.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                {canEdit && (
                  <button
                    onClick={() => handleDelete(note.id)}
                    disabled={deletingId === note.id}
                    className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
            placeholder="Add a note..."
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={handleAdd}
            disabled={saving || !text.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add Note"}
          </button>
        </div>
      )}
    </div>
  );
}
