"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  bookingRef: string;
  remainingNpr: number;
  primaryMethod: string;
}

export default function RefundDialog({
  bookingRef,
  remainingNpr,
  primaryMethod,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(remainingNpr.toString());
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (remainingNpr <= 0) {
    return (
      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
        Fully refunded
      </span>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingRef}/refund`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountNpr: amount, reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Refund failed");
      } else {
        setSuccess(data.message ?? "Refund created");
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
      >
        Issue refund
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => setOpen(false)}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-5 shadow-xl dark:bg-stone-900 dark:ring-1 dark:ring-stone-800"
      >
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-stone-100">Issue refund</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-stone-400 dark:hover:text-stone-200"
          >
            Close
          </button>
        </div>

        <div className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700 dark:bg-stone-950 dark:text-stone-200">
          <p>
            Booking{" "}
            <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
              {bookingRef}
            </span>{" "}
            · paid via <span className="font-medium">{primaryMethod}</span>
          </p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Up to <span className="font-semibold text-stone-700 dark:text-stone-200">NPR {remainingNpr.toLocaleString()}</span> can still be refunded.
          </p>
        </div>

        <label className="block">
          <span className="block text-xs font-medium text-stone-700 dark:text-stone-300">
            Refund amount (NPR)
          </span>
          <input
            required
            type="number"
            min={1}
            max={remainingNpr}
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputCls}
          />
          <div className="mt-1 flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setAmount(remainingNpr.toString())}
              className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Full ({remainingNpr.toLocaleString()})
            </button>
            <button
              type="button"
              onClick={() => setAmount((remainingNpr / 2).toString())}
              className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Half
            </button>
          </div>
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-stone-700 dark:text-stone-300">
            Reason (optional)
          </span>
          <textarea
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Trekker cancelled due to altitude sickness"
            className={inputCls}
          />
        </label>

        {primaryMethod !== "STRIPE" && primaryMethod !== "CASH" && (
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <strong>{primaryMethod}</strong> refunds aren&apos;t automated. Saving here
            records the intent and notifies the trekker, but you must still process the
            actual refund via the {primaryMethod} dashboard.
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {success && <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
          >
            {submitting ? "Processing…" : `Refund NPR ${Number(amount || 0).toLocaleString()}`}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder-stone-500 dark:[color-scheme:dark]";
