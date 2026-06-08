"use client";

import { useState } from "react";

interface Props {
  bookingRef: string;
  totalNpr: number;
  totalUsd: number | null;
}

const METHODS: {
  id: string;
  label: string;
  description: string;
  icon: string;
  currency: string | null;
  disabled?: boolean;
}[] = [
  {
    id: "STRIPE",
    label: "Credit / Debit Card",
    description: "Pay securely with Visa, Mastercard, or other cards via Stripe",
    icon: "💳",
    currency: "USD",
  },
  {
    id: "ESEWA",
    label: "eSewa",
    description: "Pay with your eSewa digital wallet",
    icon: "📱",
    currency: "NPR",
  },
  {
    id: "KHALTI",
    label: "Khalti",
    description: "Coming soon — merchant account pending",
    icon: "📲",
    currency: "NPR",
    disabled: true,
  },
  {
    id: "CASH",
    label: "Pay at Lodge",
    description: "No advance payment — pay directly at the lodge upon arrival",
    icon: "🏠",
    currency: null,
  },
];

export default function PaymentMethodSelector({
  bookingRef,
  totalNpr,
  totalUsd,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    if (!selected) return;
    setError(null);
    setProcessing(true);

    if (selected === "CASH") {
      try {
        const res = await fetch(`/api/bookings/${bookingRef}/confirm-cash`, {
          method: "POST",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to confirm booking");
        }
        window.location.href = `/booking/${bookingRef}/confirmation?payment=cash`;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to confirm");
        setProcessing(false);
      }
      return;
    }

    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingRef, method: selected }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Payment initiation failed");
      }

      const data = await res.json();
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setProcessing(false);
    }
  }

  const selectedMethod = METHODS.find((m) => m.id === selected);
  const displayAmount =
    selected === "STRIPE" && totalUsd
      ? `USD ${totalUsd.toLocaleString()}`
      : `NPR ${totalNpr.toLocaleString()}`;

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {METHODS.map((method) => (
          <button
            key={method.id}
            type="button"
            onClick={() => !method.disabled && setSelected(method.id)}
            disabled={processing || method.disabled}
            className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition ${
              selected === method.id
                ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                : "border-stone-200 bg-white hover:border-emerald-300"
            } ${processing || method.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span className="text-2xl">{method.icon}</span>
            <div className="flex-1">
              <div className="font-medium text-stone-900">{method.label}</div>
              <div className="mt-0.5 text-xs text-stone-500">
                {method.description}
              </div>
            </div>
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                selected === method.id
                  ? "border-emerald-600 bg-emerald-600"
                  : "border-stone-300"
              }`}
            >
              {selected === method.id && (
                <div className="h-2 w-2 rounded-full bg-white" />
              )}
            </div>
          </button>
        ))}
      </div>

      {selected && selected !== "CASH" && (
        <div className="rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-600">
          You will be redirected to{" "}
          <span className="font-medium">{selectedMethod?.label}</span> to
          complete payment of{" "}
          <span className="font-semibold text-stone-900">{displayAmount}</span>.
        </div>
      )}

      {selected === "CASH" && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          No advance payment required. Pay directly at the lodge upon arrival.
          Your booking will be held as a reservation.
        </div>
      )}

      <button
        type="button"
        disabled={!selected || processing}
        onClick={handlePay}
        className="w-full rounded-lg bg-emerald-700 px-6 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {processing
          ? "Processing..."
          : selected === "CASH"
            ? "Confirm Booking"
            : selected
              ? `Pay ${displayAmount}`
              : "Select a payment method"}
      </button>
    </div>
  );
}
