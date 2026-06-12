"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function PartnerLogoSection({
  partnerId,
  logoUrl,
  canEdit,
}: {
  partnerId: string;
  logoUrl: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  if (!canEdit && !logoUrl) return null;

  async function upload(file: File) {
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/partners/${partnerId}/logo`, {
      method: "POST",
      body: formData,
    });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to upload logo");
      return;
    }
    router.refresh();
  }

  async function remove() {
    if (!confirm("Remove this logo?")) return;
    setUploading(true);
    await fetch(`/api/partners/${partnerId}/logo`, { method: "DELETE" });
    setUploading(false);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold text-indigo-900 mb-3">Logo</h2>
      <div className="flex items-center gap-4">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt="Partner logo"
            width={80}
            height={80}
            className="h-20 w-20 object-contain border border-gray-200 rounded bg-white"
            unoptimized
          />
        ) : (
          <div className="h-20 w-20 border border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-400">
            No logo
          </div>
        )}
        {canEdit && (
          <div className="flex items-center gap-3">
            <label className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
              {uploading ? "Uploading..." : logoUrl ? "Replace" : "Upload Logo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload(file);
                  e.target.value = "";
                }}
              />
            </label>
            {logoUrl && (
              <button onClick={remove} disabled={uploading} className="text-sm text-red-500 hover:text-red-700 underline">
                Remove
              </button>
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Used for sponsor recognition — shows on pledge lists and future event materials.
      </p>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
