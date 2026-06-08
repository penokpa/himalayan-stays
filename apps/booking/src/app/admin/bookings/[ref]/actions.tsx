"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BUTTON_LABELS: Record<string, { label: string; tone: "primary" | "danger" | "warning" | "neutral" }> = {
  CONFIRMED: { label: "Confirm booking", tone: "primary" },
  CHECKED_IN: { label: "Mark checked in", tone: "primary" },
  COMPLETED: { label: "Mark stay completed", tone: "neutral" },
  CANCELLED: { label: "Cancel booking", tone: "danger" },
  NO_SHOW: { label: "Mark no-show", tone: "warning" },
};

const TONE_CLASSES: Record<string, string> = {
  primary: "bg-emerald-600 text-white hover:bg-emerald-700",
  neutral: "bg-gray-600 text-white hover:bg-gray-700",
  warning: "bg-amber-600 text-white hover:bg-amber-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export function StatusActions({
  bookingRef,
  allowedTransitions,
}: {
  bookingRef: string;
  allowedTransitions: string[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (allowedTransitions.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        This booking is in a terminal state. No further status changes possible.
      </p>
    );
  }

  async function transition(next: string) {
    const cfg = BUTTON_LABELS[next];
    if (cfg.tone === "danger" || cfg.tone === "warning") {
      if (!confirm(`${cfg.label}? This cannot be undone.`)) return;
    }
    setError(null);
    setLoading(next);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingRef}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {allowedTransitions.map((next) => {
          const cfg = BUTTON_LABELS[next];
          if (!cfg) return null;
          const isLoading = loading === next;
          return (
            <button
              key={next}
              type="button"
              onClick={() => transition(next)}
              disabled={loading !== null}
              className={`rounded-lg px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50 transition-colors ${TONE_CLASSES[cfg.tone]}`}
            >
              {isLoading ? "…" : cfg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MarkCashPaidButton({ bookingRef }: { bookingRef: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markPaid() {
    if (!confirm("Mark cash as collected? This records the payment as completed.")) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingRef}/mark-cash-paid`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={markPaid}
        disabled={loading}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Mark cash collected"}
      </button>
    </div>
  );
}
