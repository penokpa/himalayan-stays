"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  reviewId: string;
  initialReply?: string | null;
  initialReplyAt?: Date | string | null;
}

function fmt(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ReviewReplyForm({
  reviewId,
  initialReply,
  initialReplyAt,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(!initialReply);
  const [reply, setReply] = useState(initialReply ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !reply.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/reviews/${reviewId}/reply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reply }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to save");
      } else {
        setEditing(false);
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove() {
    if (!confirm("Delete your reply? Trekkers will no longer see it.")) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/reviews/${reviewId}/reply`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to delete");
      } else {
        setReply("");
        setEditing(true);
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing && initialReply) {
    return (
      <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Your reply
            {initialReplyAt && (
              <span className="ml-2 font-normal text-stone-400 dark:text-stone-500">
                · {fmt(initialReplyAt)}
              </span>
            )}
          </p>
          <div className="flex shrink-0 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={submitting}
              className="font-medium text-rose-600 hover:underline disabled:opacity-50 dark:text-rose-400"
            >
              Delete
            </button>
          </div>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700 dark:text-stone-200">
          {initialReply}
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="mt-3">
      <textarea
        required
        rows={3}
        maxLength={2000}
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder={
          initialReply
            ? "Update your reply…"
            : "Write a public response. Thank the trekker, address concerns, share what you've improved."
        }
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-2 flex items-center justify-end gap-2">
        {initialReply && (
          <button
            type="button"
            onClick={() => {
              setReply(initialReply);
              setEditing(false);
              setError(null);
            }}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || !reply.trim()}
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {submitting ? "Saving…" : initialReply ? "Save changes" : "Post reply"}
        </button>
      </div>
    </form>
  );
}
