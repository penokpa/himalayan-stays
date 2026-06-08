"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  bookingRef: string;
  defaultEmail?: string;
  size?: "sm" | "md";
  variant?: "outline" | "link";
}

export default function CancelBookingButton({
  bookingRef,
  defaultEmail,
  size = "md",
  variant = "outline",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingRef}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Cancellation failed");
      }
      if (data.refund?.ok) {
        setSuccess(data.refund.message ?? "Booking cancelled and refund issued.");
      } else if (data.refund?.error) {
        setSuccess(
          `Booking cancelled, but the auto-refund failed: ${data.refund.error}. Our team will follow up.`
        );
      }
      // Brief pause so the user sees the success, then close + refresh
      setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, data.refund?.ok ? 1500 : 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setSubmitting(false);
    }
  }

  const triggerClasses =
    variant === "link"
      ? "text-xs font-medium text-red-600 hover:underline"
      : size === "sm"
        ? "rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
        : "rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50";

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
        Cancel booking
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
              Cancel booking {bookingRef}?
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              This frees the room for other trekkers. If you paid online, we&apos;ll
              automatically issue a refund to your original payment method.
              Stripe refunds arrive in 5–10 days; eSewa / Khalti refunds may take 3–7
              business days.
            </p>

            <label className="mt-4 block text-sm font-medium text-stone-700">
              Confirm your email
              <input
                type="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder="you@example.com"
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              />
            </label>

            {error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {success}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                Keep booking
              </button>
              <button
                type="submit"
                disabled={submitting || !email}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? "Cancelling…" : "Yes, cancel"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
