import { useMemo, useState } from "react";
import type { TabDoc } from "@himalayan-stays/shared";

interface OccupiedRoom {
  room_id: string;
  room_name: string;
  guest_name: string;
  hasOpenTab: boolean;
  tabId?: string;
}

interface Props {
  occupiedRooms: OccupiedRoom[];
  tabs: TabDoc[];
  activeTabId: string | null;
  onSelect: (tabId: string) => void;
  onStartForRoom: (room: OccupiedRoom) => void;
  onClose: () => void;
}

export default function TabSwitcherSheet({
  occupiedRooms,
  tabs,
  activeTabId,
  onSelect,
  onStartForRoom,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");

  const tabsById = useMemo(() => {
    const m = new Map<string, TabDoc>();
    tabs.forEach((t) => m.set(t._id, t));
    return m;
  }, [tabs]);

  const q = query.trim().toLowerCase();
  const matches = (text: string) => !q || text.toLowerCase().includes(q);

  const filteredRooms = occupiedRooms.filter(
    (r) => matches(r.room_name) || matches(r.guest_name)
  );
  const filteredWalkIns = tabs.filter(
    (t) => !t.room_id && matches(t.guest_name)
  );

  const activeRoom = filteredRooms.find((r) => r.tabId === activeTabId);
  const activeWalkIn = filteredWalkIns.find((t) => t._id === activeTabId);

  const openRoomTabs = filteredRooms.filter(
    (r) => r.hasOpenTab && r.tabId !== activeTabId
  );
  const noTabRooms = filteredRooms.filter((r) => !r.hasOpenTab);
  const otherWalkIns = filteredWalkIns.filter((t) => t._id !== activeTabId);

  const isEmpty =
    !activeRoom &&
    !activeWalkIn &&
    openRoomTabs.length === 0 &&
    noTabRooms.length === 0 &&
    otherWalkIns.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-surface)] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[85dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Switch Tab</h2>
            <button
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] rounded-lg bg-white/10 text-white/60 text-sm"
              aria-label="Close"
            >
              {"✕"}
            </button>
          </div>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search room or guest…"
            className="w-full min-h-[44px] px-4 rounded-lg bg-white/10 text-[var(--color-text)] placeholder-white/30 border border-white/10 focus:border-[var(--color-primary)] outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {(activeRoom || activeWalkIn) && (
            <Section title="Active">
              {activeRoom && (
                <Row
                  icon={"🏨"}
                  primary={`Room ${activeRoom.room_name}`}
                  secondary={activeRoom.guest_name}
                  total={tabsById.get(activeRoom.tabId!)?.tab_total_npr}
                  selected
                  onClick={onClose}
                />
              )}
              {activeWalkIn && (
                <Row
                  icon={"👤"}
                  primary={activeWalkIn.guest_name}
                  secondary="Walk-in"
                  total={activeWalkIn.tab_total_npr}
                  selected
                  onClick={onClose}
                />
              )}
            </Section>
          )}

          {openRoomTabs.length > 0 && (
            <Section title={`Open Tabs (${openRoomTabs.length})`}>
              {openRoomTabs.map((r) => (
                <Row
                  key={r.room_id}
                  icon={"🏨"}
                  primary={`Room ${r.room_name}`}
                  secondary={r.guest_name}
                  total={tabsById.get(r.tabId!)?.tab_total_npr}
                  onClick={() => {
                    onSelect(r.tabId!);
                    onClose();
                  }}
                />
              ))}
            </Section>
          )}

          {noTabRooms.length > 0 && (
            <Section title={`No Tab Yet (${noTabRooms.length})`}>
              {noTabRooms.map((r) => (
                <Row
                  key={r.room_id}
                  icon={"🏨"}
                  primary={`Room ${r.room_name}`}
                  secondary={r.guest_name}
                  cta="+ Start"
                  onClick={() => {
                    onStartForRoom(r);
                    onClose();
                  }}
                />
              ))}
            </Section>
          )}

          {otherWalkIns.length > 0 && (
            <Section title={`Walk-ins (${otherWalkIns.length})`}>
              {otherWalkIns.map((t) => (
                <Row
                  key={t._id}
                  icon={"👤"}
                  primary={t.guest_name}
                  secondary="Walk-in"
                  total={t.tab_total_npr}
                  onClick={() => {
                    onSelect(t._id);
                    onClose();
                  }}
                />
              ))}
            </Section>
          )}

          {isEmpty && (
            <p className="text-center text-white/30 py-8 text-sm">
              {q ? "No matches" : "No open tabs or occupied rooms"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2">
      <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-white/40 font-bold">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({
  icon,
  primary,
  secondary,
  total,
  cta,
  selected,
  onClick,
}: {
  icon: string;
  primary: string;
  secondary: string;
  total?: number;
  cta?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full min-h-[56px] px-3 rounded-lg flex items-center gap-3 active:bg-white/5 ${
        selected ? "bg-[var(--color-primary)]/15" : ""
      }`}
    >
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0 text-left">
        <p className="font-medium text-sm truncate">{primary}</p>
        <p className="text-xs text-white/50 truncate">{secondary}</p>
      </div>
      {total != null ? (
        <span className="text-sm font-medium text-white/70 shrink-0">
          Rs. {total}
        </span>
      ) : cta ? (
        <span className="text-xs font-bold text-[var(--color-primary)] shrink-0">
          {cta}
        </span>
      ) : null}
      {selected && (
        <span className="text-[var(--color-primary)] ml-1 shrink-0">
          {"✓"}
        </span>
      )}
    </button>
  );
}
