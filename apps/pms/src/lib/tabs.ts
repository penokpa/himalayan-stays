import { getDoc, putDoc, getDocsByPrefix } from "@/lib/db";
import type {
  TabDoc,
  TabItemLocal,
  TabPayment,
  SettleMethod,
  MenuItemLocal,
  MenuDoc,
} from "@himalayan-stays/shared";
import { decrementStock, incrementStock } from "@/lib/menu";

const LODGE_ID = "default";

function recalcTotal(items: TabItemLocal[]): number {
  return items
    .filter((i) => !i.voided)
    .reduce((sum, i) => sum + i.line_total_npr, 0);
}

export async function getOpenTabs(): Promise<TabDoc[]> {
  const tabs = await getDocsByPrefix<TabDoc>(`tab:${LODGE_ID}:`);
  return tabs.filter((doc) => doc.status === "OPEN");
}

export async function getTab(tabId: string): Promise<TabDoc | null> {
  return getDoc<TabDoc>(tabId);
}

export async function openTab(
  guestName: string,
  roomId?: string
): Promise<TabDoc> {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const id = `tab:${LODGE_ID}:${roomId ?? "walk"}:${date}:${crypto.randomUUID().slice(0, 8)}`;
  const doc: TabDoc = {
    _id: id,
    type: "tab",
    lodge_id: LODGE_ID,
    room_id: roomId || undefined,
    guest_name: guestName,
    items: [],
    opened_at: now.toISOString(),
    status: "OPEN",
    tab_total_npr: 0,
  };
  await putDoc(doc);
  return doc;
}

export async function addItemToTab(
  tabId: string,
  menuItem: MenuItemLocal,
  quantity: number,
  opts?: { soldOos?: boolean }
): Promise<void> {
  const tab = await getDoc<TabDoc>(tabId);
  if (!tab) throw new Error("Tab not found");
  const newItem: TabItemLocal = {
    id: crypto.randomUUID(),
    menu_item_id: menuItem.id,
    item_name: menuItem.name,
    quantity,
    unit_price_npr: menuItem.price_npr,
    line_total_npr: menuItem.price_npr * quantity,
    added_at: new Date().toISOString(),
    voided: false,
    ...(opts?.soldOos ? { sold_oos: true } : {}),
  };
  const items = [...tab.items, newItem];
  await putDoc({ ...tab, items, tab_total_npr: recalcTotal(items) });
  await decrementStock(menuItem.id, quantity);
}

export async function voidTabItem(
  tabId: string,
  itemId: string,
  reason: string
): Promise<void> {
  const tab = await getDoc<TabDoc>(tabId);
  if (!tab) throw new Error("Tab not found");
  const target = tab.items.find((i) => i.id === itemId);
  const wasVoided = target?.voided ?? false;
  const items = tab.items.map((i) =>
    i.id === itemId ? { ...i, voided: true, void_reason: reason } : i
  );
  await putDoc({ ...tab, items, tab_total_npr: recalcTotal(items) });
  if (target && !wasVoided && target.quantity > 0) {
    await incrementStock(target.menu_item_id, target.quantity);
  }
}

export async function updateItemQuantity(
  tabId: string,
  itemId: string,
  newQty: number,
  opts?: { soldOos?: boolean }
): Promise<void> {
  const tab = await getDoc<TabDoc>(tabId);
  if (!tab) throw new Error("Tab not found");

  const target = tab.items.find((i) => i.id === itemId);
  if (!target || target.voided) return;
  const prevQty = target.quantity;

  let items: TabItemLocal[];
  let stockDelta: number;
  if (newQty <= 0) {
    // Void the item — restore the full prior quantity to stock
    items = tab.items.map((i) =>
      i.id === itemId ? { ...i, voided: true, void_reason: "Removed", quantity: 0, line_total_npr: 0 } : i
    );
    stockDelta = prevQty;
  } else {
    items = tab.items.map((i) =>
      i.id === itemId
        ? {
            ...i,
            quantity: newQty,
            line_total_npr: i.unit_price_npr * newQty,
            ...(opts?.soldOos ? { sold_oos: true } : {}),
          }
        : i
    );
    stockDelta = prevQty - newQty; // positive = restore, negative = deduct more
  }

  await putDoc({ ...tab, items, tab_total_npr: recalcTotal(items) });
  if (stockDelta > 0) {
    await incrementStock(target.menu_item_id, stockDelta);
  } else if (stockDelta < 0) {
    await decrementStock(target.menu_item_id, -stockDelta);
  }
}

export async function holdTab(tabId: string): Promise<void> {
  const tab = await getDoc<TabDoc>(tabId);
  if (!tab) throw new Error("Tab not found");
  await putDoc({
    ...tab,
    notes: tab.notes ? `${tab.notes}; ON HOLD` : "ON HOLD",
  });
}

export async function unholdTab(tabId: string): Promise<void> {
  const tab = await getDoc<TabDoc>(tabId);
  if (!tab) throw new Error("Tab not found");
  if (!tab.notes) return;
  const remaining = tab.notes
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && s !== "ON HOLD")
    .join("; ");
  await putDoc({ ...tab, notes: remaining || undefined });
}

export async function settleTab(
  tabId: string,
  methodOrPayments: SettleMethod | TabPayment[]
): Promise<void> {
  const tab = await getDoc<TabDoc>(tabId);
  if (!tab) throw new Error("Tab not found");
  const payments: TabPayment[] =
    typeof methodOrPayments === "string"
      ? [{ method: methodOrPayments, amount_npr: tab.tab_total_npr }]
      : methodOrPayments;
  await putDoc({
    ...tab,
    status: "SETTLED" as const,
    payments,
    closed_at: new Date().toISOString(),
  });
}

/**
 * Returns the top N most-added menu items today (by total non-voided quantity),
 * for surfacing as a quick-add row above the category grid. Filters on
 * item.added_at (not tab.opened_at) so a multi-night tab's earlier orders
 * don't pollute today's signal.
 */
export async function getTopItemsToday(
  limit = 5
): Promise<{ menu_item_id: string; quantity: number }[]> {
  const today = new Date().toISOString().slice(0, 10);
  const allTabs = await getDocsByPrefix<TabDoc>(`tab:${LODGE_ID}:`);
  const counts = new Map<string, number>();
  for (const tab of allTabs) {
    for (const item of tab.items) {
      if (item.voided) continue;
      if (!item.added_at.startsWith(today)) continue;
      counts.set(
        item.menu_item_id,
        (counts.get(item.menu_item_id) ?? 0) + item.quantity
      );
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([menu_item_id, quantity]) => ({ menu_item_id, quantity }));
}

export interface DailySalesResult {
  total: number;
  food: number;
  drink: number;
  service: number;
  supply: number;
  tabs_opened: number;
  tabs_settled: number;
  cash_total: number;
  digital_total: number;
  room_tab_total: number;
  sold_oos_units: number;
  open_tabs: { id: string; guest_name: string; room_id?: string; outstanding: number }[];
}

export async function getDailySales(date: string): Promise<DailySalesResult> {
  const allTabs = await getDocsByPrefix<TabDoc>(`tab:${LODGE_ID}:`);
  const tabs = allTabs.filter((doc) => doc.opened_at.startsWith(date));

  const summary = { total: 0, food: 0, drink: 0, service: 0, supply: 0 };

  let menuItems: Map<string, MenuItemLocal> | null = null;
  const menuDoc = await getDoc<MenuDoc>(`menu:${LODGE_ID}`);
  if (menuDoc) {
    menuItems = new Map();
    for (const cat of menuDoc.categories) {
      for (const item of cat.items) {
        menuItems.set(item.id, item);
      }
    }
  }

  let soldOosUnits = 0;
  for (const tab of tabs) {
    for (const item of tab.items) {
      if (item.voided) continue;
      summary.total += item.line_total_npr;
      if (item.sold_oos) soldOosUnits += item.quantity;
      if (menuItems) {
        const mi = menuItems.get(item.menu_item_id);
        if (mi) {
          const key = mi.item_type.toLowerCase() as "food" | "drink" | "service" | "supply";
          summary[key] += item.line_total_npr;
        }
      }
    }
  }

  const settledTabs = tabs.filter((t) => t.status === "SETTLED");

  let cashTotal = 0;
  let digitalTotal = 0;
  let roomTabTotal = 0;
  for (const t of settledTabs) {
    for (const p of t.payments ?? []) {
      if (p.method === "CASH") cashTotal += p.amount_npr;
      else if (p.method === "ESEWA" || p.method === "KHALTI") digitalTotal += p.amount_npr;
      else if (p.method === "INCLUDED_IN_BOOKING") roomTabTotal += p.amount_npr;
    }
  }

  const openTabs = tabs
    .filter((t) => t.status === "OPEN")
    .map((t) => ({
      id: t._id,
      guest_name: t.guest_name,
      room_id: t.room_id,
      outstanding: t.tab_total_npr,
    }));

  return {
    ...summary,
    tabs_opened: tabs.length,
    tabs_settled: settledTabs.length,
    cash_total: cashTotal,
    digital_total: digitalTotal,
    room_tab_total: roomTabTotal,
    sold_oos_units: soldOosUnits,
    open_tabs: openTabs,
  };
}
