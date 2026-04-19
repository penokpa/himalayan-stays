import { useEffect, useState } from "react";
import type { MenuCategoryLocal, MenuItemLocal } from "@himalayan-stays/shared";
import { getMenu, addCategory, addMenuItem, toggleMenuItem } from "@/lib/menu";

type ItemType = MenuItemLocal["item_type"];

const UNITS = ["plate", "cup", "glass", "bottle", "piece", "hour", "pack"];
const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: "FOOD", label: "Food" },
  { value: "DRINK", label: "Drink" },
  { value: "SERVICE", label: "Service" },
  { value: "SUPPLY", label: "Supply" },
];

export default function MenuSetup({ onBack }: { onBack: () => void }) {
  const [categories, setCategories] = useState<MenuCategoryLocal[]>([]);
  const [showAddCat, setShowAddCat] = useState(false);
  const [catName, setCatName] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);

  // New item form
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemUnit, setItemUnit] = useState("plate");
  const [itemType, setItemType] = useState<ItemType>("FOOD");

  const load = () => getMenu().then((m) => setCategories(m?.categories ?? []));
  useEffect(() => { load(); }, []);

  const handleAddCategory = async () => {
    const name = catName.trim();
    if (!name) return;
    await addCategory(name);
    setCatName("");
    setShowAddCat(false);
    await load();
  };

  const handleAddItem = async (categoryId: string) => {
    const name = itemName.trim();
    const price = Number(itemPrice);
    if (!name || !price) return;
    await addMenuItem(categoryId, {
      name,
      price_npr: price,
      unit: itemUnit,
      item_type: itemType,
      track_stock: false,
      is_active: true,
    });
    setItemName("");
    setItemPrice("");
    setItemUnit("plate");
    setItemType("FOOD");
    setAddingTo(null);
    await load();
  };

  const handleToggle = async (catId: string, itemId: string) => {
    await toggleMenuItem(catId, itemId);
    await load();
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
        <h2 className="text-lg font-bold flex-1">Menu Setup</h2>
        <button
          onClick={() => setShowAddCat(true)}
          className="min-h-[48px] px-4 rounded-lg bg-[var(--color-primary)] text-white font-bold"
        >
          + Category
        </button>
      </div>

      {/* Add category inline */}
      {showAddCat && (
        <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-white/10 flex gap-2">
          <input
            autoFocus
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="Category name"
            className="flex-1 min-h-[48px] px-4 rounded-lg bg-white/10 text-[var(--color-text)] placeholder-white/30 border border-white/10 outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
          />
          <button
            onClick={handleAddCategory}
            className="min-h-[48px] px-4 rounded-lg bg-green-600 text-white font-bold"
          >
            Add
          </button>
          <button
            onClick={() => setShowAddCat(false)}
            className="min-h-[48px] px-4 rounded-lg bg-white/10 text-white/60"
          >
            {"\u2715"}
          </button>
        </div>
      )}

      {categories.length === 0 && (
        <div className="text-center pt-12 text-white/40">
          <p className="text-4xl mb-3">{"\uD83C\uDF7D\uFE0F"}</p>
          <p>No menu categories yet.</p>
          <p className="text-sm mt-1">Tap "+ Category" to get started.</p>
        </div>
      )}

      {/* Category list */}
      {categories.map((cat) => (
        <div
          key={cat.id}
          className="bg-[var(--color-surface)] rounded-xl border border-white/10 overflow-hidden"
        >
          <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
            <h3 className="font-bold text-base">{cat.name}</h3>
            <button
              onClick={() => setAddingTo(addingTo === cat.id ? null : cat.id)}
              className="min-h-[40px] px-3 rounded-lg bg-white/10 text-sm font-medium text-white/70"
            >
              + Item
            </button>
          </div>

          {/* Add item form */}
          {addingTo === cat.id && (
            <div className="p-4 border-b border-white/10 space-y-3 bg-white/5">
              <input
                autoFocus
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Item name"
                className="w-full min-h-[48px] px-4 rounded-lg bg-white/10 text-[var(--color-text)] placeholder-white/30 border border-white/10 outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="Price (NPR)"
                  className="flex-1 min-h-[48px] px-4 rounded-lg bg-white/10 text-[var(--color-text)] placeholder-white/30 border border-white/10 outline-none"
                />
                <select
                  value={itemUnit}
                  onChange={(e) => setItemUnit(e.target.value)}
                  className="min-h-[48px] px-3 rounded-lg bg-white/10 text-[var(--color-text)] border border-white/10 outline-none"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                {ITEM_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setItemType(t.value)}
                    className={`flex-1 min-h-[44px] rounded-lg text-sm font-medium border ${
                      itemType === t.value
                        ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                        : "bg-white/5 border-white/10 text-white/50"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddItem(cat.id)}
                  className="flex-1 min-h-[48px] rounded-lg bg-green-600 text-white font-bold"
                >
                  Save Item
                </button>
                <button
                  onClick={() => setAddingTo(null)}
                  className="min-h-[48px] px-4 rounded-lg bg-white/10 text-white/60"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Items list */}
          {cat.items.length === 0 && addingTo !== cat.id && (
            <p className="px-4 py-3 text-white/30 text-sm">No items yet</p>
          )}
          {cat.items.map((item) => (
            <div
              key={item.id}
              className="px-4 py-3 flex items-center gap-3 border-b border-white/5 last:border-b-0"
            >
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium ${
                    item.is_active ? "" : "line-through text-white/30"
                  }`}
                >
                  {item.name}
                </p>
                <p className="text-sm text-white/40">
                  Rs. {item.price_npr} / {item.unit} &middot; {item.item_type}
                </p>
              </div>
              <button
                onClick={() => handleToggle(cat.id, item.id)}
                className={`min-w-[56px] min-h-[36px] rounded-full text-xs font-bold ${
                  item.is_active
                    ? "bg-green-600/20 text-green-400"
                    : "bg-red-600/20 text-red-400"
                }`}
              >
                {item.is_active ? "ON" : "OFF"}
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
