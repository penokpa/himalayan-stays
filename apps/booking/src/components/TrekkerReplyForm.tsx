"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TrekkerReplyForm({
  token,
  closed,
}: {
  token: string;
  closed: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (closed) {
    return (
      <p className="text-sm text-stone-500">
        This conversation is closed.
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !message.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages/${token}/reply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to send");
      } else {
        setMessage("");
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
      <label className="block">
        <span className="block text-sm font-medium text-stone-700">Reply</span>
        <textarea
          required
          rows={4}
          maxLength={4000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Send another message…"
          className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
        />
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex items-center justify-end">
        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
