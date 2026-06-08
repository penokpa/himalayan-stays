import { useEffect, useState } from "react";
import type { TabDoc } from "@himalayan-stays/shared";
import { getSettings, type AppSettings } from "@/lib/settings";

interface Props {
  tab: TabDoc;
  onClose: () => void;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  INCLUDED_IN_BOOKING: "Charged to room",
};

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRef(tabId: string): string {
  // e.g. tab:default:room_3:2026-05-08 → R3-0508-...
  const parts = tabId.split(":");
  const room = parts[2] ?? "";
  const date = parts[3] ?? "";
  const shortDate = date.replaceAll("-", "").slice(2);
  const shortRoom = room.replace("room_", "R");
  return `${shortRoom}-${shortDate}`.toUpperCase();
}

export default function Receipt({ tab, onClose }: Props) {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const visibleItems = tab.items.filter((i) => !i.voided);
  const subtotal = tab.tab_total_npr;
  const servicePct = settings?.service_charge_pct ?? 10;
  const serviceCharge = Math.round((subtotal * servicePct) / 100);
  const taxPct = settings?.tax_pct ?? 0;
  const tax = Math.round(((subtotal + serviceCharge) * taxPct) / 100);
  const total = subtotal + serviceCharge + tax;

  return (
    <div className="receipt-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .receipt-print, .receipt-print * { visibility: visible; }
          .receipt-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 80mm !important; box-shadow: none !important; }
          .no-print { display: none !important; }
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <div className="receipt-print my-6 w-[320px] rounded-lg bg-white p-5 font-mono text-[12px] leading-snug text-black shadow-2xl">
        {/* Lodge header */}
        <div className="text-center">
          <p className="text-[16px] font-bold uppercase tracking-wide">
            {settings?.lodge_name ?? "Lodge"}
          </p>
          {(settings?.lodge_village || settings?.lodge_district) && (
            <p className="text-[11px]">
              {[settings?.lodge_village, settings?.lodge_district]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
          <div className="my-2 border-t border-dashed border-black" />
        </div>

        {/* Meta */}
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span>Receipt #</span>
            <span className="font-bold">{formatRef(tab._id)}</span>
          </div>
          <div className="flex justify-between">
            <span>Guest</span>
            <span className="font-bold">{tab.guest_name}</span>
          </div>
          {tab.room_id && (
            <div className="flex justify-between">
              <span>Room</span>
              <span>{tab.room_id}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Opened</span>
            <span>{formatDateTime(tab.opened_at)}</span>
          </div>
          {tab.closed_at && (
            <div className="flex justify-between">
              <span>Settled</span>
              <span>{formatDateTime(tab.closed_at)}</span>
            </div>
          )}
        </div>

        <div className="my-2 border-t border-dashed border-black" />

        {/* Items */}
        {visibleItems.length === 0 ? (
          <p className="text-center italic">No items</p>
        ) : (
          <div className="space-y-1">
            {visibleItems.map((item) => (
              <div key={item.id}>
                <div className="flex justify-between">
                  <span className="truncate">
                    {item.quantity} × {item.item_name}
                  </span>
                  <span className="ml-2 shrink-0 font-bold">
                    Rs. {item.line_total_npr.toLocaleString()}
                  </span>
                </div>
                <div className="text-[10px] text-stone-500">
                  @ Rs. {item.unit_price_npr.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="my-2 border-t border-dashed border-black" />

        {/* Totals */}
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>Rs. {subtotal.toLocaleString()}</span>
          </div>
          {serviceCharge > 0 && (
            <div className="flex justify-between">
              <span>Service ({servicePct}%)</span>
              <span>Rs. {serviceCharge.toLocaleString()}</span>
            </div>
          )}
          {tax > 0 && (
            <div className="flex justify-between">
              <span>Tax ({taxPct}%)</span>
              <span>Rs. {tax.toLocaleString()}</span>
            </div>
          )}
          <div className="my-1 border-t border-dashed border-black" />
          <div className="flex justify-between text-[14px] font-bold">
            <span>TOTAL</span>
            <span>Rs. {total.toLocaleString()}</span>
          </div>
        </div>

        {/* Settlement */}
        {tab.payments && tab.payments.length > 0 && (
          <>
            <div className="my-2 border-t border-dashed border-black" />
            {tab.payments.length === 1 ? (
              <p className="text-center">
                Paid via{" "}
                <span className="font-bold">
                  {METHOD_LABELS[tab.payments[0].method] ?? tab.payments[0].method}
                </span>
              </p>
            ) : (
              <>
                <p className="text-center font-bold mb-1">Split payment</p>
                {tab.payments.map((p, i) => (
                  <div key={i} className="flex justify-between">
                    <span>
                      {METHOD_LABELS[p.method] ?? p.method}
                    </span>
                    <span>Rs. {p.amount_npr.toLocaleString()}</span>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        <div className="my-2 border-t border-dashed border-black" />

        <p className="text-center text-[11px]">
          {settings?.receipt_footer ?? "Thank you!"}
        </p>
      </div>

      {/* Action buttons (hidden when printing) */}
      <div className="no-print fixed bottom-0 left-0 right-0 flex gap-3 bg-[var(--color-surface)] p-4 safe-area-pb">
        <button
          onClick={onClose}
          className="min-h-14 flex-1 rounded-lg bg-white/10 text-base font-medium text-white/70"
        >
          Close
        </button>
        <button
          onClick={() => window.print()}
          className="min-h-14 flex-1 rounded-lg bg-green-600 text-base font-bold text-white"
        >
          Print / Save PDF
        </button>
      </div>
    </div>
  );
}
