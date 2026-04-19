import { useEffect, useState } from "react";
import type {
  MenuCategoryLocal,
  MenuItemLocal,
  TabDoc,
} from "@himalayan-stays/shared";
import { getMenu } from "@/lib/menu";
import {
  getTab,
  addItemToTab,
  voidTabItem,
  updateItemQuantity,
} from "@/lib/tabs";
import SettleModal from "./SettleModal";

interface Props {
  tabId: string;
  onClose: () => void;
  onSettled: () => void;
}

export default function TabDetail({ tabId, onClose, onSettled }: Props) {
  const [tab, setTab] = useState<TabDoc | null>(null);
  const [categories, setCategories] = useState<MenuCategoryLocal[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [showSettle, setShowSettle] = useState(false);
  const [voidingItem, setVoidingItem] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const load = async () => {
    const [t, m] = await Promise.all([getTab(tabId), getMenu()]);
    setTab(t);
    const cats = (m?.categories ?? []).filter((c) =>
      c.items.some((i) => i.is_active)
    );
    setCategories(cats);
    if (!activeCat && cats.length > 0) setActiveCat(cats[0].id);
  };

  useEffect(() => {
    load();
  }, [tabId]);

  if (!tab) return null;

  const activeCategory = categories.find((c) => c.id === activeCat);
  const activeItems = activeCategory?.items.filter((i) => i.is_active) ?? [];
  const visibleTabItems = tab.items.filter((i) => !i.voided);
  const subtotal = tab.tab_total_npr;
  const serviceCharge = Math.round(subtotal * 0.1);
  const total = subtotal + serviceCharge;

  const handleAddItem = async (menuItem: MenuItemLocal) => {
    await addItemToTab(tabId, menuItem, 1);
    await load();
  };

  const handleQuantityChange = async (itemId: string, newQty: number) => {
    await updateItemQuantity(tabId, itemId, newQty);
    await load();
  };

  const handleVoid = async (itemId: string) => {
    const reason = voidReason.trim() || "Voided";
    await voidTabItem(tabId, itemId, reason);
    setVoidingItem(null);
    setVoidReason("");
    await load();
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "FOOD":
        return "\uD83C\uDF5B";
      case "DRINK":
        return "\u2615";
      case "SERVICE":
        return "\uD83D\uDECE\uFE0F";
      case "SUPPLY":
        return "\uD83D\uDCE6";
      default:
        return "\uD83D\uDCCB";
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-[var(--color-bg)] flex flex-col">
      {/* Header */}
      <header className="bg-[var(--color-surface)] px-4 py-3 flex items-center gap-3 border-b border-white/10 shrink-0">
        <button
          onClick={onClose}
          className="min-w-[48px] min-h-[48px] rounded-lg bg-white/10 flex items-center justify-center text-xl"
        >
          {"\u2190"}
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base truncate">{tab.guest_name}</p>
          {tab.room_id && (
            <p className="text-sm text-white/50">{tab.room_id}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-white/50">Total</p>
          <p className="text-xl font-bold text-green-400">
            Rs. {total.toLocaleString()}
          </p>
        </div>
      </header>

      {/* Category tabs */}
      <div className="bg-[var(--color-surface)] border-b border-white/10 shrink-0">
        <div className="flex overflow-x-auto gap-2 px-3 py-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={`min-h-[44px] px-4 rounded-lg whitespace-nowrap font-medium text-sm shrink-0 ${
                activeCat === cat.id
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-white/10 text-white/50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Item grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeItems.length === 0 ? (
          <div className="text-center pt-8 text-white/30">
            <p>No active items in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {activeItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleAddItem(item)}
                className="bg-[var(--color-surface)] border border-white/10 rounded-xl p-3 min-h-[80px] flex flex-col items-center justify-center text-center active:scale-95 active:bg-[var(--color-primary)]/20 transition-all"
              >
                <span className="text-2xl mb-1">
                  {typeIcon(item.item_type)}
                </span>
                <span className="font-medium text-sm leading-tight">
                  {item.name}
                </span>
                <span className="text-xs text-white/50 mt-1">
                  Rs. {item.price_npr}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current order */}
      {visibleTabItems.length > 0 && (
        <div className="bg-[var(--color-surface)] border-t border-white/10 max-h-[35vh] overflow-y-auto shrink-0">
          <div className="px-4 py-2 border-b border-white/5">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wide">
              Order ({visibleTabItems.length} items)
            </p>
          </div>
          {visibleTabItems.map((item) => (
            <div key={item.id}>
              <div className="w-full px-4 py-2 flex items-center gap-2">
                {/* Quantity controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() =>
                      handleQuantityChange(item.id, item.quantity - 1)
                    }
                    className="w-[48px] h-[48px] rounded-lg bg-white/10 flex items-center justify-center text-lg font-bold text-white/70 active:bg-red-500/30"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-bold">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      handleQuantityChange(item.id, item.quantity + 1)
                    }
                    className="w-[48px] h-[48px] rounded-lg bg-white/10 flex items-center justify-center text-lg font-bold text-white/70 active:bg-green-500/30"
                  >
                    +
                  </button>
                </div>
                <span className="flex-1 text-sm font-medium truncate">
                  {item.item_name}
                </span>
                <span className="text-sm text-white/60 shrink-0">
                  Rs. {item.line_total_npr}
                </span>
                <button
                  onClick={() =>
                    setVoidingItem(voidingItem === item.id ? null : item.id)
                  }
                  className="w-[48px] h-[48px] rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 text-xs font-bold shrink-0 active:bg-red-500/30"
                >
                  {"\u2715"}
                </button>
              </div>
              {voidingItem === item.id && (
                <div className="px-4 pb-2 flex gap-2">
                  <input
                    autoFocus
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="flex-1 min-h-[40px] px-3 rounded-lg bg-white/10 text-sm text-[var(--color-text)] placeholder-white/30 border border-white/10 outline-none"
                  />
                  <button
                    onClick={() => handleVoid(item.id)}
                    className="min-h-[40px] px-3 rounded-lg bg-red-600 text-white text-sm font-bold"
                  >
                    Void
                  </button>
                </div>
              )}
            </div>
          ))}
          {/* Totals in order section */}
          <div className="px-4 py-2 border-t border-white/10 space-y-1">
            <div className="flex justify-between text-xs text-white/50">
              <span>Subtotal</span>
              <span>Rs. {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-white/50">
              <span>Service Charge (10%)</span>
              <span>Rs. {serviceCharge.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Settle button */}
      <div className="bg-[var(--color-surface)] border-t border-white/10 p-3 safe-area-pb shrink-0">
        <button
          onClick={() => setShowSettle(true)}
          disabled={tab.tab_total_npr === 0}
          className="w-full min-h-[56px] rounded-xl bg-green-600 text-white font-bold text-lg disabled:opacity-40 active:scale-[0.98] transition-transform"
        >
          Settle Tab &mdash; Rs. {total.toLocaleString()}
        </button>
      </div>

      {/* Settle modal */}
      {showSettle && (
        <SettleModal
          total={total}
          subtotal={subtotal}
          serviceCharge={serviceCharge}
          guestName={tab.guest_name}
          tabId={tab._id}
          onSettled={() => {
            setShowSettle(false);
            onSettled();
          }}
          onClose={() => setShowSettle(false)}
        />
      )}
    </div>
  );
}
