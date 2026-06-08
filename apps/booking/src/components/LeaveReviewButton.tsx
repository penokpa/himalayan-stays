"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  bookingRef: string;
  lodgeId: string;
  lodgeName: string;
  defaultEmail?: string;
  alreadyReviewed?: boolean;
  size?: "sm" | "md";
}

export default function LeaveReviewButton({
  bookingRef,
  lodgeId,
  lodgeName,
  defaultEmail,
  alreadyReviewed,
  size = "md",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (alreadyReviewed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Review submitted
      </span>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Please pick a rating");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingRef, lodgeId, email, rating, comment }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Submission failed");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  const triggerClasses =
    size === "sm"
      ? "rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
      : "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700";

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={triggerClasses}
      >
        Leave a review
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-stone-900">
              Review your stay at {lodgeName}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Help future trekkers choose. Reviews appear on the lodge page.
            </p>

            {/* Stars */}
            <div className="mt-4">
              <p className="text-sm font-medium text-stone-700">Rating</p>
              <div className="mt-1 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${n} stars`}
                    className="focus:outline-none"
                  >
                    <svg
                      className={`h-8 w-8 transition ${
                        n <= (hoverRating || rating)
                          ? "fill-amber-400"
                          : "fill-stone-200 hover:fill-amber-200"
                      }`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.05 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.539-1.118l1.519-4.674a1 1 0 00-.363-1.118L2.075 10.1c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <label className="mt-4 block text-sm font-medium text-stone-700">
              Confirm your email
              <input
                type="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder="you@example.com"
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              />
            </label>

            {/* Comment */}
            <label className="mt-4 block text-sm font-medium text-stone-700">
              Comment <span className="text-stone-400">(optional)</span>
              <textarea
                rows={4}
                value={comment}
                onChange={(ev) => setComment(ev.target.value)}
                placeholder="What was great? What could be better?"
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              />
            </label>

            {error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || rating === 0 || !email}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit review"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
