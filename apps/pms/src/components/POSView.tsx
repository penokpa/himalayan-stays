import { useEffect, useState, useCallback } from "react";
import type {
  TabDoc,
  MenuCategoryLocal,
  MenuItemLocal,
  RoomStatusDoc,
  RoomSlot,
} from "@himalayan-stays/shared";
import {
  getOpenTabs,
  openTab,
  addItemToTab,
  updateItemQuantity,
  voidTabItem,
  unholdTab,
  getTab,
} from "@/lib/tabs";
import { getMenu, seedMenuIfEmpty } from "@/lib/menu";
import { getRoomStatus } from "@/lib/rooms";
import NewTabModal from "./NewTabModal";
import SettleModal from "./SettleModal";
import MenuSetup from "./MenuSetup";
import StockManager from "./StockManager";
import DailySales from "./DailySales";
import TabSwitcherSheet from "./TabSwitcherSheet";
import OOSConfirmSheet from "./OOSConfirmSheet";

interface OccupiedRoom {
  room_id: string;
  room_name: string;
  guest_name: string;
  hasOpenTab: boolean;
  tabId?: string;
}

type SubView = "pos" | "menu-setup" | "stock" | "daily-report";
type MobilePanel = "menu" | "tab";

export default function POSView() {
  const [subView, setSubView] = useState<SubView>("pos");
  const [tabs, setTabs] = useState<TabDoc[]>([]);
  const [occupiedRooms, setOccupiedRooms] = useState<OccupiedRoom[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabDoc | null>(null);
  const [categories, setCategories] = useState<MenuCategoryLocal[]>([]);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [showNewTab, setShowNewTab] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [oosPrompt, setOosPrompt] = useState<
    | { kind: "add"; menuItem: MenuItemLocal }
    | { kind: "increment"; tabItemId: string; menuItem: MenuItemLocal; newQty: number }
    | null
  >(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("menu");
  const [voidingItem, setVoidingItem] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const load = useCallback(async () => {
    const [openTabs, menu, roomStatus] = await Promise.all([
      getOpenTabs(),
      getMenu(),
      getRoomStatus(),
    ]);
    setTabs(openTabs);
    const cats = (menu?.categories ?? []).filter((c) =>
      c.items.some((i) => i.is_active)
    );
    setCategories(cats);
    if (!activeCatId && cats.length > 0) setActiveCatId(cats[0].id);

    // Build occupied rooms list with their tab status
    if (roomStatus) {
      const rooms: OccupiedRoom[] = roomStatus.rooms
        .filter((r: RoomSlot) => r.status === "OCCUPIED" && r.guest_name)
        .map((r: RoomSlot) => {
          const matchingTab = openTabs.find((t) => t.room_id === r.room_id);
          return {
            room_id: r.room_id,
            room_name: r.room_name,
            guest_name: r.guest_name!,
            hasOpenTab: !!matchingTab,
            tabId: matchingTab?._id,
          };
        });
      setOccupiedRooms(rooms);
    }

    // Refresh active tab if one is selected
    if (activeTabId) {
      const refreshed = await getTab(activeTabId);
      if (refreshed && refreshed.status === "OPEN") {
        setActiveTab(refreshed);
      } else {
        setActiveTabId(null);
        setActiveTab(null);
        setMobilePanel("menu");
      }
    }
  }, [activeTabId, activeCatId]);

  useEffect(() => {
    seedMenuIfEmpty().then(() => load());
  }, []);

  // Reload active tab whenever activeTabId changes
  useEffect(() => {
    if (!activeTabId) {
      setActiveTab(null);
      return;
    }
    getTab(activeTabId).then((t) => setActiveTab(t));
  }, [activeTabId]);

  const handleOpenTab = async (guestName: string, roomId?: string) => {
    const newTab = await openTab(guestName, roomId);
    setShowNewTab(false);
    setActiveTabId(newTab._id);
    setMobilePanel("tab");
    await load();
  };

  const wouldGoNegative = (menuItem: MenuItemLocal, delta: number): boolean =>
    !!menuItem.track_stock &&
    menuItem.current_stock != null &&
    menuItem.current_stock - delta < 0;

  const performAdd = async (menuItem: MenuItemLocal, soldOos: boolean) => {
    if (!activeTabId) return;
    await addItemToTab(activeTabId, menuItem, 1, soldOos ? { soldOos: true } : undefined);
    await load();
  };

  const performQty = async (itemId: string, newQty: number, soldOos: boolean) => {
    if (!activeTabId) return;
    await updateItemQuantity(
      activeTabId,
      itemId,
      newQty,
      soldOos ? { soldOos: true } : undefined
    );
    await load();
  };

  const handleAddItem = async (menuItem: MenuItemLocal) => {
    if (!activeTabId) return;
    if (wouldGoNegative(menuItem, 1)) {
      setOosPrompt({ kind: "add", menuItem });
      return;
    }
    await performAdd(menuItem, false);
  };

  const handleQuantityChange = async (itemId: string, newQty: number) => {
    if (!activeTabId) return;
    const tabItem = activeTab?.items.find((i) => i.id === itemId);
    const menuItem = tabItem
      ? categories
          .flatMap((c) => c.items)
          .find((m) => m.id === tabItem.menu_item_id)
      : undefined;
    const delta = newQty - (tabItem?.quantity ?? 0);
    if (menuItem && delta > 0 && wouldGoNegative(menuItem, delta)) {
      setOosPrompt({ kind: "increment", tabItemId: itemId, menuItem, newQty });
      return;
    }
    await performQty(itemId, newQty, false);
  };

  const handleVoid = async (itemId: string) => {
    if (!activeTabId) return;
    const reason = voidReason.trim() || "Voided";
    await voidTabItem(activeTabId, itemId, reason);
    setVoidingItem(null);
    setVoidReason("");
    await load();
  };

  const confirmOos = async () => {
    if (!oosPrompt) return;
    const prompt = oosPrompt;
    setOosPrompt(null);
    if (prompt.kind === "add") {
      await performAdd(prompt.menuItem, true);
    } else {
      await performQty(prompt.tabItemId, prompt.newQty, true);
    }
  };

  const handleResume = async () => {
    if (!activeTabId) return;
    await unholdTab(activeTabId);
    await load();
  };

  const handleSettled = () => {
    setShowSettle(false);
    setActiveTabId(null);
    setActiveTab(null);
    setMobilePanel("menu");
    load();
  };

  if (subView === "menu-setup") {
    return (
      <MenuSetup
        onBack={() => {
          setSubView("pos");
          load();
        }}
      />
    );
  }

  if (subView === "stock") {
    return (
      <StockManager
        onBack={() => {
          setSubView("pos");
          load();
        }}
      />
    );
  }

  if (subView === "daily-report") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => setSubView("pos")}
            className="min-w-[48px] min-h-[48px] rounded-lg bg-white/10 flex items-center justify-center text-xl"
          >
            {"\u2190"}
          </button>
          <h2 className="text-lg font-bold flex-1">Daily Report</h2>
        </div>
        <DailySales />
      </div>
    );
  }

  const activeCategory = categories.find((c) => c.id === activeCatId);
  const activeItems = activeCategory?.items.filter((i) => i.is_active) ?? [];
  const visibleTabItems = activeTab?.items.filter((i) => !i.voided) ?? [];
  const subtotal = activeTab?.tab_total_npr ?? 0;
  const serviceCharge = Math.round(subtotal * 0.1);
  const total = subtotal + serviceCharge;

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

  // ── Left Panel: Menu ──
  const menuPanel = (
    <div className="w-full flex flex-col h-full">
      {/* Category tabs */}
      <div className="shrink-0 border-b border-white/10">
        <div className="flex overflow-x-auto gap-2 px-3 py-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCatId(cat.id)}
              className={`min-h-[48px] px-5 rounded-lg whitespace-nowrap font-medium text-sm shrink-0 ${
                activeCatId === cat.id
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-white/10 text-white/50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu item grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeItems.length === 0 ? (
          <div className="text-center pt-8 text-white/30">
            <p>No active items in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {activeItems.map((item) => {
              const isOOS =
                !!item.track_stock &&
                item.current_stock != null &&
                item.current_stock <= 0;
              return (
                <button
                  key={item.id}
                  onClick={() => handleAddItem(item)}
                  disabled={!activeTabId}
                  className={`relative bg-[var(--color-surface)] rounded-xl p-3 min-h-[80px] flex flex-col items-center justify-center text-center active:scale-95 active:bg-[var(--color-primary)]/20 transition-all disabled:opacity-40 ${
                    isOOS
                      ? "border border-red-500/40 opacity-70"
                      : "border border-white/10"
                  }`}
                >
                  {isOOS && (
                    <span className="absolute top-1.5 right-1.5 text-[9px] bg-red-500/30 text-red-300 px-1.5 py-0.5 rounded-full font-bold tracking-wider">
                      OUT
                    </span>
                  )}
                  <span className="text-2xl mb-1">{typeIcon(item.item_type)}</span>
                  <span className="font-medium text-sm leading-tight">
                    {item.name}
                  </span>
                  <span className="text-xs text-white/50 mt-1">
                    Rs. {item.price_npr}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Walk-in tab button */}
      <div className="shrink-0 p-3 border-t border-white/10">
        <button
          onClick={() => setShowNewTab(true)}
          className="w-full min-h-[48px] rounded-xl bg-[var(--color-primary)] text-white font-bold text-sm active:scale-[0.98] transition-transform"
        >
          + Walk-in Tab
        </button>
      </div>
    </div>
  );

  // ── Right Panel: Active Tab ──
  const activeRoomName = activeTab?.room_id
    ? occupiedRooms.find((r) => r.room_id === activeTab.room_id)?.room_name
    : undefined;
  const activeIsRoom = !!activeTab?.room_id;

  const activeTabHero = (
    <div className="shrink-0 px-3 py-2.5 border-b border-white/10 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        {activeTab ? (
          <>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-base shrink-0">
                {activeIsRoom ? "\uD83C\uDFE8" : "\uD83D\uDC64"}
              </span>
              <p className="font-bold text-sm truncate">
                {activeIsRoom && activeRoomName
                  ? `Room ${activeRoomName}`
                  : activeTab.guest_name}
              </p>
              {activeTab.notes?.includes("ON HOLD") && (
                <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                  On Hold
                </span>
              )}
            </div>
            <p className="text-xs text-white/50 truncate">
              {activeIsRoom ? activeTab.guest_name : "Walk-in"}
              {subtotal > 0 && (
                <span className="ml-2">
                  {"\u00B7"} Running: Rs. {subtotal.toLocaleString()}
                </span>
              )}
            </p>
          </>
        ) : (
          <p className="text-sm text-white/50">No tab selected</p>
        )}
      </div>
      <button
        onClick={() => setShowSwitcher(true)}
        className="min-h-[44px] px-3 rounded-lg bg-white/10 text-white text-sm font-medium flex items-center gap-1.5 shrink-0 active:bg-white/15"
      >
        <span>Tabs</span>
        {tabs.length > 0 && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-bold flex items-center justify-center">
            {tabs.length}
          </span>
        )}
        <span className="text-xs opacity-60">{"\u25BE"}</span>
      </button>
    </div>
  );

  const tabPanel = (
    <div className="w-full flex flex-col h-full">
      {/* Hero (desktop only \u2014 on mobile it lives above the panel toggle so it's
          visible from both Menu and Order views) */}
      <div className="hidden md:block">{activeTabHero}</div>

      {/* Active tab content */}
      {!activeTab ? (
        <div className="flex-1 flex items-center justify-center text-white/30">
          <div className="text-center px-4">
            <p className="text-4xl mb-3">{"\uD83E\uDDFE"}</p>
            <p className="font-medium">No tab selected</p>
            <p className="text-sm mt-1">Tap Tabs above to pick a room or open one</p>
          </div>
        </div>
      ) : (
        <>
          {/* Resume strip — shown when this tab is on hold */}
          {activeTab.notes?.includes("ON HOLD") && (
            <div className="shrink-0 px-3 py-2 bg-yellow-500/10 border-b border-yellow-500/30 flex items-center gap-3">
              <span className="text-lg">{"⏸️"}</span>
              <p className="flex-1 text-sm font-medium text-yellow-300">
                Tab on hold
              </p>
              <button
                onClick={handleResume}
                className="min-h-[44px] px-4 rounded-lg bg-yellow-500 text-black text-sm font-bold active:scale-95 transition-transform"
              >
                Resume
              </button>
            </div>
          )}

          {/* Order list */}
          <div className="flex-1 overflow-y-auto">
            {visibleTabItems.length === 0 ? (
              <div className="text-center pt-8 text-white/30 text-sm">
                <p>No items yet</p>
                <p className="mt-1">Tap menu items to add</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {visibleTabItems.map((item) => (
                  <div key={item.id}>
                    <div className="px-4 py-2 flex items-center gap-2">
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
                      {/* Item info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.item_name}
                        </p>
                        <p className="text-xs text-white/40">
                          Rs. {item.unit_price_npr} each
                        </p>
                      </div>
                      {/* Line total */}
                      <span className="text-sm font-medium text-white/70 shrink-0">
                        Rs. {item.line_total_npr}
                      </span>
                      {/* Void button */}
                      <button
                        onClick={() =>
                          setVoidingItem(
                            voidingItem === item.id ? null : item.id
                          )
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
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="shrink-0 border-t border-white/10 px-4 py-3 space-y-1">
            <div className="flex justify-between text-sm text-white/60">
              <span>Subtotal</span>
              <span>Rs. {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-white/60">
              <span>Service Charge (10%)</span>
              <span>Rs. {serviceCharge.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-1 border-t border-white/10">
              <span>Total</span>
              <span className="text-green-400">
                Rs. {total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Payment buttons */}
          <div className="shrink-0 p-3 border-t border-white/10 safe-area-pb">
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setShowSettle(true)}
                disabled={subtotal === 0}
                className="min-h-[48px] rounded-xl bg-blue-600 text-white font-bold text-xs flex flex-col items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
              >
                <span className="text-lg">{"\uD83C\uDFE8"}</span>
                Room Tab
              </button>
              <button
                onClick={() => setShowSettle(true)}
                disabled={subtotal === 0}
                className="min-h-[48px] rounded-xl bg-green-600 text-white font-bold text-xs flex flex-col items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
              >
                <span className="text-lg">{"\uD83D\uDCF1"}</span>
                eSewa
              </button>
              <button
                onClick={() => setShowSettle(true)}
                disabled={subtotal === 0}
                className="min-h-[48px] rounded-xl bg-green-600 text-white font-bold text-xs flex flex-col items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
              >
                <span className="text-lg">{"\uD83D\uDCB5"}</span>
                Cash
              </button>
              <button
                onClick={() => setShowSettle(true)}
                disabled={subtotal === 0}
                className="min-h-[48px] rounded-xl bg-yellow-600 text-white font-bold text-xs flex flex-col items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
              >
                <span className="text-lg">{"\u23F8\uFE0F"}</span>
                Hold
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 120px)" }}>
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-2 pb-3">
        <h2 className="text-lg font-bold flex-1">Point of Sale</h2>
        <div className="flex items-center gap-1.5 text-xs text-green-400 mr-2">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          Offline Ready
        </div>
        <button
          onClick={() => setSubView("menu-setup")}
          className="min-h-[40px] px-3 rounded-lg bg-white/10 text-white/70 text-xs font-medium"
        >
          Menu
        </button>
        <button
          onClick={() => setSubView("stock")}
          className="min-h-[40px] px-3 rounded-lg bg-white/10 text-white/70 text-xs font-medium"
        >
          Stock
        </button>
        <button
          onClick={() => setSubView("daily-report")}
          className="min-h-[40px] px-3 rounded-lg bg-white/10 text-white/70 text-xs font-medium"
        >
          Report
        </button>
      </div>

      {/* Desktop: two-column layout / Mobile: toggle */}
      {/* Mobile active-tab context — always visible so Menu view knows the target */}
      <div className="md:hidden shrink-0 mb-2 bg-[var(--color-surface)] rounded-xl border border-white/10 overflow-hidden">
        {activeTabHero}
      </div>

      {/* Mobile toggle (< 768px) */}
      <div className="md:hidden shrink-0 flex mb-2">
        <button
          onClick={() => setMobilePanel("menu")}
          className={`flex-1 min-h-[44px] text-sm font-medium rounded-l-lg ${
            mobilePanel === "menu"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-white/10 text-white/50"
          }`}
        >
          Menu
        </button>
        <button
          onClick={() => setMobilePanel("tab")}
          className={`flex-1 min-h-[44px] text-sm font-medium rounded-r-lg relative ${
            mobilePanel === "tab"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-white/10 text-white/50"
          }`}
        >
          Order
          {visibleTabItems.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {visibleTabItems.length}
            </span>
          )}
        </button>
      </div>

      {/* Main panels */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Desktop: both panels */}
        <div className="hidden md:flex md:w-[60%] bg-[var(--color-surface)] rounded-xl border border-white/10 overflow-hidden">
          {menuPanel}
        </div>
        <div className="hidden md:flex md:w-[40%] bg-[var(--color-surface)] rounded-xl border border-white/10 overflow-y-auto">
          {tabPanel}
        </div>

        {/* Mobile: one panel at a time */}
        <div className="md:hidden flex-1 bg-[var(--color-surface)] rounded-xl border border-white/10 overflow-y-auto">
          {mobilePanel === "menu" ? menuPanel : tabPanel}
        </div>
      </div>

      {/* New tab modal */}
      {showNewTab && (
        <NewTabModal
          onOpen={handleOpenTab}
          onClose={() => setShowNewTab(false)}
        />
      )}

      {/* Settle modal */}
      {showSettle && activeTab && (
        <SettleModal
          total={total}
          subtotal={subtotal}
          serviceCharge={serviceCharge}
          guestName={activeTab.guest_name}
          tabId={activeTab._id}
          onSettled={handleSettled}
          onClose={() => setShowSettle(false)}
        />
      )}

      {/* Out-of-stock confirmation */}
      {oosPrompt && (
        <OOSConfirmSheet
          itemName={oosPrompt.menuItem.name}
          currentStock={oosPrompt.menuItem.current_stock ?? 0}
          onCancel={() => setOosPrompt(null)}
          onConfirm={confirmOos}
        />
      )}

      {/* Tab switcher sheet */}
      {showSwitcher && (
        <TabSwitcherSheet
          occupiedRooms={occupiedRooms}
          tabs={tabs}
          activeTabId={activeTabId}
          onSelect={(tabId) => {
            setActiveTabId(tabId);
            setMobilePanel("tab");
          }}
          onStartForRoom={async (room) => {
            const newTab = await openTab(room.guest_name, room.room_id);
            setActiveTabId(newTab._id);
            setMobilePanel("tab");
            await load();
          }}
          onClose={() => setShowSwitcher(false)}
        />
      )}
    </div>
  );
}
