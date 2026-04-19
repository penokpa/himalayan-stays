import { useState } from "react";
import { settleTab, holdTab } from "@/lib/tabs";

type SettleMethod = "CASH" | "ESEWA" | "INCLUDED_IN_BOOKING";

interface Props {
  total: number;
  subtotal: number;
  serviceCharge: number;
  guestName: string;
  tabId: string;
  onSettled: () => void;
  onClose: () => void;
}

const METHODS: {
  value: SettleMethod | "HOLD";
  label: string;
  icon: string;
  color: string;
}[] = [
  {
    value: "INCLUDED_IN_BOOKING",
    label: "Room Tab",
    icon: "\uD83C\uDFE8",
    color: "bg-blue-600",
  },
  { value: "ESEWA", label: "eSewa", icon: "\uD83D\uDCF1", color: "bg-green-500" },
  { value: "CASH", label: "Cash NPR", icon: "\uD83D\uDCB5", color: "bg-green-600" },
  { value: "HOLD", label: "Hold", icon: "\u23F8\uFE0F", color: "bg-yellow-600" },
];

export default function SettleModal({
  total,
  subtotal,
  serviceCharge,
  guestName,
  tabId,
  onSettled,
  onClose,
}: Props) {
  const [settled, setSettled] = useState<string | null>(null);

  const handleMethod = async (method: SettleMethod | "HOLD") => {
    if (method === "HOLD") {
      await holdTab(tabId);
      setSettled("HOLD");
    } else {
      await settleTab(tabId, method);
      setSettled(method);
    }
  };

  if (settled) {
    const isHold = settled === "HOLD";
    return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
        <div className="bg-[var(--color-surface)] w-full sm:max-w-sm rounded-2xl p-8 text-center">
          <p className="text-5xl mb-4">{isHold ? "\u23F8\uFE0F" : "\u2705"}</p>
          <p className="text-xl font-bold mb-1">
            {isHold ? "Tab On Hold" : "Tab Settled"}
          </p>
          <p className="text-white/60 mb-2">{guestName}</p>
          <p className="text-2xl font-bold text-green-400">
            Rs. {total.toLocaleString()}
          </p>
          {!isHold && (
            <p className="text-sm text-white/50 mt-1">
              via{" "}
              {settled === "CASH"
                ? "Cash"
                : settled === "ESEWA"
                  ? "eSewa"
                  : "Room Tab"}
            </p>
          )}
          <button
            onClick={onSettled}
            className="mt-6 w-full min-h-[48px] rounded-lg bg-[var(--color-primary)] text-white font-bold text-lg"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center">
      <div className="bg-[var(--color-surface)] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-1">Settle Tab</h2>
        <p className="text-white/60 mb-4">{guestName}</p>

        <div className="space-y-1 mb-4">
          <div className="flex justify-between text-sm text-white/60">
            <span>Subtotal</span>
            <span>Rs. {subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm text-white/60">
            <span>Service Charge (10%)</span>
            <span>Rs. {serviceCharge.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xl font-bold pt-2 border-t border-white/10">
            <span>Total</span>
            <span className="text-green-400">Rs. {total.toLocaleString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {METHODS.map((m) => (
            <button
              key={m.value}
              onClick={() => handleMethod(m.value)}
              className={`${m.color} min-h-[64px] rounded-xl flex flex-col items-center justify-center text-white font-bold text-lg active:scale-95 transition-transform`}
            >
              <span className="text-2xl mb-1">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full min-h-[48px] rounded-lg border border-white/20 text-white/60 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
