import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock db module before importing anything that uses it
vi.mock("@/lib/db", () => import("@/lib/__mocks__/db"));

import { clearStore } from "@/lib/__mocks__/db";
import { seedMenuIfEmpty, getMenu } from "@/lib/menu";
import {
  openTab,
  addItemToTab,
  updateItemQuantity,
  voidTabItem,
  settleTab,
  holdTab,
  unholdTab,
  getTab,
  getOpenTabs,
  getDailySales,
  getTopItemsToday,
} from "@/lib/tabs";
import type { MenuItemLocal } from "@himalayan-stays/shared";

// Helper: get first active menu item from a category
async function getMenuItem(
  categoryName: string,
  itemName: string
): Promise<MenuItemLocal> {
  const menu = await getMenu();
  const cat = menu!.categories.find((c) => c.name === categoryName);
  const item = cat!.items.find((i) => i.name === itemName);
  return item!;
}

describe("POS Calculations", () => {
  beforeEach(async () => {
    clearStore();
    await seedMenuIfEmpty();
  });

  // ─── Menu Seeding ───
  describe("Menu Seed", () => {
    it("seeds 4 categories with correct item counts", async () => {
      const menu = await getMenu();
      expect(menu).not.toBeNull();
      expect(menu!.categories).toHaveLength(4);
      expect(menu!.categories[0].name).toBe("Meals");
      expect(menu!.categories[0].items).toHaveLength(6);
      expect(menu!.categories[1].name).toBe("Drinks");
      expect(menu!.categories[1].items).toHaveLength(6);
      expect(menu!.categories[2].name).toBe("Services");
      expect(menu!.categories[2].items).toHaveLength(4);
      expect(menu!.categories[3].name).toBe("Supplies");
      expect(menu!.categories[3].items).toHaveLength(8);
    });

    it("does not overwrite existing menu on second call", async () => {
      const menu1 = await getMenu();
      await seedMenuIfEmpty(); // second call
      const menu2 = await getMenu();
      // IDs should be same since it wasn't re-seeded
      expect(menu1!.categories[0].id).toBe(menu2!.categories[0].id);
    });

    it("has correct prices for known items", async () => {
      const dalBhat = await getMenuItem("Meals", "Dal Bhat");
      expect(dalBhat.price_npr).toBe(500);
      expect(dalBhat.item_type).toBe("FOOD");

      const milkTea = await getMenuItem("Drinks", "Milk Tea");
      expect(milkTea.price_npr).toBe(120);
      expect(milkTea.item_type).toBe("DRINK");

      const hotShower = await getMenuItem("Services", "Hot Shower");
      expect(hotShower.price_npr).toBe(300);
      expect(hotShower.item_type).toBe("SERVICE");
    });
  });

  // ─── Line Total Calculations ───
  describe("Line Totals", () => {
    it("calculates line_total = unit_price * quantity on add", async () => {
      const tab = await openTab("Guest A", "room-1");
      const dalBhat = await getMenuItem("Meals", "Dal Bhat");

      await addItemToTab(tab._id, dalBhat, 3);
      const updated = await getTab(tab._id);
      const item = updated!.items[0];

      expect(item.unit_price_npr).toBe(500);
      expect(item.quantity).toBe(3);
      expect(item.line_total_npr).toBe(1500); // 500 * 3
    });

    it("recalculates line_total on quantity change", async () => {
      const tab = await openTab("Guest B", "room-2");
      const pasta = await getMenuItem("Meals", "Pasta");

      await addItemToTab(tab._id, pasta, 1);
      let updated = await getTab(tab._id);
      expect(updated!.items[0].line_total_npr).toBe(420); // 420 * 1

      await updateItemQuantity(tab._id, updated!.items[0].id, 4);
      updated = await getTab(tab._id);
      expect(updated!.items[0].line_total_npr).toBe(1680); // 420 * 4
      expect(updated!.items[0].quantity).toBe(4);
    });
  });

  // ─── Tab Total (subtotal) ───
  describe("Tab Total (Subtotal)", () => {
    it("sums all non-voided items", async () => {
      const tab = await openTab("Guest C");
      const dalBhat = await getMenuItem("Meals", "Dal Bhat"); // 500
      const milkTea = await getMenuItem("Drinks", "Milk Tea"); // 120
      const hotShower = await getMenuItem("Services", "Hot Shower"); // 300

      await addItemToTab(tab._id, dalBhat, 2); // 1000
      await addItemToTab(tab._id, milkTea, 3); // 360
      await addItemToTab(tab._id, hotShower, 1); // 300

      const updated = await getTab(tab._id);
      expect(updated!.tab_total_npr).toBe(1660); // 1000 + 360 + 300
    });

    it("excludes voided items from tab_total", async () => {
      const tab = await openTab("Guest D");
      const dalBhat = await getMenuItem("Meals", "Dal Bhat"); // 500
      const milkTea = await getMenuItem("Drinks", "Milk Tea"); // 120

      await addItemToTab(tab._id, dalBhat, 1); // 500
      await addItemToTab(tab._id, milkTea, 2); // 240

      let updated = await getTab(tab._id);
      expect(updated!.tab_total_npr).toBe(740);

      // Void the dal bhat
      await voidTabItem(tab._id, updated!.items[0].id, "Wrong order");
      updated = await getTab(tab._id);
      expect(updated!.tab_total_npr).toBe(240); // only milk tea remains
      expect(updated!.items[0].voided).toBe(true);
      expect(updated!.items[0].void_reason).toBe("Wrong order");
    });

    it("voids item when quantity set to 0", async () => {
      const tab = await openTab("Guest E");
      const momo = await getMenuItem("Meals", "Momo"); // 350

      await addItemToTab(tab._id, momo, 2); // 700
      let updated = await getTab(tab._id);
      expect(updated!.tab_total_npr).toBe(700);

      await updateItemQuantity(tab._id, updated!.items[0].id, 0);
      updated = await getTab(tab._id);
      expect(updated!.tab_total_npr).toBe(0);
      expect(updated!.items[0].voided).toBe(true);
    });
  });

  // ─── Service Charge (UI-level calculation) ───
  describe("Service Charge (10%)", () => {
    it("calculates service charge correctly", async () => {
      const tab = await openTab("Guest F");
      const dalBhat = await getMenuItem("Meals", "Dal Bhat"); // 500
      await addItemToTab(tab._id, dalBhat, 2); // 1000

      const updated = await getTab(tab._id);
      const subtotal = updated!.tab_total_npr;
      const serviceCharge = Math.round(subtotal * 0.1);
      const total = subtotal + serviceCharge;

      expect(subtotal).toBe(1000);
      expect(serviceCharge).toBe(100);
      expect(total).toBe(1100);
    });

    it("rounds service charge for odd amounts", async () => {
      const tab = await openTab("Guest G");
      const thukpa = await getMenuItem("Meals", "Thukpa"); // 450
      await addItemToTab(tab._id, thukpa, 1);

      const updated = await getTab(tab._id);
      const subtotal = updated!.tab_total_npr; // 450
      const serviceCharge = Math.round(subtotal * 0.1); // 45
      const total = subtotal + serviceCharge; // 495

      expect(serviceCharge).toBe(45);
      expect(total).toBe(495);
    });

    it("rounds service charge for non-round subtotals", async () => {
      const tab = await openTab("Guest H");
      const thukpa = await getMenuItem("Meals", "Thukpa"); // 450
      const lemonTea = await getMenuItem("Drinks", "Lemon Tea"); // 100
      await addItemToTab(tab._id, thukpa, 3); // 1350
      await addItemToTab(tab._id, lemonTea, 1); // 100

      const updated = await getTab(tab._id);
      const subtotal = updated!.tab_total_npr; // 1450
      const serviceCharge = Math.round(subtotal * 0.1); // 145
      const total = subtotal + serviceCharge; // 1595

      expect(subtotal).toBe(1450);
      expect(serviceCharge).toBe(145);
      expect(total).toBe(1595);
    });
  });

  // ─── Settlement ───
  describe("Settlement", () => {
    it("settles tab with CASH and marks as SETTLED", async () => {
      const tab = await openTab("Guest I");
      const dalBhat = await getMenuItem("Meals", "Dal Bhat");
      await addItemToTab(tab._id, dalBhat, 1);

      await settleTab(tab._id, "CASH");
      const settled = await getTab(tab._id);

      expect(settled!.status).toBe("SETTLED");
      expect(settled!.payments).toHaveLength(1);
      expect(settled!.payments![0].method).toBe("CASH");
      expect(settled!.closed_at).toBeDefined();
    });

    it("hold keeps tab OPEN with ON HOLD note", async () => {
      const tab = await openTab("Guest J");
      const milkTea = await getMenuItem("Drinks", "Milk Tea");
      await addItemToTab(tab._id, milkTea, 1);

      await holdTab(tab._id);
      const held = await getTab(tab._id);

      expect(held!.status).toBe("OPEN"); // hold doesn't close the tab
      expect(held!.notes).toContain("ON HOLD");
    });

    it("unhold strips ON HOLD and clears notes when nothing else remains", async () => {
      const tab = await openTab("Guest U1");
      await holdTab(tab._id);
      await unholdTab(tab._id);
      const resumed = await getTab(tab._id);
      expect(resumed!.status).toBe("OPEN");
      expect(resumed!.notes).toBeUndefined();
    });

    it("unhold preserves other notes when present", async () => {
      const tab = await openTab("Guest U2");
      await holdTab(tab._id);
      // Simulate a tab that had a prior note before being held
      const held = await getTab(tab._id);
      await holdTab(tab._id); // no-op-ish — sets notes to "ON HOLD; ON HOLD"
      // Manually set a mixed notes string to simulate real-world use
      const direct = await getTab(tab._id);
      direct!.notes = "VIP guest; ON HOLD";
      await (await import("@/lib/db")).putDoc(direct!);
      await unholdTab(tab._id);
      const resumed = await getTab(tab._id);
      expect(resumed!.notes).toBe("VIP guest");
      expect(held).toBeDefined();
    });

    it("unhold is idempotent on a tab that isn't held", async () => {
      const tab = await openTab("Guest U3");
      await unholdTab(tab._id);
      const after = await getTab(tab._id);
      expect(after!.notes).toBeUndefined();
    });

    it("settled tab no longer appears in getOpenTabs", async () => {
      const tab = await openTab("Guest K");
      const dalBhat = await getMenuItem("Meals", "Dal Bhat");
      await addItemToTab(tab._id, dalBhat, 1);

      let openTabs = await getOpenTabs();
      expect(openTabs.some((t) => t._id === tab._id)).toBe(true);

      await settleTab(tab._id, "ESEWA");
      openTabs = await getOpenTabs();
      expect(openTabs.some((t) => t._id === tab._id)).toBe(false);
    });
  });

  // ─── Daily Sales ───
  describe("Daily Sales", () => {
    it("aggregates revenue by item type", async () => {
      const today = new Date().toISOString().slice(0, 10);

      const tab = await openTab("Guest L");
      const dalBhat = await getMenuItem("Meals", "Dal Bhat"); // 500 FOOD
      const milkTea = await getMenuItem("Drinks", "Milk Tea"); // 120 DRINK
      const hotShower = await getMenuItem("Services", "Hot Shower"); // 300 SERVICE

      await addItemToTab(tab._id, dalBhat, 2); // 1000
      await addItemToTab(tab._id, milkTea, 3); // 360
      await addItemToTab(tab._id, hotShower, 1); // 300

      const sales = await getDailySales(today);
      expect(sales.total).toBe(1660);
      expect(sales.food).toBe(1000);
      expect(sales.drink).toBe(360);
      expect(sales.service).toBe(300);
      expect(sales.supply).toBe(0);
    });

    it("tracks tabs opened and settled counts", async () => {
      const today = new Date().toISOString().slice(0, 10);

      const tab1 = await openTab("Guest M");
      const tab2 = await openTab("Guest N");
      const dalBhat = await getMenuItem("Meals", "Dal Bhat");

      await addItemToTab(tab1._id, dalBhat, 1);
      await addItemToTab(tab2._id, dalBhat, 1);
      await settleTab(tab1._id, "CASH");

      const sales = await getDailySales(today);
      expect(sales.tabs_opened).toBe(2);
      expect(sales.tabs_settled).toBe(1);
    });

    it("calculates totals per payment method", async () => {
      const today = new Date().toISOString().slice(0, 10);

      const tab1 = await openTab("Guest O");
      const tab2 = await openTab("Guest P");
      const tab3 = await openTab("Guest Q2");
      const dalBhat = await getMenuItem("Meals", "Dal Bhat"); // 500

      await addItemToTab(tab1._id, dalBhat, 2); // 1000
      await addItemToTab(tab2._id, dalBhat, 3); // 1500
      await addItemToTab(tab3._id, dalBhat, 1); // 500

      await settleTab(tab1._id, "CASH");
      await settleTab(tab2._id, "ESEWA");
      await settleTab(tab3._id, "INCLUDED_IN_BOOKING");

      const sales = await getDailySales(today);
      expect(sales.cash_total).toBe(1000);
      expect(sales.digital_total).toBe(1500);
      expect(sales.room_tab_total).toBe(500);
    });

    it("lists open tabs with outstanding balances", async () => {
      const today = new Date().toISOString().slice(0, 10);

      const tab = await openTab("Guest Q", "room-5");
      const friedRice = await getMenuItem("Meals", "Fried Rice"); // 400
      await addItemToTab(tab._id, friedRice, 2); // 800

      const sales = await getDailySales(today);
      expect(sales.open_tabs).toHaveLength(1);
      expect(sales.open_tabs[0].guest_name).toBe("Guest Q");
      expect(sales.open_tabs[0].room_id).toBe("room-5");
      expect(sales.open_tabs[0].outstanding).toBe(800);
    });

    it("tracks supply revenue separately", async () => {
      const today = new Date().toISOString().slice(0, 10);

      const tab = await openTab("Guest S");
      const chocBar = await getMenuItem("Supplies", "Chocolate Bar"); // 250
      const sunscreen = await getMenuItem("Supplies", "Sunscreen"); // 500
      const dalBhat = await getMenuItem("Meals", "Dal Bhat"); // 500

      await addItemToTab(tab._id, chocBar, 2); // 500
      await addItemToTab(tab._id, sunscreen, 1); // 500
      await addItemToTab(tab._id, dalBhat, 1); // 500

      const sales = await getDailySales(today);
      expect(sales.supply).toBe(1000); // 500 + 500
      expect(sales.food).toBe(500);
      expect(sales.total).toBe(1500);
    });

    it("excludes voided items from daily totals", async () => {
      const today = new Date().toISOString().slice(0, 10);

      const tab = await openTab("Guest R");
      const dalBhat = await getMenuItem("Meals", "Dal Bhat"); // 500
      const milkTea = await getMenuItem("Drinks", "Milk Tea"); // 120

      await addItemToTab(tab._id, dalBhat, 1); // 500
      await addItemToTab(tab._id, milkTea, 2); // 240

      let updated = await getTab(tab._id);
      await voidTabItem(tab._id, updated!.items[0].id, "test void");

      const sales = await getDailySales(today);
      expect(sales.total).toBe(240); // only milk tea
      expect(sales.food).toBe(0); // dal bhat was voided
      expect(sales.drink).toBe(240);
    });
  });

  // ─── Multi-item complex scenario ───
  describe("Complex Scenario", () => {
    it("full guest tab lifecycle: add, modify, void, settle", async () => {
      const tab = await openTab("Trekker Alex", "room-3");
      const dalBhat = await getMenuItem("Meals", "Dal Bhat"); // 500
      const milkTea = await getMenuItem("Drinks", "Milk Tea"); // 120
      const pasta = await getMenuItem("Meals", "Pasta"); // 420
      const charging = await getMenuItem("Services", "Phone Charging"); // 200

      // Day 1 orders
      await addItemToTab(tab._id, dalBhat, 2); // 1000
      await addItemToTab(tab._id, milkTea, 4); // 480
      await addItemToTab(tab._id, charging, 1); // 200

      let updated = await getTab(tab._id);
      expect(updated!.tab_total_npr).toBe(1680);

      // Change milk tea quantity from 4 to 2
      const milkTeaItem = updated!.items.find(
        (i) => i.item_name === "Milk Tea"
      )!;
      await updateItemQuantity(tab._id, milkTeaItem.id, 2);
      updated = await getTab(tab._id);
      expect(updated!.tab_total_npr).toBe(1440); // 1000 + 240 + 200

      // Add pasta
      await addItemToTab(tab._id, pasta, 1); // 420
      updated = await getTab(tab._id);
      expect(updated!.tab_total_npr).toBe(1860);

      // Void the charging (wrong guest)
      const chargingItem = updated!.items.find(
        (i) => i.item_name === "Phone Charging"
      )!;
      await voidTabItem(tab._id, chargingItem.id, "Wrong room");
      updated = await getTab(tab._id);
      expect(updated!.tab_total_npr).toBe(1660); // 1000 + 240 + 420

      // UI-level totals
      const subtotal = updated!.tab_total_npr;
      const serviceCharge = Math.round(subtotal * 0.1);
      const total = subtotal + serviceCharge;
      expect(subtotal).toBe(1660);
      expect(serviceCharge).toBe(166);
      expect(total).toBe(1826);

      // Settle
      await settleTab(tab._id, "CASH");
      const settled = await getTab(tab._id);
      expect(settled!.status).toBe("SETTLED");
      expect(settled!.payments![0].method).toBe("CASH");
    });
  });

  // ─── Split Settlement ───
  describe("Split settlement", () => {
    it("records multiple payments and aggregates by method", async () => {
      const today = new Date().toISOString().slice(0, 10);
      const tab = await openTab("Guest Split", "room-9");
      const dalBhat = await getMenuItem("Meals", "Dal Bhat"); // 500
      await addItemToTab(tab._id, dalBhat, 2); // 1000

      await settleTab(tab._id, [
        { method: "CASH", amount_npr: 600 },
        { method: "ESEWA", amount_npr: 400 },
      ]);

      const settled = await getTab(tab._id);
      expect(settled!.status).toBe("SETTLED");
      expect(settled!.payments).toHaveLength(2);
      expect(settled!.payments![0]).toEqual({ method: "CASH", amount_npr: 600 });
      expect(settled!.payments![1]).toEqual({ method: "ESEWA", amount_npr: 400 });

      const sales = await getDailySales(today);
      expect(sales.cash_total).toBe(600);
      expect(sales.digital_total).toBe(400);
    });

    it("aggregates Khalti alongside eSewa as digital", async () => {
      const today = new Date().toISOString().slice(0, 10);
      const tab = await openTab("Guest Khalti", "room-10");
      const dalBhat = await getMenuItem("Meals", "Dal Bhat"); // 500
      await addItemToTab(tab._id, dalBhat, 1);

      await settleTab(tab._id, [
        { method: "KHALTI", amount_npr: 300 },
        { method: "CASH", amount_npr: 200 },
      ]);

      const sales = await getDailySales(today);
      expect(sales.digital_total).toBe(300);
      expect(sales.cash_total).toBe(200);
    });

    it("records split totals that exceed tab subtotal (with service charge)", async () => {
      const today = new Date().toISOString().slice(0, 10);
      const tab = await openTab("Guest Charge", "room-11");
      const dalBhat = await getMenuItem("Meals", "Dal Bhat"); // 500
      await addItemToTab(tab._id, dalBhat, 1);
      // subtotal 500, service charge 50, total 550 — split 400 cash + 150 eSewa
      await settleTab(tab._id, [
        { method: "CASH", amount_npr: 400 },
        { method: "ESEWA", amount_npr: 150 },
      ]);

      const sales = await getDailySales(today);
      expect(sales.cash_total).toBe(400);
      expect(sales.digital_total).toBe(150);
    });
  });

  // ─── Stock Tracking ───
  describe("Stock tracking on tab operations", () => {
    it("decrements stock when a tracked item is added", async () => {
      const snickers = await getMenuItem("Supplies", "Snickers"); // seed: 15
      const tab = await openTab("Guest S", "room-1");
      await addItemToTab(tab._id, snickers, 3);
      const after = await getMenuItem("Supplies", "Snickers");
      expect(after.current_stock).toBe(12);
    });

    it("does not touch stock for items without track_stock", async () => {
      const dalBhat = await getMenuItem("Meals", "Dal Bhat");
      expect(dalBhat.track_stock).toBe(false);
      const tab = await openTab("Guest D", "room-1");
      await addItemToTab(tab._id, dalBhat, 2);
      const after = await getMenuItem("Meals", "Dal Bhat");
      expect(after.current_stock).toBe(dalBhat.current_stock);
    });

    it("restores stock when a tab item is voided", async () => {
      const snickers = await getMenuItem("Supplies", "Snickers");
      const tab = await openTab("Guest S", "room-1");
      await addItemToTab(tab._id, snickers, 2);
      expect((await getMenuItem("Supplies", "Snickers")).current_stock).toBe(13);
      const itemId = (await getTab(tab._id))!.items[0].id;
      await voidTabItem(tab._id, itemId, "Wrong item");
      expect((await getMenuItem("Supplies", "Snickers")).current_stock).toBe(15);
    });

    it("does not double-restore when void is called twice", async () => {
      const snickers = await getMenuItem("Supplies", "Snickers");
      const tab = await openTab("Guest S", "room-1");
      await addItemToTab(tab._id, snickers, 2);
      const itemId = (await getTab(tab._id))!.items[0].id;
      await voidTabItem(tab._id, itemId, "Wrong");
      await voidTabItem(tab._id, itemId, "Wrong again");
      expect((await getMenuItem("Supplies", "Snickers")).current_stock).toBe(15);
    });

    it("deducts more stock when quantity is increased", async () => {
      const snickers = await getMenuItem("Supplies", "Snickers");
      const tab = await openTab("Guest S", "room-1");
      await addItemToTab(tab._id, snickers, 2); // 15 → 13
      const itemId = (await getTab(tab._id))!.items[0].id;
      await updateItemQuantity(tab._id, itemId, 5); // delta -3, 13 → 10
      expect((await getMenuItem("Supplies", "Snickers")).current_stock).toBe(10);
    });

    it("restores partial stock when quantity is decreased", async () => {
      const snickers = await getMenuItem("Supplies", "Snickers");
      const tab = await openTab("Guest S", "room-1");
      await addItemToTab(tab._id, snickers, 5); // 15 → 10
      const itemId = (await getTab(tab._id))!.items[0].id;
      await updateItemQuantity(tab._id, itemId, 2); // delta +3, 10 → 13
      expect((await getMenuItem("Supplies", "Snickers")).current_stock).toBe(13);
    });

    it("restores full quantity when quantity is set to 0 (auto-void)", async () => {
      const snickers = await getMenuItem("Supplies", "Snickers");
      const tab = await openTab("Guest S", "room-1");
      await addItemToTab(tab._id, snickers, 3); // 15 → 12
      const itemId = (await getTab(tab._id))!.items[0].id;
      await updateItemQuantity(tab._id, itemId, 0); // restore all, 12 → 15
      expect((await getMenuItem("Supplies", "Snickers")).current_stock).toBe(15);
    });
  });

  // ─── Quick-add (top items today) ───
  describe("getTopItemsToday", () => {
    it("ranks items by total non-voided quantity today (desc)", async () => {
      const tab = await openTab("Guest T1", "room-1");
      const dalBhat = await getMenuItem("Meals", "Dal Bhat");
      const milkTea = await getMenuItem("Drinks", "Milk Tea");
      const thukpa = await getMenuItem("Meals", "Thukpa");

      await addItemToTab(tab._id, milkTea, 5);
      await addItemToTab(tab._id, dalBhat, 3);
      await addItemToTab(tab._id, thukpa, 1);

      const top = await getTopItemsToday(5);
      expect(top[0]).toEqual({ menu_item_id: milkTea.id, quantity: 5 });
      expect(top[1]).toEqual({ menu_item_id: dalBhat.id, quantity: 3 });
      expect(top[2]).toEqual({ menu_item_id: thukpa.id, quantity: 1 });
    });

    it("sums quantity across tabs for the same menu item", async () => {
      const tab1 = await openTab("Guest T2", "room-1");
      const tab2 = await openTab("Guest T3", "room-2");
      const milkTea = await getMenuItem("Drinks", "Milk Tea");

      await addItemToTab(tab1._id, milkTea, 2);
      await addItemToTab(tab2._id, milkTea, 3);

      const top = await getTopItemsToday(5);
      expect(top[0]).toEqual({ menu_item_id: milkTea.id, quantity: 5 });
    });

    it("excludes voided items from the ranking", async () => {
      const tab = await openTab("Guest T4", "room-1");
      const milkTea = await getMenuItem("Drinks", "Milk Tea");
      const dalBhat = await getMenuItem("Meals", "Dal Bhat");

      await addItemToTab(tab._id, milkTea, 5);
      await addItemToTab(tab._id, dalBhat, 1);
      const milkTeaItem = (await getTab(tab._id))!.items.find(
        (i) => i.menu_item_id === milkTea.id
      )!;
      await voidTabItem(tab._id, milkTeaItem.id, "wrong");

      const top = await getTopItemsToday(5);
      expect(top[0]).toEqual({ menu_item_id: dalBhat.id, quantity: 1 });
      expect(top.some((t) => t.menu_item_id === milkTea.id)).toBe(false);
    });

    it("respects the limit", async () => {
      const tab = await openTab("Guest T5", "room-1");
      const items = [
        await getMenuItem("Meals", "Dal Bhat"),
        await getMenuItem("Meals", "Thukpa"),
        await getMenuItem("Meals", "Fried Rice"),
        await getMenuItem("Meals", "Pasta"),
        await getMenuItem("Meals", "Momo"),
      ];
      for (const it of items) await addItemToTab(tab._id, it, 1);
      const top = await getTopItemsToday(3);
      expect(top).toHaveLength(3);
    });

    it("returns empty when no tabs exist today", async () => {
      const top = await getTopItemsToday(5);
      expect(top).toEqual([]);
    });

    it("counts items added today even on a tab opened earlier", async () => {
      const tab = await openTab("Multi-Night", "room-9");
      const milkTea = await getMenuItem("Drinks", "Milk Tea");
      await addItemToTab(tab._id, milkTea, 2);

      // Backdate the tab's opened_at to two days ago — simulating a multi-night
      // stay where the tab was opened in a prior session. Items keep today's
      // added_at, so they should still count.
      const { getDoc, putDoc } = await import("@/lib/db");
      const stored = (await getDoc(tab._id))!;
      const twoDaysAgo = new Date(Date.now() - 2 * 86400_000).toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await putDoc({ ...(stored as any), opened_at: twoDaysAgo });

      const top = await getTopItemsToday(5);
      expect(top[0]).toEqual({ menu_item_id: milkTea.id, quantity: 2 });
    });
  });

  // ─── Out-of-stock override ───
  describe("Out-of-stock override", () => {
    it("records sold_oos flag when added with the override", async () => {
      const snickers = await getMenuItem("Supplies", "Snickers");
      const tab = await openTab("Guest OOS", "room-1");
      await addItemToTab(tab._id, snickers, 2, { soldOos: true });
      const fresh = await getTab(tab._id);
      expect(fresh!.items[0].sold_oos).toBe(true);
    });

    it("does not set sold_oos when added normally", async () => {
      const snickers = await getMenuItem("Supplies", "Snickers");
      const tab = await openTab("Guest Normal", "room-1");
      await addItemToTab(tab._id, snickers, 1);
      const fresh = await getTab(tab._id);
      expect(fresh!.items[0].sold_oos).toBeUndefined();
    });

    it("flags sold_oos when quantity increase uses the override", async () => {
      const snickers = await getMenuItem("Supplies", "Snickers");
      const tab = await openTab("Guest Bump", "room-1");
      await addItemToTab(tab._id, snickers, 1);
      const itemId = (await getTab(tab._id))!.items[0].id;
      await updateItemQuantity(tab._id, itemId, 3, { soldOos: true });
      const fresh = await getTab(tab._id);
      expect(fresh!.items[0].quantity).toBe(3);
      expect(fresh!.items[0].sold_oos).toBe(true);
    });

    it("counts sold_oos units in daily sales (excludes voided)", async () => {
      const today = new Date().toISOString().slice(0, 10);
      const snickers = await getMenuItem("Supplies", "Snickers");
      const choc = await getMenuItem("Supplies", "Chocolate Bar");

      const tab1 = await openTab("Guest A", "room-1");
      await addItemToTab(tab1._id, snickers, 2, { soldOos: true });

      const tab2 = await openTab("Guest B", "room-2");
      await addItemToTab(tab2._id, choc, 3, { soldOos: true });
      const chocItemId = (await getTab(tab2._id))!.items[0].id;
      await voidTabItem(tab2._id, chocItemId, "wrong");

      const tab3 = await openTab("Guest C", "room-3");
      await addItemToTab(tab3._id, snickers, 1); // normal — not oos

      const sales = await getDailySales(today);
      expect(sales.sold_oos_units).toBe(2); // only tab1's units, tab2 voided, tab3 not oos
    });
  });
});
