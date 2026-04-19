// ── Trek Routes ──
export enum TrekRoute {
  EBC = "EBC",
  ABC = "ABC",
  LANGTANG = "LANGTANG",
  MANASLU = "MANASLU",
  UPPER_MUSTANG = "UPPER_MUSTANG",
}

// ── User & Auth ──
export enum UserRole {
  TREKKER = "TREKKER",
  LODGE_OWNER = "LODGE_OWNER",
  AGENCY = "AGENCY",
  ADMIN = "ADMIN",
}

// ── Lodge ──
export enum ManagedBy {
  OWNER = "OWNER",
  PLATFORM = "PLATFORM",
  HYBRID = "HYBRID",
}

// ── Rooms ──
export enum RoomType {
  PRIVATE_SINGLE = "PRIVATE_SINGLE",
  PRIVATE_DOUBLE = "PRIVATE_DOUBLE",
  PRIVATE_TWIN = "PRIVATE_TWIN",
  DORM = "DORM",
}

export enum Season {
  PEAK = "PEAK",
  SHOULDER = "SHOULDER",
  OFF = "OFF",
  FESTIVAL = "FESTIVAL",
}

// ── Bookings ──
export enum BookingType {
  INDIVIDUAL = "INDIVIDUAL",
  AGENCY = "AGENCY",
  WALKIN = "WALKIN",
  AGGREGATOR = "AGGREGATOR",
}

export enum BookingStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CHECKED_IN = "CHECKED_IN",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  NO_SHOW = "NO_SHOW",
}

export enum PaymentMethod {
  ESEWA = "ESEWA",
  KHALTI = "KHALTI",
  STRIPE = "STRIPE",
  BANK_TRANSFER = "BANK_TRANSFER",
  CASH = "CASH",
}

export enum PaymentStatus {
  INITIATED = "INITIATED",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

// ── POS ──
export enum ItemType {
  FOOD = "FOOD",
  DRINK = "DRINK",
  SERVICE = "SERVICE",
  SUPPLY = "SUPPLY",
}

export enum TabStatus {
  OPEN = "OPEN",
  SETTLED = "SETTLED",
  VOID = "VOID",
}

export enum SettlementMethod {
  CASH = "CASH",
  ESEWA = "ESEWA",
  KHALTI = "KHALTI",
  INCLUDED_IN_BOOKING = "INCLUDED_IN_BOOKING",
}
