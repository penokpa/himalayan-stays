import { useMemo, useState } from "react";
import { settleTab, holdTab, getTab } from "@/lib/tabs";
import type {
  TabDoc,
  SettleMethod,
  TabPayment,
} from "@himalayan-stays/shared";
import Receipt from "./Receipt";

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
    icon: "🏨",
    color: "bg-blue-600",
  },
  { value: "ESEWA", label: "eSewa", icon: "📱", color: "bg-green-500" },
  { value: "CASH", label: "Cash NPR", icon: "💵", color: "bg-green-600" },
  { value: "HOLD", label: "Hold", icon: "⏸️", color: "bg-yellow-600" },
];

const SPLIT_METHODS: { method: SettleMethod; label: string; icon: string }[] = [
  { method: "CASH", label: "Cash NPR", icon: "💵" },
  { method: "ESEWA", label: "eSewa", icon: "📱" },
  { method: "KHALTI", label: "Khalti", icon: "📱" },
  { method: "INCLUDED_IN_BOOKING", label: "Room Tab", icon: "🏨" },
];

const METHOD_LABEL: Record<SettleMethod, string> = {
  CASH: "Cash",
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  INCLUDED_IN_BOOKING: "Room Tab",
};

type Mode = "quick" | "split";

export default function SettleModal({
  total,
  subtotal,
  serviceCharge,
  guestName,
  tabId,
  onSettled,
  onClose,
}: Props) {
  const [mode, setMode] = useState<Mode>("quick");
  const [settled, setSettled] = useState<{ payments: TabPayment[] } | "HOLD" | null>(
    null
  );
  const [showReceipt, setShowReceipt] = useState(false);
  const [tabSnapshot, setTabSnapshot] = useState<TabDoc | null>(null);

  const handleQuick = async (method: SettleMethod | "HOLD") => {
    if (method === "HOLD") {
      await holdTab(tabId);
      setSettled("HOLD");
    } else {
      const payments: TabPayment[] = [{ method, amount_npr: total }];
      await settleTab(tabId, payments);
      setSettled({ payments });
    }
    const fresh = await getTab(tabId);
    setTabSnapshot(fresh);
  };

  const handleSplit = async (payments: TabPayment[]) => {
    await settleTab(tabId, payments);
    setSettled({ payments });
    const fresh = await getTab(tabId);
    setTabSnapshot(fresh);
  };

  if (settled) {
    const isHold = settled === "HOLD";
    const payments = isHold ? [] : settled.payments;
    return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
        <div className="bg-[var(--color-surface)] w-full sm:max-w-sm rounded-2xl p-8 text-center">
          <p className="text-5xl mb-4">{isHold ? "⏸️" : "✅"}</p>
          <p className="text-xl font-bold mb-1">
            {isHold ? "Tab On Hold" : "Tab Settled"}
          </p>
          <p className="text-white/60 mb-2">{guestName}</p>
          <p className="text-2xl font-bold text-green-400">
            Rs. {total.toLocaleString()}
          </p>
          {!isHold && payments.length === 1 && (
            <p className="text-sm text-white/50 mt-1">
              via {METHOD_LABEL[payments[0].method]}
            </p>
          )}
          {!isHold && payments.length > 1 && (
            <div className="text-sm text-white/60 mt-2 space-y-0.5">
              {payments.map((p, i) => (
                <p key={i}>
                  {METHOD_LABEL[p.method]}: Rs. {p.amount_npr.toLocaleString()}
                </p>
              ))}
            </div>
          )}
          {!isHold && tabSnapshot && (
            <button
              onClick={() => setShowReceipt(true)}
              className="mt-4 w-full min-h-[48px] rounded-lg bg-white/10 text-white font-medium text-base"
            >
              🧾 Print receipt
            </button>
          )}
          <button
            onClick={onSettled}
            className="mt-3 w-full min-h-[48px] rounded-lg bg-[var(--color-primary)] text-white font-bold text-lg"
          >
            Done
          </button>
        </div>
        {showReceipt && tabSnapshot && (
          <Receipt tab={tabSnapshot} onClose={() => setShowReceipt(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center">
      <div className="bg-[var(--color-surface)] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6">
        {mode === "quick" ? (
          <>
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

            <div className="grid grid-cols-2 gap-3 mb-3">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => handleQuick(m.value)}
                  className={`${m.color} min-h-[64px] rounded-xl flex flex-col items-center justify-center text-white font-bold text-lg active:scale-95 transition-transform`}
                >
                  <span className="text-2xl mb-1">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setMode("split")}
              className="w-full min-h-[48px] rounded-lg bg-white/10 text-white font-medium mb-3 active:bg-white/15"
            >
              Split payment
            </button>

            <button
              onClick={onClose}
              className="w-full min-h-[48px] rounded-lg border border-white/20 text-white/60 font-medium"
            >
              Cancel
            </button>
          </>
        ) : (
          <SplitView
            total={total}
            onBack={() => setMode("quick")}
            onSubmit={handleSplit}
          />
        )}
      </div>
    </div>
  );
}

function SplitView({
  total,
  onBack,
  onSubmit,
}: {
  total: number;
  onBack: () => void;
  onSubmit: (payments: TabPayment[]) => void;
}) {
  const [amounts, setAmounts] = useState<Record<SettleMethod, string>>({
    CASH: "",
    ESEWA: "",
    KHALTI: "",
    INCLUDED_IN_BOOKING: "",
  });

  const numericAmounts = useMemo(() => {
    const result: Record<SettleMethod, number> = {
      CASH: 0,
      ESEWA: 0,
      KHALTI: 0,
      INCLUDED_IN_BOOKING: 0,
    };
    for (const m of SPLIT_METHODS) {
      const n = parseInt(amounts[m.method], 10);
      result[m.method] = isNaN(n) || n < 0 ? 0 : n;
    }
    return result;
  }, [amounts]);

  const collected = SPLIT_METHODS.reduce(
    (sum, m) => sum + numericAmounts[m.method],
    0
  );
  const remaining = total - collected;
  const canSettle = remaining === 0 && collected === total;

  const fillRemaining = (method: SettleMethod) => {
    if (remaining <= 0) return;
    const current = numericAmounts[method];
    setAmounts({ ...amounts, [method]: String(current + remaining) });
  };

  const submit = () => {
    if (!canSettle) return;
    const payments: TabPayment[] = SPLIT_METHODS.filter(
      (m) => numericAmounts[m.method] > 0
    ).map((m) => ({ method: m.method, amount_npr: numericAmounts[m.method] }));
    onSubmit(payments);
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="min-w-[40px] min-h-[40px] rounded-lg bg-white/10 text-white/70 text-lg"
          aria-label="Back"
        >
          {"←"}
        </button>
        <h2 className="text-xl font-bold flex-1">Split Payment</h2>
      </div>

      <div className="flex justify-between text-base font-bold pb-3 mb-3 border-b border-white/10">
        <span>Total</span>
        <span className="text-green-400">Rs. {total.toLocaleString()}</span>
      </div>

      <div className="space-y-2 mb-3">
        {SPLIT_METHODS.map((m) => (
          <div key={m.method} className="flex items-center gap-2">
            <span className="text-xl shrink-0 w-8 text-center">{m.icon}</span>
            <span className="flex-1 text-sm font-medium">{m.label}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-white/40">Rs.</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={amounts[m.method]}
                onChange={(e) =>
                  setAmounts({
                    ...amounts,
                    [m.method]: e.target.value.replace(/[^0-9]/g, ""),
                  })
                }
                placeholder="0"
                className="w-24 min-h-[44px] px-3 rounded-lg bg-white/10 text-[var(--color-text)] placeholder-white/30 border border-white/10 focus:border-[var(--color-primary)] outline-none text-right font-medium"
              />
              <button
                onClick={() => fillRemaining(m.method)}
                disabled={remaining <= 0}
                className="min-w-[44px] min-h-[44px] rounded-lg bg-white/5 text-white/60 text-xs font-medium disabled:opacity-30 active:bg-white/10"
                title="Fill remaining"
              >
                {"＋"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div
        className={`flex justify-between text-sm font-medium py-2 px-3 rounded-lg mb-4 ${
          remaining === 0
            ? "bg-green-500/10 text-green-300"
            : remaining > 0
              ? "bg-yellow-500/10 text-yellow-300"
              : "bg-red-500/10 text-red-300"
        }`}
      >
        <span>{remaining < 0 ? "Over by" : "Remaining"}</span>
        <span>Rs. {Math.abs(remaining).toLocaleString()}</span>
      </div>

      <button
        onClick={submit}
        disabled={!canSettle}
        className="w-full min-h-[56px] rounded-xl bg-[var(--color-primary)] text-white font-bold text-lg disabled:opacity-40 active:scale-[0.98] transition-transform mb-2"
      >
        Settle Rs. {total.toLocaleString()}
      </button>
      <button
        onClick={onBack}
        className="w-full min-h-[48px] rounded-lg border border-white/20 text-white/60 font-medium"
      >
        Cancel
      </button>
    </>
  );
}
