"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const TREK_ROUTES = [
  { value: "EBC", label: "Everest Base Camp" },
  { value: "ABC", label: "Annapurna Base Camp" },
  { value: "LANGTANG", label: "Langtang" },
  { value: "MANASLU", label: "Manaslu" },
  { value: "UPPER_MUSTANG", label: "Upper Mustang" },
];

const MANAGED_BY = [
  { value: "OWNER", label: "Owner" },
  { value: "PLATFORM", label: "Platform" },
  { value: "HYBRID", label: "Hybrid" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export default function NewLodgePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    village: "",
    district: "",
    trekRoute: "EBC",
    trailPosition: "",
    altitudeMeters: "",
    description: "",
    managedBy: "OWNER",
    ownerId: "",
  });

  const updateField = useCallback(
    (field: string, value: string) => {
      setForm((prev) => {
        const next = { ...prev, [field]: value };
        if (field === "name") {
          next.slug = slugify(value);
        }
        return next;
      });
    },
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const body = {
        name: form.name,
        slug: form.slug,
        village: form.village,
        district: form.district,
        trekRoute: form.trekRoute,
        trailPosition: parseInt(form.trailPosition, 10),
        altitudeMeters: form.altitudeMeters ? parseInt(form.altitudeMeters, 10) : null,
        description: form.description || null,
        managedBy: form.managedBy,
        ownerId: form.ownerId,
      };

      const res = await fetch("/api/admin/lodges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create lodge");
      }

      router.push("/admin/lodges");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900">Add New Lodge</h1>

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Lodge Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="e.g. Namche Lodge"
            />
          </div>

          {/* Slug */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Slug</label>
            <input
              type="text"
              required
              value={form.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-mono shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Village */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Village <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.village}
              onChange={(e) => updateField("village", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="e.g. Namche Bazaar"
            />
          </div>

          {/* District */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              District <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.district}
              onChange={(e) => updateField("district", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="e.g. Solukhumbu"
            />
          </div>

          {/* Trek Route */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Trek Route <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.trekRoute}
              onChange={(e) => updateField("trekRoute", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              {TREK_ROUTES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Trail Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Trail Position <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min={1}
              value={form.trailPosition}
              onChange={(e) => updateField("trailPosition", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="Order on trail (1, 2, 3...)"
            />
          </div>

          {/* Altitude */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Altitude (m)</label>
            <input
              type="number"
              value={form.altitudeMeters}
              onChange={(e) => updateField("altitudeMeters", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="e.g. 3440"
            />
          </div>

          {/* Managed By */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Managed By</label>
            <select
              value={form.managedBy}
              onChange={(e) => updateField("managedBy", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              {MANAGED_BY.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Owner ID */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Owner User ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.ownerId}
              onChange={(e) => updateField("ownerId", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="CUID of the owner user"
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="Brief description of the lodge..."
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Creating..." : "Create Lodge"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/lodges")}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
