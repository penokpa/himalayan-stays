import { useEffect, useState, useCallback } from "react";
import { getDailySales, settleTab, type DailySalesResult } from "@/lib/tabs";

type SettleMethod = "CASH" | "ESEWA" | "KHALTI" | "INCLUDED_IN_BOOKING";

export default function DailySales() {
  const [sales, setSales] = useState<DailySalesResult | null>(null);
  const [settlingTabId, setSettlingTabId] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    const data = await getDailySales(today);
    setSales(data);
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSettle = async (tabId: string, method: SettleMethod) => {
    await settleTab(tabId, method);
    setSettlingTabId(null);
    await load();
  };

  if (!sales) {
    return (
      <div className="text-center pt-20 text-white/40">Loading sales...</div>
    );
  }

  const breakdown: {
    label: string;
    value: number;
    icon: string;
    color: string;
  }[] = [
    { label: "Food", value: sales.food, icon: "\uD83C\uDF5B", color: "text-orange-400" },
    { label: "Drinks", value: sales.drink, icon: "\u2615", color: "text-yellow-400" },
    { label: "Services", value: sales.service, icon: "\uD83D\uDECE\uFE0F", color: "text-blue-400" },
    { label: "Supplies", value: sales.supply, icon: "\uD83D\uDCE6", color: "text-green-400" },
  ];

  const payments: {
    label: string;
    value: number;
    icon: string;
    color: string;
    sub: string;
  }[] = [
    { label: "Cash", value: sales.cash_total, icon: "\uD83D\uDCB5", color: "text-green-400", sub: "Cash-settled tabs" },
    { label: "Digital", value: sales.digital_total, icon: "\uD83D\uDCF1", color: "text-blue-400", sub: "eSewa / Khalti" },
    { label: "Room Tab", value: sales.room_tab_total, icon: "\uD83C\uDFE8", color: "text-purple-400", sub: "Included in booking" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <span>{"\uD83D\uDCC8"}</span> Sales &mdash; {today}
      </h2>

      {/* Total card */}
      <div className="bg-[var(--color-surface)] rounded-xl p-5 text-center border border-white/10">
        <p className="text-white/50 text-sm mb-1">Today&apos;s Revenue</p>
        <p className="text-4xl font-bold text-green-400">
          Rs. {sales.total.toLocaleString()}
        </p>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {breakdown.map((b) => (
          <div
            key={b.label}
            className="bg-[var(--color-surface)] rounded-xl p-4 border border-white/10"
          >
            <p className="text-2xl mb-1">{b.icon}</p>
            <p className="text-sm text-white/50">{b.label}</p>
            <p className={`text-xl font-bold ${b.color}`}>
              Rs. {b.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Tab counts */}
      <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-white/10 flex justify-around">
        <div className="text-center">
          <p className="text-2xl font-bold">{sales.tabs_opened}</p>
          <p className="text-sm text-white/50">Tabs Opened</p>
        </div>
        <div className="w-px bg-white/10" />
        <div className="text-center">
          <p className="text-2xl font-bold text-green-400">
            {sales.tabs_settled}
          </p>
          <p className="text-sm text-white/50">Tabs Settled</p>
        </div>
      </div>

      {/* Payment Breakdown */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="font-bold text-base">Collections by Method</h3>
        </div>
        <div className="divide-y divide-white/5">
          {payments.map((p) => (
            <div key={p.label} className="px-4 py-3 flex items-center gap-3">
              <span className="text-2xl shrink-0">{p.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{p.label}</p>
                <p className="text-xs text-white/40">{p.sub}</p>
              </div>
              <p className={`text-lg font-bold shrink-0 ${p.color}`}>
                Rs. {p.value.toLocaleString()}
              </p>
            </div>
          ))}
          <div className="px-4 py-3 flex items-center justify-between bg-white/5">
            <span className="text-sm font-medium text-white/60">
              Total Collected
            </span>
            <span className="font-bold text-green-400">
              Rs.{" "}
              {(
                sales.cash_total +
                sales.digital_total +
                sales.room_tab_total
              ).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Open Folios */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="font-bold text-base flex items-center gap-2">
            <span>{"\uD83D\uDCC2"}</span> Open Folios
          </h3>
          <p className="text-xs text-white/40 mt-0.5">
            Tap to settle outstanding tabs
          </p>
        </div>
        {sales.open_tabs.length === 0 ? (
          <div className="px-4 py-4 text-center text-white/30 text-sm">
            All tabs settled for today
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {sales.open_tabs.map((tab) => (
              <div key={tab.id}>
                <button
                  onClick={() =>
                    setSettlingTabId(
                      settlingTabId === tab.id ? null : tab.id
                    )
                  }
                  className="w-full px-4 py-3 flex items-center gap-3 active:bg-white/5 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center text-lg shrink-0">
                    {tab.room_id ? "\uD83C\uDFE8" : "\uD83D\uDC64"}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-sm truncate">
                      {tab.guest_name}
                    </p>
                    <p className="text-xs text-white/40">
                      {tab.room_id ?? "Walk-in"}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-yellow-400 shrink-0">
                    Rs. {tab.outstanding.toLocaleString()}
                  </p>
                  <span
                    className={`text-white/30 text-sm transition-transform ${
                      settlingTabId === tab.id ? "rotate-90" : ""
                    }`}
                  >
                    {"\u25B6"}
                  </span>
                </button>

                {/* Settle actions */}
                {settlingTabId === tab.id && (
                  <div className="px-4 pb-3 pt-1">
                    <p className="text-xs text-white/40 mb-2">Settle with:</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleSettle(tab.id, "CASH")}
                        className="min-h-[48px] rounded-lg bg-green-600 text-white font-bold text-xs flex flex-col items-center justify-center active:scale-95 transition-transform"
                      >
                        <span className="text-lg">{"\uD83D\uDCB5"}</span>
                        Cash
                      </button>
                      <button
                        onClick={() => handleSettle(tab.id, "ESEWA")}
                        className="min-h-[48px] rounded-lg bg-green-500 text-white font-bold text-xs flex flex-col items-center justify-center active:scale-95 transition-transform"
                      >
                        <span className="text-lg">{"\uD83D\uDCF1"}</span>
                        eSewa
                      </button>
                      <button
                        onClick={() => handleSettle(tab.id, "INCLUDED_IN_BOOKING")}
                        className="min-h-[48px] rounded-lg bg-blue-600 text-white font-bold text-xs flex flex-col items-center justify-center active:scale-95 transition-transform"
                      >
                        <span className="text-lg">{"\uD83C\uDFE8"}</span>
                        Room Tab
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="px-4 py-3 flex items-center justify-between bg-white/5">
              <span className="text-sm font-medium text-white/60">
                Total Outstanding
              </span>
              <span className="font-bold text-yellow-400">
                Rs.{" "}
                {sales.open_tabs
                  .reduce((sum, t) => sum + t.outstanding, 0)
                  .toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
