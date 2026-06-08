// ── CouchDB / PouchDB Document Types (Lodge-Side Offline) ──

export interface CouchDoc {
  _id: string;
  _rev?: string;
}

export interface RoomStatusDoc extends CouchDoc {
  type: "room_status";
  lodge_id: string;
  rooms: RoomSlot[];
  updated_at: string;
}

export interface RoomSlot {
  room_id: string;
  room_name: string;
  status: "VACANT" | "OCCUPIED" | "MAINTENANCE" | "BLOCKED";
  guest_name?: string;
  booking_ref?: string;
  check_in_date?: string;
  expected_checkout?: string;
}

export interface WalkInDoc extends CouchDoc {
  type: "walkin";
  lodge_id: string;
  guest_name: string;
  group_size: number;
  room_id?: string;
  check_in: string;
  expected_checkout?: string;
  nationality?: string;
  phone?: string;
  notes?: string;
  created_at: string;
  synced: boolean;
}

export interface MenuDoc extends CouchDoc {
  type: "menu";
  lodge_id: string;
  categories: MenuCategoryLocal[];
  updated_at: string;
}

export interface MenuCategoryLocal {
  id: string;
  name: string;
  sort_order: number;
  items: MenuItemLocal[];
}

export interface MenuItemLocal {
  id: string;
  name: string;
  name_ne?: string;
  price_npr: number;
  unit: string;
  item_type: "FOOD" | "DRINK" | "SERVICE" | "SUPPLY";
  track_stock: boolean;
  current_stock?: number;
  low_stock_threshold?: number;
  is_active: boolean;
}

export type SettleMethod = "CASH" | "ESEWA" | "KHALTI" | "INCLUDED_IN_BOOKING";

export interface TabPayment {
  method: SettleMethod;
  amount_npr: number;
}

export interface TabDoc extends CouchDoc {
  type: "tab";
  lodge_id: string;
  room_id?: string;
  guest_name: string;
  booking_ref?: string;
  items: TabItemLocal[];
  opened_at: string;
  closed_at?: string;
  status: "OPEN" | "SETTLED" | "VOID";
  tab_total_npr: number;
  payments?: TabPayment[];
  notes?: string;
}

export interface TabItemLocal {
  id: string;
  menu_item_id: string;
  item_name: string;
  quantity: number;
  unit_price_npr: number;
  line_total_npr: number;
  added_at: string;
  voided: boolean;
  void_reason?: string;
  sold_oos?: boolean;
}

export interface StockDoc extends CouchDoc {
  type: "stock";
  lodge_id: string;
  date: string;
  items: StockEntry[];
}

export interface StockEntry {
  menu_item_id: string;
  item_name: string;
  opening_stock: number;
  closing_stock: number;
  used: number;
}

export interface DailyLogDoc extends CouchDoc {
  type: "daily_log";
  lodge_id: string;
  date: string;
  occupancy_count: number;
  total_rooms: number;
  weather?: string;
  trail_conditions?: string;
  notes?: string;
}
