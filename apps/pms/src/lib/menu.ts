import { getDoc, putDoc } from "@/lib/db";
import type {
  MenuDoc,
  MenuCategoryLocal,
  MenuItemLocal,
} from "@himalayan-stays/shared";

const LODGE_ID = "default";
const MENU_ID = `menu:${LODGE_ID}`;

export async function getMenu(): Promise<MenuDoc | null> {
  return getDoc<MenuDoc>(MENU_ID);
}

export async function saveMenu(
  categories: MenuCategoryLocal[]
): Promise<void> {
  const doc: MenuDoc = {
    _id: MENU_ID,
    type: "menu",
    lodge_id: LODGE_ID,
    categories,
    updated_at: new Date().toISOString(),
  };
  await putDoc(doc);
}

export async function addCategory(name: string): Promise<void> {
  const menu = await getMenu();
  const categories = menu?.categories ?? [];
  const newCategory: MenuCategoryLocal = {
    id: crypto.randomUUID(),
    name,
    sort_order: categories.length,
    items: [],
  };
  await saveMenu([...categories, newCategory]);
}

export async function addMenuItem(
  categoryId: string,
  item: Omit<MenuItemLocal, "id">
): Promise<void> {
  const menu = await getMenu();
  if (!menu) throw new Error("Menu not found. Create a category first.");
  const categories = menu.categories.map((cat) => {
    if (cat.id !== categoryId) return cat;
    return {
      ...cat,
      items: [...cat.items, { ...item, id: crypto.randomUUID() }],
    };
  });
  await saveMenu(categories);
}

export async function toggleMenuItem(
  categoryId: string,
  itemId: string
): Promise<void> {
  const menu = await getMenu();
  if (!menu) throw new Error("Menu not found.");
  const categories = menu.categories.map((cat) => {
    if (cat.id !== categoryId) return cat;
    return {
      ...cat,
      items: cat.items.map((item) =>
        item.id === itemId ? { ...item, is_active: !item.is_active } : item
      ),
    };
  });
  await saveMenu(categories);
}

export async function updateMenuItemStock(
  categoryId: string,
  itemId: string,
  updates: { current_stock?: number; low_stock_threshold?: number; track_stock?: boolean }
): Promise<void> {
  const menu = await getMenu();
  if (!menu) throw new Error("Menu not found.");
  const categories = menu.categories.map((cat) => {
    if (cat.id !== categoryId) return cat;
    return {
      ...cat,
      items: cat.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    };
  });
  await saveMenu(categories);
}

export async function decrementStock(
  itemId: string,
  quantity: number
): Promise<void> {
  const menu = await getMenu();
  if (!menu) return;
  let found = false;
  const categories = menu.categories.map((cat) => ({
    ...cat,
    items: cat.items.map((item) => {
      if (item.id !== itemId || !item.track_stock || item.current_stock == null) return item;
      found = true;
      return { ...item, current_stock: Math.max(0, item.current_stock - quantity) };
    }),
  }));
  if (found) await saveMenu(categories);
}

export interface LowStockItem {
  categoryId: string;
  categoryName: string;
  item: MenuItemLocal;
}

export async function getLowStockItems(): Promise<LowStockItem[]> {
  const menu = await getMenu();
  if (!menu) return [];
  const results: LowStockItem[] = [];
  for (const cat of menu.categories) {
    for (const item of cat.items) {
      if (
        item.track_stock &&
        item.current_stock != null &&
        item.low_stock_threshold != null &&
        item.current_stock <= item.low_stock_threshold
      ) {
        results.push({ categoryId: cat.id, categoryName: cat.name, item });
      }
    }
  }
  return results;
}

/** Seed the menu with default items if it doesn't exist yet */
export async function seedMenuIfEmpty(): Promise<void> {
  const existing = await getMenu();
  if (existing) return;

  function makeItem(
    name: string,
    price: number,
    itemType: MenuItemLocal["item_type"],
    unit: string,
    stock?: { current: number; threshold: number }
  ): MenuItemLocal {
    return {
      id: crypto.randomUUID(),
      name,
      price_npr: price,
      unit,
      item_type: itemType,
      track_stock: !!stock,
      current_stock: stock?.current,
      low_stock_threshold: stock?.threshold,
      is_active: true,
    };
  }

  const categories: MenuCategoryLocal[] = [
    {
      id: crypto.randomUUID(),
      name: "Meals",
      sort_order: 0,
      items: [
        makeItem("Dal Bhat", 500, "FOOD", "plate"),
        makeItem("Thukpa", 450, "FOOD", "plate"),
        makeItem("Fried Rice", 400, "FOOD", "plate"),
        makeItem("Pasta", 420, "FOOD", "plate"),
        makeItem("Momo", 350, "FOOD", "plate"),
        makeItem("Roti Set", 300, "FOOD", "plate"),
      ],
    },
    {
      id: crypto.randomUUID(),
      name: "Drinks",
      sort_order: 1,
      items: [
        makeItem("Milk Tea", 120, "DRINK", "cup"),
        makeItem("Lemon Tea", 100, "DRINK", "cup"),
        makeItem("Hot Chocolate", 200, "DRINK", "cup"),
        makeItem("Boiled Water", 80, "DRINK", "liter"),
        makeItem("Hot Ginger", 100, "DRINK", "cup"),
        makeItem("Lassi", 180, "DRINK", "cup"),
      ],
    },
    {
      id: crypto.randomUUID(),
      name: "Services",
      sort_order: 2,
      items: [
        makeItem("Phone Charging", 200, "SERVICE", "use"),
        makeItem("Hot Shower", 300, "SERVICE", "use"),
        makeItem("WiFi (1 hr)", 150, "SERVICE", "hour"),
        makeItem("Laundry", 400, "SERVICE", "use"),
      ],
    },
    {
      id: crypto.randomUUID(),
      name: "Supplies",
      sort_order: 3,
      items: [
        makeItem("Chocolate Bar", 250, "SUPPLY", "piece", { current: 20, threshold: 5 }),
        makeItem("Snickers", 300, "SUPPLY", "piece", { current: 15, threshold: 5 }),
        makeItem("Biscuit Pack", 150, "SUPPLY", "piece", { current: 25, threshold: 5 }),
        makeItem("Water Purification Tabs", 200, "SUPPLY", "strip", { current: 10, threshold: 3 }),
        makeItem("Batteries (AA)", 350, "SUPPLY", "pair", { current: 8, threshold: 2 }),
        makeItem("Sunscreen", 500, "SUPPLY", "piece", { current: 6, threshold: 2 }),
        makeItem("Lip Balm", 250, "SUPPLY", "piece", { current: 12, threshold: 3 }),
        makeItem("Wet Wipes", 180, "SUPPLY", "pack", { current: 18, threshold: 5 }),
      ],
    },
  ];

  await saveMenu(categories);
}
