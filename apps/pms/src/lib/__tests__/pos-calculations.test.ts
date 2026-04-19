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
  getTab,
  getOpenTabs,
  getDailySales,
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
      expect(settled!.settlement_method).toBe("CASH");
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
      expect(settled!.settlement_method).toBe("CASH");
    });
  });
});
