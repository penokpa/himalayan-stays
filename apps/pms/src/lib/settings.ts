import { getDoc, putDoc } from "@/lib/db";

const SETTINGS_ID = "settings:app";

export interface AppSettings {
  _id: string;
  type: "settings";
  lodge_name: string;
  lodge_owner: string;
  lodge_village: string;
  lodge_district: string;
  trek_route: string;
  service_charge_pct: number;
  currency: string;
  tax_pct: number;
  sync_server_url: string;
  sync_api_key: string;
  auto_sync: boolean;
  last_sync_at: string | null;
  receipt_footer: string;
  low_stock_alerts: boolean;
  updated_at: string;
}

const DEFAULTS: AppSettings = {
  _id: SETTINGS_ID,
  type: "settings",
  lodge_name: "My Lodge",
  lodge_owner: "",
  lodge_village: "",
  lodge_district: "",
  trek_route: "EBC",
  service_charge_pct: 10,
  currency: "NPR",
  tax_pct: 0,
  sync_server_url: "",
  sync_api_key: "",
  auto_sync: false,
  last_sync_at: null,
  receipt_footer: "Thank you for staying with us!",
  low_stock_alerts: true,
  updated_at: new Date().toISOString(),
};

export async function getSettings(): Promise<AppSettings> {
  const doc = await getDoc<AppSettings>(SETTINGS_ID);
  if (!doc) return { ...DEFAULTS };
  return { ...DEFAULTS, ...doc };
}

export async function saveSettings(
  updates: Partial<AppSettings>
): Promise<AppSettings> {
  const current = await getSettings();
  const merged: AppSettings = {
    ...current,
    ...updates,
    _id: SETTINGS_ID,
    type: "settings",
    updated_at: new Date().toISOString(),
  };
  await putDoc(merged);
  return merged;
}
