"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OwnerReplyForm({
  threadId,
  closed,
}: {
  threadId: string;
  closed: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (closed) {
    return (
      <p className="text-sm text-gray-500">
        This thread is closed. Reply disabled.
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !message.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/messages/${threadId}/reply`, {
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
    <form onSubmit={submit} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <label className="block">
        <span className="block text-sm font-medium text-gray-700">Your reply</span>
        <textarea
          required
          rows={4}
          maxLength={4000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Reply to the trekker…"
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
        />
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          The trekker will get an email with your reply.
        </p>
        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send reply"}
        </button>
      </div>
    </form>
  );
}
