"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface Initial {
  name: string;
  email: string;
  phone: string;
  nationality: string;
  passportNumber: string;
  profilePhoto: string;
}

export default function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [nationality, setNationality] = useState(initial.nationality);
  const [passportNumber, setPassportNumber] = useState(initial.passportNumber);
  const [profilePhoto, setProfilePhoto] = useState(initial.profilePhoto);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<
    | { kind: "success"; text: string }
    | { kind: "error"; text: string }
    | null
  >(null);

  async function uploadPhoto(file: File) {
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/photo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setMessage({ kind: "error", text: data.error ?? "Upload failed" });
        return;
      }
      setProfilePhoto(data.url);
    } catch {
      setMessage({ kind: "error", text: "Upload failed" });
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          nationality,
          passportNumber,
          profilePhoto: profilePhoto || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage({ kind: "error", text: data.error ?? "Save failed" });
      } else {
        setMessage({ kind: "success", text: "Profile updated." });
        router.refresh();
      }
    } catch {
      setMessage({ kind: "error", text: "Network error" });
    } finally {
      setSubmitting(false);
    }
  }

  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <form
      onSubmit={save}
      className="space-y-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800"
    >
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-emerald-50 ring-1 ring-stone-200 dark:bg-emerald-950/40 dark:ring-stone-700">
          {profilePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profilePhoto} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadPhoto(f);
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              {uploading ? "Uploading…" : profilePhoto ? "Change photo" : "Upload photo"}
            </button>
            {profilePhoto && (
              <button
                type="button"
                onClick={() => setProfilePhoto("")}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
              >
                Remove
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
            JPEG, PNG, or WebP · max 3 MB
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" required>
          <input
            required
            type="text"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Email" hint="Used to sign in. Contact support to change.">
          <input
            type="email"
            value={initial.email}
            disabled
            className={`${inputCls} cursor-not-allowed opacity-70`}
          />
        </Field>
        <Field label="Phone">
          <input
            type="tel"
            maxLength={30}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+977 98XXXXXXXX"
            className={inputCls}
          />
        </Field>
        <Field label="Nationality">
          <input
            type="text"
            maxLength={60}
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            placeholder="e.g. Nepali"
            className={inputCls}
          />
        </Field>
        <Field label="Passport number" hint="Required for some lodges and TIMS card.">
          <input
            type="text"
            maxLength={30}
            value={passportNumber}
            onChange={(e) => setPassportNumber(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      {message && (
        <p
          className={`text-sm ${
            message.kind === "success"
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-stone-700 dark:text-stone-300">
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </span>
      {children}
      {hint && (
        <span className="mt-0.5 block text-xs text-stone-400 dark:text-stone-500">
          {hint}
        </span>
      )}
    </label>
  );
}
