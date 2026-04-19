# Himalayan Stays

A hybrid PMS (Property Management System), POS (Point of Sale), and multi-lodge itinerary booking platform for Nepal's teahouse trekking ecosystem. Built for the Everest Base Camp route, expanding to all major trek routes.

## What This Does

### For Trekkers
- Browse lodges along trek routes, grouped by village
- Book multi-lodge itineraries in one flow (e.g., Lukla → Namche → Tengboche → Gorak Shep)
- Pay online via Stripe, eSewa, or pay at the lodge
- Download booking confirmation for offline use on the trail

### For Lodge Owners
- Manage rooms, check-in/check-out guests
- Run food, drink, and service tabs (POS)
- Track daily sales by category and payment method
- Manage menu items and stock levels
- Works fully offline — no internet needed

### For Admins
- Lodge onboarding and management
- Booking oversight with status filtering
- Revenue analytics across all lodges

## Project Structure

```
himalayan-stays/
├── apps/
│   ├── booking/          # Next.js 15 — Booking platform + Admin panel
│   └── pms/              # React PWA — Lodge-side PMS/POS (offline-first)
├── packages/
│   └── shared/           # Prisma schema, TypeScript types, seed data
├── docs/
│   └── business-plan.md  # Business model and go-to-market strategy
└── vercel.json           # Deployment config
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Booking Frontend | Next.js 15 (App Router, Turbopack) |
| PMS/POS Frontend | React 19 + Vite (PWA, offline-first) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Auth | NextAuth v5 |
| Payments | Stripe, eSewa, Khalti |
| PMS Storage | IndexedDB (offline-first) |
| Styling | Tailwind CSS v4 |
| Hosting | Vercel |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database (or Supabase account)

### Setup

```bash
# Clone the repo
git clone https://github.com/penokpa/himalayan-stays.git
cd himalayan-stays

# Install dependencies
pnpm install

# Set up environment variables
cp apps/booking/.env.example apps/booking/.env
# Edit .env with your database URL and API keys

# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Seed the database (12 EBC lodges, test users, template itinerary)
cd packages/shared && npx tsx prisma/seed.ts && cd ../..

# Run the booking platform
pnpm dev:booking    # http://localhost:3000

# Run the PMS/POS (separate terminal)
pnpm dev:pms        # http://localhost:5173
```

### Environment Variables

Create `apps/booking/.env` with:

```env
# Database (Supabase)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Stripe (test mode)
STRIPE_SECRET_KEY="sk_test_..."

# eSewa (sandbox)
ESEWA_MERCHANT_CODE="EPAYTEST"
ESEWA_SECRET_KEY="8gBm/:&EnhH.1/q"

# Khalti (sandbox — optional)
KHALTI_SECRET_KEY="..."
KHALTI_GATEWAY_URL="https://dev.khalti.com"

# Email (optional)
RESEND_API_KEY="re_..."
```

## Key Features

### Multi-Lodge Itinerary Booking
Book an entire trek in one flow. Select a template itinerary or build a custom one, choose lodges and rooms at each village stop, and pay online.

### Offline-First PMS/POS
The lodge-side app works without internet. All data is stored locally in IndexedDB. Designed for high-altitude use: dark theme, large tap targets (48px+), high contrast.

### Payment Integration
- **Stripe** — Credit/debit cards (test mode)
- **eSewa** — Nepal's largest digital wallet (sandbox)
- **Khalti** — Coming soon (needs merchant account)
- **Pay at Lodge** — No advance payment required

### Trek Route Organization
Lodges are grouped by village with trail-position ordering. Trekkers can see all lodges at each stop and compare prices, amenities, and descriptions.

## Database

### Seed Data
The seed script creates:
- 3 test users (admin, lodge owner, trekker)
- 12 EBC lodges (2 per village: Lukla, Namche, Tengboche, Dingboche, Lobuche, Gorak Shep)
- 4 rooms per lodge with altitude-scaled pricing
- Menu items with Nepali translations
- 1 template itinerary ("Classic EBC Trek" — 12 days, 6 stops)

### Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@himalayanstays.com | admin123 |
| Lodge Owner | pemba@himalayanstays.com | lodge123 |
| Trekker | alex@example.com | trek123 |

### Test Payment Credentials

**Stripe (test card):**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits

**eSewa (sandbox):**
- eSewa ID: `9806800001`
- Password: `Nepal@123`
- OTP: `123456`

## Deployment

Both apps are deployed on Vercel:

```bash
# Deploy booking platform (from monorepo root)
vercel --prod

# Deploy PMS (from apps/pms/dist after building)
cd apps/pms && pnpm build
cd dist && vercel --prod
```

## Scripts

```bash
pnpm dev:booking     # Start booking platform (Next.js)
pnpm dev:pms         # Start PMS/POS (Vite)
pnpm build           # Build all apps
pnpm lint            # Lint all apps
pnpm db:generate     # Generate Prisma client
pnpm db:push         # Push schema to database
pnpm db:migrate      # Run database migrations
```

## Roadmap

- [x] Multi-lodge itinerary booking
- [x] Online payments (Stripe + eSewa)
- [x] PMS/POS with offline support
- [x] Admin panel
- [x] Deploy to Vercel
- [ ] Email confirmations (Resend — code ready, needs API key)
- [ ] Season pricing (peak/off-season)
- [ ] Khalti payment integration
- [ ] PMS ↔ Booking sync (CouchDB bridge)
- [ ] Custom domain
- [ ] Mobile responsive polish

## License

Private — All rights reserved.

---

*Built for the Himalayan trekking community.*
