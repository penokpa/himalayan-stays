"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function PhotosForm({
  lodgeId,
  initialPhotos,
}: {
  lodgeId: string;
  initialPhotos: string[];
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function persist(next: string[]) {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/lodges/${lodgeId}/photos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      const data = await res.json();
      setPhotos(data.lodge.photos);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(fileList)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload-image", { method: "POST", body: fd });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Upload failed for ${file.name}`);
        }
        const data = await res.json();
        uploadedUrls.push(data.url);
      }
      const next = [...photos, ...uploadedUrls];
      // Optimistically show even before persist round-trips
      setPhotos(next);
      await persist(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleAdd() {
    if (!newUrl.trim()) return;
    try {
      new URL(newUrl);
    } catch {
      setError("Enter a valid URL (https://…)");
      return;
    }
    const next = [...photos, newUrl.trim()];
    setNewUrl("");
    persist(next);
  }

  function handleRemove(i: number) {
    const next = photos.filter((_, idx) => idx !== i);
    persist(next);
  }

  function handleMove(from: number, to: number) {
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    persist(next);
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {photos.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          No photos yet. Paste an image URL below to add one.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="group relative overflow-hidden rounded-lg ring-1 ring-gray-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Photo ${i + 1}`}
                className="h-32 w-full object-cover"
              />
              {i === 0 && (
                <span className="absolute top-2 left-2 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  COVER
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-1.5 opacity-0 transition group-hover:opacity-100">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleMove(i, i - 1)}
                    disabled={i === 0 || saving}
                    className="rounded bg-white/90 px-1.5 text-xs text-gray-700 disabled:opacity-30"
                    aria-label="Move left"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(i, i + 1)}
                    disabled={i === photos.length - 1 || saving}
                    className="rounded bg-white/90 px-1.5 text-xs text-gray-700 disabled:opacity-30"
                    aria-label="Move right"
                  >
                    →
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  disabled={saving}
                  className="rounded bg-red-600 px-2 text-xs font-medium text-white disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading || saving}
          className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-700 disabled:opacity-50"
        />
        {uploading && (
          <span className="text-xs font-medium text-indigo-600">Uploading…</span>
        )}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700">
          …or paste a URL
        </summary>
        <div className="mt-2 flex gap-2">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="https://example.com/lodge-photo.jpg"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newUrl.trim() || saving}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Add URL"}
          </button>
        </div>
      </details>

      <p className="mt-3 text-xs text-gray-500">
        First photo is shown as the cover. JPEG/PNG/WebP, max 5 MB each. Hover a
        thumbnail to reorder or remove.
      </p>
    </div>
  );
}
