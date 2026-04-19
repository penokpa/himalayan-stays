import { useEffect, useState, useCallback } from "react";
import { getSettings, saveSettings, type AppSettings } from "@/lib/settings";
import { getAllDocs } from "@/lib/db";

type Section = "lodge" | "pos" | "sync" | "data" | "about" | null;

const TREK_ROUTES = [
  { value: "EBC", label: "Everest Base Camp" },
  { value: "ABC", label: "Annapurna Base Camp" },
  { value: "LANGTANG", label: "Langtang" },
  { value: "MANASLU", label: "Manaslu" },
  { value: "UPPER_MUSTANG", label: "Upper Mustang" },
];

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [section, setSection] = useState<Section>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [storageInfo, setStorageInfo] = useState({ docs: 0, sizeKB: 0 });
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  const load = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
    const docs = await getAllDocs();
    const size = new Blob([JSON.stringify(docs)]).size;
    setStorageInfo({ docs: docs.length, sizeKB: Math.round(size / 1024) });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = (field: keyof AppSettings, value: string | number | boolean) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    await saveSettings(settings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = async () => {
    const docs = await getAllDocs();
    const json = JSON.stringify(docs, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pms-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearData = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    const { indexedDB } = window;
    indexedDB.deleteDatabase("hs-pms-local");
    setCleared(true);
    setConfirmClear(false);
  };

  if (!settings) {
    return (
      <div className="text-center pt-20 text-white/40">Loading settings...</div>
    );
  }

  if (cleared) {
    return (
      <div className="text-center pt-20 space-y-4">
        <p className="text-4xl">{"\u2705"}</p>
        <p className="text-lg font-bold">Data Cleared</p>
        <p className="text-white/50 text-sm">Refresh the page to start fresh</p>
        <button
          onClick={() => window.location.reload()}
          className="min-h-[48px] px-6 rounded-lg bg-[var(--color-primary)] text-white font-bold"
        >
          Reload App
        </button>
      </div>
    );
  }

  // ── Section detail views ──
  if (section === "lodge") {
    return (
      <SectionPage title="Lodge Profile" onBack={() => setSection(null)}>
        <Field label="Lodge Name">
          <input
            type="text"
            value={settings.lodge_name}
            onChange={(e) => update("lodge_name", e.target.value)}
            className="input-field"
            placeholder="e.g. Namche Guest House"
          />
        </Field>
        <Field label="Owner / Manager Name">
          <input
            type="text"
            value={settings.lodge_owner}
            onChange={(e) => update("lodge_owner", e.target.value)}
            className="input-field"
            placeholder="e.g. Pemba Sherpa"
          />
        </Field>
        <Field label="Village">
          <input
            type="text"
            value={settings.lodge_village}
            onChange={(e) => update("lodge_village", e.target.value)}
            className="input-field"
            placeholder="e.g. Namche Bazaar"
          />
        </Field>
        <Field label="District">
          <input
            type="text"
            value={settings.lodge_district}
            onChange={(e) => update("lodge_district", e.target.value)}
            className="input-field"
            placeholder="e.g. Solukhumbu"
          />
        </Field>
        <Field label="Trek Route">
          <select
            value={settings.trek_route}
            onChange={(e) => update("trek_route", e.target.value)}
            className="input-field"
          >
            {TREK_ROUTES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <SaveButton saving={saving} saved={saved} onSave={handleSave} />
      </SectionPage>
    );
  }

  if (section === "pos") {
    return (
      <SectionPage title="POS Settings" onBack={() => setSection(null)}>
        <Field label="Service Charge (%)">
          <input
            type="number"
            min={0}
            max={30}
            step={0.5}
            value={settings.service_charge_pct}
            onChange={(e) =>
              update("service_charge_pct", parseFloat(e.target.value) || 0)
            }
            className="input-field"
          />
          <p className="text-xs text-white/30 mt-1">
            Applied to all POS tabs at settlement
          </p>
        </Field>
        <Field label="Tax (%)">
          <input
            type="number"
            min={0}
            max={25}
            step={0.5}
            value={settings.tax_pct}
            onChange={(e) =>
              update("tax_pct", parseFloat(e.target.value) || 0)
            }
            className="input-field"
          />
          <p className="text-xs text-white/30 mt-1">
            Government tax if applicable (0 to disable)
          </p>
        </Field>
        <Field label="Currency">
          <select
            value={settings.currency}
            onChange={(e) => update("currency", e.target.value)}
            className="input-field"
          >
            <option value="NPR">NPR (Nepali Rupee)</option>
            <option value="USD">USD (US Dollar)</option>
          </select>
        </Field>
        <Field label="Receipt Footer">
          <textarea
            value={settings.receipt_footer}
            onChange={(e) => update("receipt_footer", e.target.value)}
            className="input-field min-h-[80px] resize-none"
            placeholder="Printed at bottom of receipts"
          />
        </Field>
        <ToggleField
          label="Low Stock Alerts"
          description="Notify when supply items run low"
          value={settings.low_stock_alerts}
          onChange={(v) => update("low_stock_alerts", v)}
        />
        <SaveButton saving={saving} saved={saved} onSave={handleSave} />
      </SectionPage>
    );
  }

  if (section === "sync") {
    return (
      <SectionPage title="Sync & Connectivity" onBack={() => setSection(null)}>
        <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-white/10 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                settings.sync_server_url ? "bg-yellow-400" : "bg-gray-500"
              }`}
            />
            <div>
              <p className="font-medium text-sm">
                {settings.sync_server_url
                  ? "Sync Configured (Not Connected)"
                  : "Not Configured"}
              </p>
              <p className="text-xs text-white/40">
                {settings.last_sync_at
                  ? `Last sync: ${new Date(settings.last_sync_at).toLocaleString()}`
                  : "Never synced"}
              </p>
            </div>
          </div>
        </div>

        <Field label="Sync Server URL">
          <input
            type="url"
            value={settings.sync_server_url}
            onChange={(e) => update("sync_server_url", e.target.value)}
            className="input-field"
            placeholder="https://sync.himalayanstays.com"
          />
          <p className="text-xs text-white/30 mt-1">
            CouchDB server address provided by Himalayan Stays
          </p>
        </Field>
        <Field label="Device API Key">
          <input
            type="password"
            value={settings.sync_api_key}
            onChange={(e) => update("sync_api_key", e.target.value)}
            className="input-field"
            placeholder="Paste your device API key"
          />
          <p className="text-xs text-white/30 mt-1">
            Issued when your lodge is registered on the platform
          </p>
        </Field>
        <ToggleField
          label="Auto Sync"
          description="Sync automatically when internet is available"
          value={settings.auto_sync}
          onChange={(v) => update("auto_sync", v)}
        />
        <SaveButton saving={saving} saved={saved} onSave={handleSave} />

        <button
          disabled={!settings.sync_server_url}
          className="w-full min-h-[48px] mt-2 rounded-xl border border-white/20 text-white/60 font-medium disabled:opacity-30"
        >
          Test Connection
        </button>
        <button
          disabled={!settings.sync_server_url}
          className="w-full min-h-[48px] mt-2 rounded-xl border border-[var(--color-primary)] text-[var(--color-primary)] font-medium disabled:opacity-30"
        >
          Sync Now
        </button>
      </SectionPage>
    );
  }

  if (section === "data") {
    return (
      <SectionPage title="Data Management" onBack={() => setSection(null)}>
        <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-white/10 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Local Storage</p>
              <p className="text-xs text-white/40">
                {storageInfo.docs} documents
              </p>
            </div>
            <p className="text-lg font-bold text-white/70">
              {storageInfo.sizeKB < 1024
                ? `${storageInfo.sizeKB} KB`
                : `${(storageInfo.sizeKB / 1024).toFixed(1)} MB`}
            </p>
          </div>
        </div>

        <button
          onClick={handleExport}
          className="w-full min-h-[56px] rounded-xl bg-[var(--color-surface)] border border-white/10 text-white font-medium flex items-center justify-center gap-3 active:scale-[0.98] transition-transform mb-3"
        >
          <span className="text-xl">{"\uD83D\uDCE5"}</span>
          Export Backup (JSON)
        </button>

        <div className="mt-8 pt-4 border-t border-white/10">
          <h3 className="text-red-400 font-bold text-sm mb-2 uppercase tracking-wide">
            Danger Zone
          </h3>
          <p className="text-xs text-white/40 mb-3">
            This permanently deletes all local data including rooms, tabs, menu,
            and settings. Data that has been synced to the server is not affected.
          </p>
          <button
            onClick={handleClearData}
            className={`w-full min-h-[56px] rounded-xl font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform ${
              confirmClear ? "bg-red-700" : "bg-red-600/80"
            }`}
          >
            <span className="text-xl">{"\uD83D\uDDD1\uFE0F"}</span>
            {confirmClear ? "Tap Again to Confirm Delete" : "Clear All Data"}
          </button>
          {confirmClear && (
            <button
              onClick={() => setConfirmClear(false)}
              className="w-full min-h-[48px] mt-2 rounded-xl bg-white/10 text-white/60 font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </SectionPage>
    );
  }

  if (section === "about") {
    return (
      <SectionPage title="About" onBack={() => setSection(null)}>
        <div className="text-center py-6">
          <p className="text-4xl mb-3">{"\uD83C\uDFD4\uFE0F"}</p>
          <h2 className="text-xl font-bold">Himalayan Stays PMS</h2>
          <p className="text-white/50 text-sm mt-1">v0.1.0 (Phase 1)</p>
        </div>

        <div className="bg-[var(--color-surface)] rounded-xl border border-white/10 divide-y divide-white/5">
          <InfoRow label="Platform" value="Offline-First PWA" />
          <InfoRow label="Storage" value="IndexedDB (Local)" />
          <InfoRow label="Sync" value="CouchDB (When Available)" />
          <InfoRow label="Built For" value="Nepal Teahouse Treks" />
        </div>

        <div className="bg-[var(--color-surface)] rounded-xl border border-white/10 divide-y divide-white/5 mt-4">
          <InfoRow label="Documents" value={`${storageInfo.docs}`} />
          <InfoRow
            label="Storage Used"
            value={
              storageInfo.sizeKB < 1024
                ? `${storageInfo.sizeKB} KB`
                : `${(storageInfo.sizeKB / 1024).toFixed(1)} MB`
            }
          />
          <InfoRow
            label="Last Updated"
            value={new Date(settings.updated_at).toLocaleDateString()}
          />
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          Built for cold hands at high altitude
        </p>
      </SectionPage>
    );
  }

  // ── Main settings menu ──
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold mb-4">Settings</h2>

      {/* Lodge name header */}
      <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-white/10 mb-2">
        <p className="text-lg font-bold">{settings.lodge_name}</p>
        <p className="text-sm text-white/40">
          {[settings.lodge_village, settings.lodge_district]
            .filter(Boolean)
            .join(", ") || "Location not set"}
        </p>
      </div>

      <MenuItem
        icon={"\uD83C\uDFE8"}
        title="Lodge Profile"
        subtitle="Name, location, trek route"
        onClick={() => setSection("lodge")}
      />
      <MenuItem
        icon={"\uD83E\uDDFE"}
        title="POS Settings"
        subtitle={`${settings.service_charge_pct}% service charge, ${settings.currency}`}
        onClick={() => setSection("pos")}
      />
      <MenuItem
        icon={"\uD83D\uDD04"}
        title="Sync & Connectivity"
        subtitle={
          settings.sync_server_url
            ? settings.last_sync_at
              ? `Last: ${new Date(settings.last_sync_at).toLocaleDateString()}`
              : "Configured, never synced"
            : "Not configured"
        }
        onClick={() => setSection("sync")}
      />
      <MenuItem
        icon={"\uD83D\uDCBE"}
        title="Data Management"
        subtitle={`${storageInfo.docs} docs, ${storageInfo.sizeKB} KB`}
        onClick={() => setSection("data")}
      />
      <MenuItem
        icon={"\u2139\uFE0F"}
        title="About"
        subtitle="v0.1.0 — Himalayan Stays PMS"
        onClick={() => setSection("about")}
      />
    </div>
  );
}

// ── Reusable sub-components ──

function SectionPage({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onBack}
          className="min-w-[48px] min-h-[48px] rounded-lg bg-white/10 flex items-center justify-center text-xl"
        >
          {"\u2190"}
        </button>
        <h2 className="text-lg font-bold flex-1">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm text-white/50 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ToggleField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between py-3 mb-4"
    >
      <div className="text-left">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-white/40">{description}</p>
      </div>
      <div
        className={`w-12 h-7 rounded-full relative transition-colors ${
          value ? "bg-[var(--color-primary)]" : "bg-white/20"
        }`}
      >
        <div
          className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}

function SaveButton({
  saving,
  saved,
  onSave,
}: {
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <button
      onClick={onSave}
      disabled={saving}
      className={`w-full min-h-[48px] rounded-xl font-bold text-white text-base active:scale-[0.98] transition-all disabled:opacity-60 ${
        saved
          ? "bg-green-600"
          : "bg-[var(--color-primary)]"
      }`}
    >
      {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
    </button>
  );
}

function MenuItem({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-[var(--color-surface)] rounded-xl p-4 border border-white/10 flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
    >
      <span className="text-2xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-base">{title}</p>
        <p className="text-xs text-white/40 truncate">{subtitle}</p>
      </div>
      <span className="text-white/20 text-sm shrink-0">{"\u25B6"}</span>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <span className="text-sm text-white/50">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
