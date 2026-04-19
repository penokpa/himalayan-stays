import { getDoc, putDoc, getDocsByPrefix } from "@/lib/db";
import type { TabDoc, TabItemLocal, MenuItemLocal, MenuDoc } from "@himalayan-stays/shared";
import { decrementStock } from "@/lib/menu";

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
  quantity: number
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
  const items = tab.items.map((i) =>
    i.id === itemId ? { ...i, voided: true, void_reason: reason } : i
  );
  await putDoc({ ...tab, items, tab_total_npr: recalcTotal(items) });
}

export async function updateItemQuantity(
  tabId: string,
  itemId: string,
  newQty: number
): Promise<void> {
  const tab = await getDoc<TabDoc>(tabId);
  if (!tab) throw new Error("Tab not found");

  let items: TabItemLocal[];
  if (newQty <= 0) {
    // Void the item
    items = tab.items.map((i) =>
      i.id === itemId ? { ...i, voided: true, void_reason: "Removed", quantity: 0, line_total_npr: 0 } : i
    );
  } else {
    items = tab.items.map((i) =>
      i.id === itemId
        ? { ...i, quantity: newQty, line_total_npr: i.unit_price_npr * newQty }
        : i
    );
  }

  await putDoc({ ...tab, items, tab_total_npr: recalcTotal(items) });
}

export async function holdTab(tabId: string): Promise<void> {
  const tab = await getDoc<TabDoc>(tabId);
  if (!tab) throw new Error("Tab not found");
  await putDoc({
    ...tab,
    notes: tab.notes ? `${tab.notes}; ON HOLD` : "ON HOLD",
  });
}

export async function settleTab(
  tabId: string,
  method: "CASH" | "ESEWA" | "KHALTI" | "INCLUDED_IN_BOOKING"
): Promise<void> {
  const tab = await getDoc<TabDoc>(tabId);
  if (!tab) throw new Error("Tab not found");
  await putDoc({
    ...tab,
    status: "SETTLED" as const,
    settlement_method: method,
    closed_at: new Date().toISOString(),
  });
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

  for (const tab of tabs) {
    for (const item of tab.items) {
      if (item.voided) continue;
      summary.total += item.line_total_npr;
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

  const cashTotal = settledTabs
    .filter((t) => t.settlement_method === "CASH")
    .reduce((sum, t) => sum + t.tab_total_npr, 0);

  const digitalTotal = settledTabs
    .filter((t) => t.settlement_method === "ESEWA" || t.settlement_method === "KHALTI")
    .reduce((sum, t) => sum + t.tab_total_npr, 0);

  const roomTabTotal = settledTabs
    .filter((t) => t.settlement_method === "INCLUDED_IN_BOOKING")
    .reduce((sum, t) => sum + t.tab_total_npr, 0);

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
    open_tabs: openTabs,
  };
}
