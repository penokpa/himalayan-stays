"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MarkRefundCompleteButton({
  bookingRef,
  refundId,
}: {
  bookingRef: string;
  refundId: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function click() {
    if (submitting) return;
    const txnId = window.prompt(
      "Provider refund ID (optional — paste from eSewa/Khalti dashboard):",
      ""
    );
    if (txnId === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingRef}/refund`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          refundId,
          providerRefundId: txnId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={click}
        disabled={submitting}
        className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Mark complete"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
