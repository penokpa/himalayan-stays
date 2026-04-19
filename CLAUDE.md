# Himalayan Stays — Project Context

## What Is This?
A hybrid PMS (Property Management System), POS (Point of Sale), and multi-lodge itinerary booking platform for Nepal's teahouse trekking ecosystem. Initial focus: Everest Base Camp (EBC) route.

## Three User Surfaces

### 1. Lodge-Side PWA (PMS + POS) — Offline-First
- **Who**: Teahouse/lodge owners along trek routes
- **What**: Manage rooms, check in guests, run food/drink/service tabs, settle bills at checkout
- **Key constraint**: Must work fully offline (PouchDB), syncs to CouchDB when internet available
- **Device**: Phone-first (lodge owners have phones, not tablets)
- **Management model**: Hybrid — lodge owners self-manage OR Himalayan Stays manages on their behalf

### 2. Booking Platform (Next.js Web App)
- **Who**: Individual trekkers, trekking agencies, travel aggregators
- **Core feature**: Multi-lodge itinerary booking — book Namche → Tengboche → Gorak Shep in one flow
- **Supports**: Curated itinerary templates + custom itinerary builder
- **Payments**: eSewa, Khalti (Nepal), Stripe (international)

### 3. Admin Panel
- **Who**: Himalayan Stays internal team
- **What**: Lodge onboarding, booking oversight, analytics, sync health monitoring

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Booking Frontend | Next.js 15 (App Router) |
| PMS/POS Frontend | React PWA + PouchDB (offline-first) |
| Booking Database | PostgreSQL via Supabase |
| PMS/POS Database | CouchDB + PouchDB (offline sync) |
| Sync Bridge | Custom Node.js service (CouchDB ↔ PostgreSQL) |
| ORM | Prisma 7 (PostgreSQL side) |
| Auth | NextAuth v5 (multi-role: trekker, lodge_owner, agency, admin) |
| Payments | eSewa + Khalti + Stripe |
| File Storage | Supabase Storage |
| Hosting | Vercel (Next.js) + Railway or Fly.io (CouchDB) |
| Maps | Leaflet + OpenStreetMap |

## Data Model — PostgreSQL (Supabase)

### Core Entities

**Lodge**: id, name, slug, description, altitude_meters, latitude, longitude, trek_route (enum: EBC/ABC/LANGTANG/...), trail_position (order on route), village, district, owner_id → User, managed_by (enum: OWNER/PLATFORM/HYBRID), amenities (jsonb), photos (text[]), is_active

**Room**: id, lodge_id → Lodge, name, room_type (enum: PRIVATE_SINGLE/PRIVATE_DOUBLE/PRIVATE_TWIN/DORM), capacity, base_price_npr, base_price_usd, amenities (jsonb), floor, is_active

**SeasonPricing**: id, room_id → Room, season (enum: PEAK/SHOULDER/OFF/FESTIVAL), start_date, end_date, price_npr, price_usd, min_stay_nights

**User**: id, email, phone, name, role (enum: TREKKER/LODGE_OWNER/AGENCY/ADMIN), nationality, passport_number, profile_photo

**Agency**: id, name, license_number, contact_email, contact_phone, commission_rate, user_id → User, is_verified

### Itinerary & Booking

**Itinerary**: id, name, trek_route, total_days, created_by → User (nullable), is_template (boolean), description

**ItineraryStop**: id, itinerary_id → Itinerary, lodge_id → Lodge, day_number, nights, notes

**Booking**: id, booking_ref (human-readable: HS-YYYYMMDD-XXXX), itinerary_id → Itinerary (nullable for single-lodge), booked_by → User, booking_type (enum: INDIVIDUAL/AGENCY/WALKIN/AGGREGATOR), agency_id → Agency (nullable), status (enum: PENDING/CONFIRMED/CHECKED_IN/COMPLETED/CANCELLED/NO_SHOW), total_price_npr, total_price_usd, currency_used, payment_status, group_size, special_requests

**BookingLeg**: id, booking_id → Booking, lodge_id → Lodge, room_id → Room, check_in_date, check_out_date, night_count, price_per_night, leg_total, status, day_number

**Payment**: id, booking_id → Booking, method (enum: ESEWA/KHALTI/STRIPE/BANK_TRANSFER/CASH), amount, currency, provider_txn_id, status (enum: INITIATED/COMPLETED/FAILED/REFUNDED), paid_at

### POS

**MenuCategory**: id, lodge_id → Lodge, name (Food/Drinks/Services/Supplies), sort_order, is_active

**MenuItem**: id, category_id → MenuCategory, lodge_id → Lodge, name, name_ne (Nepali), price_npr, unit (plate/cup/use/hour/piece), item_type (enum: FOOD/DRINK/SERVICE/SUPPLY), track_stock (boolean), current_stock (nullable), low_stock_threshold (nullable), is_active, sort_order

**GuestTab**: id, lodge_id → Lodge, guest_name, room_id → Room (nullable), booking_leg_id → BookingLeg (nullable), walkin_id (nullable), opened_at, closed_at (nullable), status (enum: OPEN/SETTLED/VOID), tab_total_npr, settlement_method (enum: CASH/ESEWA/KHALTI/INCLUDED_IN_BOOKING), notes

**TabItem**: id, tab_id → GuestTab, menu_item_id → MenuItem, item_name (denormalized), quantity, unit_price_npr, line_total_npr, added_at, added_by, voided (boolean), void_reason (nullable)

**DailySalesSummary**: id, lodge_id → Lodge, date, total_revenue_npr, food_total, drink_total, service_total, supply_total, room_total, cash_total, digital_total, tabs_opened, tabs_settled

**Review**: id, booking_leg_id → BookingLeg, user_id → User, lodge_id → Lodge, rating (1-5), comment, photos (text[])

## Data Model — CouchDB (Lodge-Side Offline)

Key document types stored in PouchDB (client) syncing to CouchDB (server):

- **room_status:{lodge_id}** — Room grid state (status, current guest, booking ref per room)
- **walkin:{lodge_id}:{timestamp}** — Walk-in guest records created offline
- **menu:{lodge_id}** — Menu categories + items with prices (synced rarely)
- **tab:{lodge_id}:{room_id}:{date}** — Guest tab with items array (the core POS doc)
- **stock:{lodge_id}:{date}** — Supply inventory snapshot
- **daily_log:{lodge_id}:{date}** — Occupancy, weather, trail conditions

## Key Flows

### POS Flow (Lodge Owner)
Check guest in → Tab auto-opens (linked to room) → Add food/drinks/services throughout stay → Guest checks out → Bill summary (room + all POS items) → Settle (cash/eSewa/Khalti or "prepaid" for online bookings) → Tab closes → Room freed

### Multi-Lodge Booking Flow (Trekker)
Choose trek route → Select/customize itinerary → Choose lodge + room per stop → Traveler details → Review full itinerary pricing → Pay (eSewa/Khalti/Stripe) → Confirmation + downloadable itinerary PDF

## POS UX Requirements
- Big tap targets (48px+) — cold hands, gloves
- High contrast / dark mode — low light at altitude
- No precision gestures — simple taps only
- Icons + colors over text — varying literacy levels
- Phone-first layout
- Everything works offline
- Minimal animations — preserve battery

## Sync Architecture
- PouchDB (client) ↔ CouchDB (server): continuous replication when online
- Sync Bridge (Node.js): CouchDB ↔ PostgreSQL for availability and booking data
- Conflict resolution: platform booking wins over walk-in for double-booking, last-write-wins for room status
- Walk-in bookings sync to PostgreSQL; online bookings push to CouchDB for lodge PMS

## Phase 1 Scope (Current)
Core data model, auth, PMS room management, basic POS (menu setup, guest tabs, add items, settlement, daily sales summary), and single-lodge booking flow. The "replace the paper ledger" milestone.

## Project Structure Guidance
- Monorepo preferred (booking platform + PMS/POS PWA + sync bridge)
- Shared types between Next.js and PMS PWA
- Prisma schema for PostgreSQL side
- CouchDB document types as TypeScript interfaces
