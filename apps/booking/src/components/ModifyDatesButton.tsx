"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  bookingRef: string;
  defaultEmail?: string;
  currentStartDate: Date | string;
  size?: "sm" | "md";
}

function toDateInputValue(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

export default function ModifyDatesButton({
  bookingRef,
  defaultEmail,
  currentStartDate,
  size = "md",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [newStart, setNewStart] = useState(toDateInputValue(currentStartDate));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ diffNpr: number; shifted: number } | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingRef}/modify-dates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, startDate: newStart }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Modification failed");
      }
      setSuccess({ diffNpr: data.diffNpr, shifted: data.shiftedDays });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Modification failed");
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setOpen(false);
    setSuccess(null);
    setError(null);
  }

  const triggerClasses =
    size === "sm"
      ? "rounded-md border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
      : "rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50";

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
        Change dates
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => !submitting && close()}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-stone-900">
              Change booking dates
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              The whole itinerary shifts by the same number of days. Number of
              nights at each stop stays the same.
            </p>

            <label className="mt-4 block text-sm font-medium text-stone-700">
              New trek start date
              <input
                type="date"
                required
                min={today}
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-stone-700">
              Confirm your email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              />
            </label>

            {error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Dates shifted by {Math.abs(success.shifted)}{" "}
                {Math.abs(success.shifted) === 1 ? "day" : "days"}{" "}
                {success.shifted > 0 ? "later" : "earlier"}.{" "}
                {success.diffNpr === 0
                  ? "No price change."
                  : success.diffNpr > 0
                    ? `Total increased by NPR ${success.diffNpr.toLocaleString()}.`
                    : `Total decreased by NPR ${Math.abs(success.diffNpr).toLocaleString()}.`}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={submitting}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                {success ? "Close" : "Cancel"}
              </button>
              {!success && (
                <button
                  type="submit"
                  disabled={submitting || !email || !newStart}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? "Updating…" : "Update dates"}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </>
  );
}
