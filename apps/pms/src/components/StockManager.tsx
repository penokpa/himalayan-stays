import { useEffect, useState, useCallback } from "react";
import type { MenuCategoryLocal, MenuItemLocal } from "@himalayan-stays/shared";
import { getMenu, updateMenuItemStock } from "@/lib/menu";

interface StockItem {
  categoryId: string;
  categoryName: string;
  item: MenuItemLocal;
}

export default function StockManager({ onBack }: { onBack: () => void }) {
  const [allItems, setAllItems] = useState<StockItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState("");
  const [editThreshold, setEditThreshold] = useState("");
  const [filter, setFilter] = useState<"all" | "tracked" | "low">("all");

  const load = useCallback(async () => {
    const menu = await getMenu();
    if (!menu) return;
    const items: StockItem[] = [];
    for (const cat of menu.categories) {
      for (const item of cat.items) {
        if (item.item_type === "SUPPLY" || item.track_stock) {
          items.push({ categoryId: cat.id, categoryName: cat.name, item });
        }
      }
    }
    setAllItems(items);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = allItems.filter((si) => {
    if (filter === "tracked") return si.item.track_stock;
    if (filter === "low")
      return (
        si.item.track_stock &&
        si.item.current_stock != null &&
        si.item.low_stock_threshold != null &&
        si.item.current_stock <= si.item.low_stock_threshold
      );
    return true;
  });

  const handleEdit = (si: StockItem) => {
    setEditingId(si.item.id);
    setEditStock(si.item.current_stock?.toString() ?? "0");
    setEditThreshold(si.item.low_stock_threshold?.toString() ?? "5");
  };

  const handleSave = async (si: StockItem) => {
    const stock = parseInt(editStock) || 0;
    const threshold = parseInt(editThreshold) || 5;
    await updateMenuItemStock(si.categoryId, si.item.id, {
      track_stock: true,
      current_stock: stock,
      low_stock_threshold: threshold,
    });
    setEditingId(null);
    await load();
  };

  const handleQuickAdjust = async (si: StockItem, delta: number) => {
    const current = si.item.current_stock ?? 0;
    const newStock = Math.max(0, current + delta);
    await updateMenuItemStock(si.categoryId, si.item.id, {
      current_stock: newStock,
    });
    await load();
  };

  const handleToggleTracking = async (si: StockItem) => {
    if (si.item.track_stock) {
      await updateMenuItemStock(si.categoryId, si.item.id, {
        track_stock: false,
      });
    } else {
      await updateMenuItemStock(si.categoryId, si.item.id, {
        track_stock: true,
        current_stock: si.item.current_stock ?? 0,
        low_stock_threshold: si.item.low_stock_threshold ?? 5,
      });
    }
    await load();
  };

  const lowCount = allItems.filter(
    (si) =>
      si.item.track_stock &&
      si.item.current_stock != null &&
      si.item.low_stock_threshold != null &&
      si.item.current_stock <= si.item.low_stock_threshold
  ).length;

  const stockLevel = (item: MenuItemLocal) => {
    if (!item.track_stock || item.current_stock == null) return "untracked";
    if (item.current_stock === 0) return "out";
    if (
      item.low_stock_threshold != null &&
      item.current_stock <= item.low_stock_threshold
    )
      return "low";
    return "ok";
  };

  const stockColor = (level: string) => {
    switch (level) {
      case "out":
        return "text-red-400";
      case "low":
        return "text-yellow-400";
      case "ok":
        return "text-green-400";
      default:
        return "text-white/30";
    }
  };

  const stockBg = (level: string) => {
    switch (level) {
      case "out":
        return "border-red-500/30 bg-red-500/5";
      case "low":
        return "border-yellow-500/30 bg-yellow-500/5";
      default:
        return "border-white/10";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onBack}
          className="min-w-[48px] min-h-[48px] rounded-lg bg-white/10 flex items-center justify-center text-xl"
        >
          {"\u2190"}
        </button>
        <h2 className="text-lg font-bold flex-1">Stock Management</h2>
        {lowCount > 0 && (
          <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2.5 py-1 rounded-full">
            {lowCount} low
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(
          [
            { key: "all", label: "All Items" },
            { key: "tracked", label: "Tracked" },
            { key: "low", label: "Low Stock" },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 min-h-[44px] rounded-lg text-sm font-medium ${
              filter === f.key
                ? "bg-[var(--color-primary)] text-white"
                : "bg-white/10 text-white/50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Items */}
      {filtered.length === 0 && (
        <div className="text-center pt-8 text-white/30">
          <p className="text-3xl mb-2">{"\uD83D\uDCE6"}</p>
          <p className="text-sm">
            {filter === "low"
              ? "No low stock items"
              : filter === "tracked"
                ? "No tracked items"
                : "No supply items in menu"}
          </p>
        </div>
      )}

      {filtered.map((si) => {
        const level = stockLevel(si.item);
        const isEditing = editingId === si.item.id;

        return (
          <div
            key={si.item.id}
            className={`bg-[var(--color-surface)] rounded-xl border overflow-hidden ${stockBg(level)}`}
          >
            <div className="px-4 py-3 flex items-center gap-3">
              {/* Item info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{si.item.name}</p>
                <p className="text-xs text-white/40">
                  {si.categoryName} &middot; Rs. {si.item.price_npr}/{si.item.unit}
                </p>
              </div>

              {/* Stock display */}
              {si.item.track_stock ? (
                <div className="flex items-center gap-2 shrink-0">
                  {/* Quick -/+ buttons */}
                  <button
                    onClick={() => handleQuickAdjust(si, -1)}
                    className="w-[40px] h-[40px] rounded-lg bg-white/10 flex items-center justify-center text-lg font-bold text-white/70 active:bg-red-500/30"
                  >
                    -
                  </button>
                  <button
                    onClick={() => handleEdit(si)}
                    className="min-w-[48px] text-center"
                  >
                    <p className={`text-lg font-bold ${stockColor(level)}`}>
                      {si.item.current_stock ?? 0}
                    </p>
                    <p className="text-[10px] text-white/30">
                      {level === "out"
                        ? "OUT"
                        : level === "low"
                          ? "LOW"
                          : "in stock"}
                    </p>
                  </button>
                  <button
                    onClick={() => handleQuickAdjust(si, 1)}
                    className="w-[40px] h-[40px] rounded-lg bg-white/10 flex items-center justify-center text-lg font-bold text-white/70 active:bg-green-500/30"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleToggleTracking(si)}
                  className="min-h-[36px] px-3 rounded-lg bg-white/10 text-xs text-white/40 font-medium"
                >
                  Enable Tracking
                </button>
              )}
            </div>

            {/* Edit panel */}
            {isEditing && (
              <div className="px-4 pb-3 pt-1 border-t border-white/5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/40 block mb-1">
                      Current Stock
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editStock}
                      onChange={(e) => setEditStock(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 block mb-1">
                      Low Alert At
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editThreshold}
                      onChange={(e) => setEditThreshold(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(si)}
                    className="flex-1 min-h-[44px] rounded-lg bg-green-600 text-white font-bold text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => handleToggleTracking(si)}
                    className="min-h-[44px] px-3 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium"
                  >
                    Disable Tracking
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="min-h-[44px] px-3 rounded-lg bg-white/10 text-white/60 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Restock hint */}
      <p className="text-center text-xs text-white/20 mt-4">
        Tap stock number to edit &middot; Use +/- for quick adjustments
      </p>
    </div>
  );
}
