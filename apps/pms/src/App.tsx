import { useState, useEffect } from "react";
import RoomGrid from "./components/RoomGrid";
import POSView from "@/components/POSView";
import DailySales from "@/components/DailySales";
import Settings from "@/components/Settings";
import WalkInsList from "@/components/WalkInsList";
import { seedDemoData } from "@/lib/seed";

type Tab = "rooms" | "pos" | "walkins" | "sales" | "settings";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("rooms");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedDemoData().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]">
        <p className="text-white/50">Setting up lodge...</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Header */}
      <header className="bg-[var(--color-surface)] px-4 py-3 text-center border-b border-white/10">
        <h1 className="text-lg font-bold tracking-wide">Himalayan Stays PMS</h1>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4">
        {activeTab === "rooms" && <RoomGrid />}
        {activeTab === "pos" && <POSView />}
        {activeTab === "walkins" && <WalkInsList />}
        {activeTab === "sales" && <DailySales />}
        {activeTab === "settings" && <Settings />}
      </main>

      {/* Bottom navigation — big tap targets for altitude/glove use */}
      <nav className="bg-[var(--color-surface)] border-t border-white/10 safe-area-pb">
        <div className="flex">
          <NavButton
            label="Rooms"
            icon={"🏠"}
            active={activeTab === "rooms"}
            onClick={() => setActiveTab("rooms")}
          />
          <NavButton
            label="POS"
            icon={"🧾"}
            active={activeTab === "pos"}
            onClick={() => setActiveTab("pos")}
          />
          <NavButton
            label="Walk-ins"
            icon={"🚶"}
            active={activeTab === "walkins"}
            onClick={() => setActiveTab("walkins")}
          />
          <NavButton
            label="Sales"
            icon={"📈"}
            active={activeTab === "sales"}
            onClick={() => setActiveTab("sales")}
          />
          <NavButton
            label="Settings"
            icon={"⚙️"}
            active={activeTab === "settings"}
            onClick={() => setActiveTab("settings")}
          />
        </div>
      </nav>
    </div>
  );
}

function NavButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center min-h-14 min-w-12 py-2 transition-colors ${
        active
          ? "text-[var(--color-primary)] border-t-2 border-[var(--color-primary)]"
          : "text-white/40 border-t-2 border-transparent"
      }`}
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="text-xs mt-1 font-medium">{label}</span>
    </button>
  );
}
