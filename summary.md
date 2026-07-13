# CrowdShip — Project Summary

> **CrowdShip** is a full-stack peer-to-peer (P2P) logistics platform built for Pakistan, connecting package **Senders** with everyday **Travelers** who earn money by delivering packages along their existing routes.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Architecture](#2-project-architecture)
3. [Directory Structure](#3-directory-structure)
4. [Core Features](#4-core-features)
5. [Database Schema](#5-database-schema)
6. [Application Routes (Pages)](#6-application-routes-pages)
7. [Key Components](#7-key-components)
8. [Library & Utilities](#8-library--utilities)
9. [State Management & Context](#9-state-management--context)
10. [API Routes](#10-api-routes)
11. [Email Notifications](#11-email-notifications)
12. [Authentication & Security](#12-authentication--security)
13. [Admin Panel](#13-admin-panel)
14. [Geospatial System](#14-geospatial-system)
15. [Business Logic & Financial Flows](#15-business-logic--financial-flows)
16. [Environment Variables](#16-environment-variables)
17. [Known Issues / Technical Notes](#17-known-issues--technical-notes)
18. [Deployment](#18-deployment)

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 + `tw-animate-css` |
| **UI Components** | Shadcn/UI (Radix UI primitives) |
| **Database** | Supabase — PostgreSQL + PostGIS |
| **Auth** | Supabase Auth (email/password) |
| **Realtime** | Supabase Realtime (postgres_changes) |
| **Maps** | Leaflet / MapLibre GL (dual implementation) |
| **Routing Engine** | OSRM (Open Source Routing Machine) via proxy |
| **Geocoding** | Nominatim (OpenStreetMap) |
| **Geofencing** | Turf.js + Pakistan GeoJSON polygon |
| **Email** | Resend API |
| **PDF Generation** | jsPDF + jsPDF-AutoTable |
| **Charts** | Recharts |
| **Animations** | Framer Motion |
| **Forms** | React Hook Form + Zod validation |
| **Date Utilities** | date-fns |

---

## 2. Project Architecture

```
User (Browser)
     │
     ▼
Next.js App Router (Frontend + API Routes)
     │
     ├── Supabase Auth (JWT sessions via @supabase/ssr)
     ├── Supabase PostgreSQL + PostGIS (primary database)
     ├── Supabase Realtime (live shipment/profile updates)
     ├── Supabase Storage (KYC documents, avatars, shipment images)
     │
     ├── OSRM (route calculation via /api/route proxy)
     ├── Nominatim / OpenStreetMap (geocoding/reverse geocoding)
     └── Resend (transactional email)
```

The app follows the **Next.js App Router** pattern:
- **Server Actions** (`actions.ts`) handle data mutations (create shipment, accept bid, cancel, etc.).
- **Client Components** handle interactive UI (maps, forms, real-time subscriptions).
- **Middleware** (`src/middleware.ts`) refreshes Supabase auth sessions on every request.

---

## 3. Directory Structure

```
Crowdship/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout (Navbar, ThemeProvider, UserProvider)
│   │   ├── page.tsx                # Home / Dashboard (role-aware)
│   │   ├── globals.css             # Global Tailwind styles
│   │   ├── api/route/route.ts      # OSRM proxy API route
│   │   ├── auth/
│   │   │   ├── callback/           # OAuth/magic link callback handler
│   │   │   └── auth-code-error/    # Auth error page
│   │   ├── login/                  # Login & Sign-up page
│   │   ├── account/                # User profile management
│   │   ├── kyc/upload/             # KYC document upload
│   │   ├── wallet/                 # Wallet: balance, top-up, transactions
│   │   ├── ratings/                # Ratings history
│   │   ├── sender/
│   │   │   ├── create/             # Create new shipment form
│   │   │   ├── dashboard/          # Sender's shipment dashboard
│   │   │   ├── actions.ts          # Server Actions: create, cancel shipment
│   │   │   └── bid-actions.ts      # Server Actions: accept/reject bids
│   │   ├── traveler/
│   │   │   ├── page.tsx            # Trip Planner + map view (find packages)
│   │   │   ├── dashboard/          # Traveler's deliveries dashboard
│   │   │   ├── trips/              # Traveler's trip history
│   │   │   ├── bids/               # Traveler's bid history
│   │   │   ├── actions.ts          # Server Actions: accept delivery, OTP verify
│   │   │   └── bid-actions.ts      # Server Actions: place/withdraw bids
│   │   └── k4jhf4jd82jd92jd/      # Admin panel (security-through-obscurity URL)
│   │       ├── page.tsx            # Admin home (business wallet + module links)
│   │       ├── kyc/                # KYC review queue (approve/reject)
│   │       ├── analytics/          # Platform analytics (charts, stats)
│   │       ├── users/              # User management (suspend/ban)
│   │       ├── map/                # Live shipments map
│   │       └── actions.ts          # Admin server actions
│   ├── components/
│   │   ├── navbar.tsx              # Global nav (mode toggle, avatar menu)
│   │   ├── shipment-card.tsx       # Card for a single shipment
│   │   ├── shipment-bids-modal.tsx # Modal: view/accept bids on a shipment
│   │   ├── make-bid-dialog.tsx     # Dialog: traveler places a bid
│   │   ├── cancel-shipment-dialog.tsx # Cancellation confirmation dialog
│   │   ├── chat-dialog.tsx         # In-app messaging dialog
│   │   ├── chats-list-dialog.tsx   # List of conversations per shipment
│   │   ├── rating-dialog.tsx       # Star rating + comment dialog
│   │   ├── rating-display.tsx      # Display traveler star rating
│   │   ├── image-uploader.tsx      # Multi-image upload component
│   │   ├── location-search-input.tsx # Autocomplete location input (Nominatim)
│   │   ├── leaflet-traveler-view.tsx  # Leaflet-based map for traveler trip planner
│   │   ├── maplibre-traveler-view.tsx # MapLibre-based alternative
│   │   ├── maplibre-picker.tsx     # MapLibre location picker
│   │   ├── map-picker.tsx          # Leaflet location picker
│   │   ├── admin-map-view.tsx      # Admin live shipments map
│   │   ├── traveler-map-view.tsx   # Traveler route map
│   │   ├── route-map.tsx           # Route display map
│   │   ├── traveler-guard.tsx      # HOC: guard traveler-only routes
│   │   ├── profile-completion-guard.tsx # HOC: guard incomplete profiles
│   │   ├── business-wallet-card.tsx # Admin business wallet summary card
│   │   ├── error-boundary.tsx      # Global React error boundary
│   │   ├── theme-provider.tsx      # next-themes wrapper
│   │   ├── theme-toggle.tsx        # Dark/light mode toggle button
│   │   ├── admin/
│   │   │   ├── metric-card.tsx     # Analytics metric card component
│   │   │   └── date-range-picker.tsx # Date range picker for analytics
│   │   └── ui/                     # Shadcn/UI component library (button, card, etc.)
│   ├── contexts/
│   │   └── user-context.tsx        # Global user auth + profile + mode state
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # Browser Supabase client
│   │   │   └── server.ts           # Server Supabase client (cookie-based)
│   │   ├── email.ts                # Resend email templates (KYC, shipment events)
│   │   ├── geocoding.ts            # Location search + reverse geocoding (Nominatim)
│   │   ├── geofencing.ts           # Pakistan boundary check (Turf.js)
│   │   ├── osrm.ts                 # Route calculation + WKT conversion
│   │   ├── routing.ts              # Routing helper utilities
│   │   ├── parse-wkb.ts            # Well-Known Binary parser for PostGIS geometry
│   │   ├── pakistan-mask.ts        # Pakistan map masking utilities
│   │   ├── retry-fetch.ts          # Fetch with exponential backoff
│   │   └── utils.ts                # `cn()` utility (clsx + tailwind-merge)
│   ├── types/
│   │   └── database.ts             # TypeScript interfaces for all DB entities
│   └── data/
│       └── pakistan.json           # GeoJSON polygon for Pakistan boundary
├── supabase/
│   ├── schema.sql                  # Original base schema
│   ├── schema_final.sql            # Consolidated final schema (base + all migrations)
│   ├── seed_dummy_users.sql        # Seed data for testing
│   └── migrations/                 # Individual migration files
├── public/                         # Static assets (SVGs)
├── next.config.ts                  # Next.js configuration
├── tailwind.config / postcss.config.mjs
├── tsconfig.json
├── components.json                 # Shadcn/UI configuration
├── env.example.txt                 # Environment variable template
└── package.json
```

---

## 4. Core Features

### 🚚 Dual Role System
- Every user can act as a **Sender** or **Traveler**.
- Role switching is done via a toggle switch in the Navbar.
- Switching to Traveler mode requires **KYC verification** + a **complete profile** (full name, phone, avatar).

### 📦 Shipment Lifecycle
```
pending → accepted → in_transit → delivered
                  ↘ cancelled
```
- **Pending**: Shipment is live in the marketplace.
- **Accepted**: A traveler has accepted (funds move to escrow).
- **In Transit**: Pickup OTP verified by traveler.
- **Delivered**: Delivery OTP verified; funds released to traveler.
- **Cancelled**: Either party cancelled; penalty logic applies.

### 🏷️ Bidding System
- Senders can optionally enable bidding on shipments.
- Travelers can place bids with a custom price.
- Senders review and accept/reject bids.
- If `auto_accept_initial_price = true`, first traveler to match gets auto-accepted.

### 💰 Escrow & Wallet System
- Users have a `wallet_balance` and `escrow_balance`.
- On shipment acceptance: `wallet_balance -= offer_price`, `escrow_balance += offer_price`.
- On delivery: `escrow_balance -= offer_price`, traveler gets 90%, platform keeps 10% commission.
- Commission flows to a singleton **Business Wallet** (`id = 00000000-0000-0000-0000-000000000001`).

### 🔐 OTP Verification
- Two 6-digit OTPs are generated per shipment: `pickup_otp` and `delivery_otp`.
- Sender shares `pickup_otp` with traveler at pickup.
- Traveler enters `delivery_otp` (shown on their dashboard) upon arrival.
- Verified via Supabase RPC functions (`complete_pickup`, `complete_delivery`).

### 🗺️ Geospatial Matching
- Travelers draw their route on a map; OSRM calculates the driving path.
- The route geometry (WKT LineString) is passed to `match_shipments_to_route()` (PostgreSQL/PostGIS RPC).
- PostGIS finds pending shipments where **both** pickup and dropoff are within 5km of the route **and** pickup comes before dropoff along the route direction.

### 💬 In-App Messaging
- Real-time chat between sender and traveler per shipment.
- Chat available for 24 hours after delivery.

### ⭐ Ratings
- Senders can rate travelers after delivery (1–5 stars + comment).
- A database trigger updates `average_rating` and `total_ratings` on the traveler's profile.

### 🌐 Geofencing
- All location searches are restricted to Pakistan using a Turf.js polygon check against `data/pakistan.json`.
- Map pickers are bounded to Pakistan coordinates.

---

## 5. Database Schema

### Tables

| Table | Purpose |
|---|---|
| `public.users` | Core user profile: name, phone, avatar, KYC status, wallet balances, trust score, rating |
| `public.kyc_documents` | KYC submissions: front/back ID, proof of address, status (pending/approved/rejected) |
| `public.shipments` | Shipment listings with locations (PostGIS geography), OTPs, status, bidding flags |
| `public.trips` | Traveler trip records with origin/destination/route polyline |
| `public.transactions` | Financial record per shipment (held → released/refunded) |
| `public.bids` | Traveler bids on shipments (one active bid per traveler per shipment) |
| `public.ratings` | Sender-to-traveler ratings (one per delivered shipment) |
| `public.business_wallet` | Singleton platform wallet accumulating 10% commission |
| `public.business_wallet_transactions` | Ledger of commission and withdrawal entries |

### Custom Enum Types
- `kyc_status`: `pending`, `approved`, `rejected`
- `shipment_status`: `pending`, `accepted`, `in_transit`, `delivered`, `cancelled`
- `transaction_status`: `held`, `released`, `refunded`

### Key Database Functions (RPC)

| Function | Description |
|---|---|
| `match_shipments_to_route(route_geometry, radius_meters)` | Returns pending shipments whose pickup + dropoff are within `radius_meters` of the given route and in the correct direction |
| `complete_pickup(shipment_id, otp_input)` | Verifies pickup OTP and transitions status to `in_transit` |
| `complete_delivery(shipment_id, otp_input)` | Verifies delivery OTP, transitions to `delivered`, credits business wallet (10%) and traveler (90%) |
| `check_email_exists(email_input)` | Checks if an email is already registered (used in auth flow) |
| `cleanup_unverified_users()` | Deletes users who haven't verified email within 20 minutes (runs every 5 min via `pg_cron`) |

### Database Triggers

| Trigger | Event | Action |
|---|---|---|
| `on_auth_user_created` | `INSERT` on `auth.users` | Creates corresponding row in `public.users` |
| `trigger_shipment_accepted` | `UPDATE` on `shipments` (status → accepted) | Moves funds from sender's wallet to escrow |
| `trigger_shipment_delivered` | `UPDATE` on `shipments` (status → delivered) | Releases escrow to traveler (90%) |
| `bids_updated_at` | `UPDATE` on `bids` | Auto-updates `updated_at` timestamp |
| `trigger_update_rating_stats` | `INSERT` on `ratings` | Recalculates traveler's `average_rating` and `total_ratings` |

### Extensions Used
- `postgis` — Geospatial types and functions
- `uuid-ossp` — UUID generation
- `pgcrypto` — Cryptographic functions
- `pg_cron` — Scheduled database jobs

### Storage Buckets
- `avatars` — Public bucket for user profile pictures
- Shipment images and KYC documents are also stored in Supabase Storage

### Row Level Security (RLS)
Every table has RLS enabled. Key policies:
- Users can only view/update their own profile.
- Shipments: senders see their own; travelers see assigned ones; anyone sees pending ones.
- KYC documents: users see only their own; service role sees all.
- Ratings: anyone can view; only the sender can insert (for their own delivered shipments).

---

## 6. Application Routes (Pages)

| Route | Description |
|---|---|
| `/` | Home page — feature showcase (logged out) or role-aware dashboard (logged in) |
| `/login` | Email/password sign-in and sign-up |
| `/account` | Profile editor (name, phone, avatar upload) |
| `/kyc/upload` | Upload identity document (front, back, proof of address) |
| `/wallet` | View balance, add funds, transaction history |
| `/ratings` | View all ratings received/given |
| `/sender/create` | Multi-step shipment creation form with map picker |
| `/sender/dashboard` | Sender's active/past shipments; manage bids and cancel |
| `/traveler` | Trip Planner — draw route on map, find matching packages |
| `/traveler/dashboard` | Active deliveries, OTP entry for pickup/delivery |
| `/traveler/trips` | History of all trips |
| `/traveler/bids` | Bids placed by the traveler |
| `/auth/callback` | Supabase OAuth/email-link callback handler |
| `/auth/auth-code-error` | Shown when auth link is invalid/expired |
| `/k4jhf4jd82jd92jd` | **Admin Dashboard** (obfuscated URL for security) |
| `/k4jhf4jd82jd92jd/kyc` | Admin KYC review queue |
| `/k4jhf4jd82jd92jd/analytics` | Platform analytics and metrics |
| `/k4jhf4jd82jd92jd/users` | User management and moderation |
| `/k4jhf4jd82jd92jd/map` | Live admin map of all active shipments |

---

## 7. Key Components

| Component | Description |
|---|---|
| `Navbar` | Sticky header with logo, Sender/Traveler mode toggle switch, theme toggle, avatar dropdown menu |
| `ShipmentCard` | Displays a single shipment with status badge, OTP codes, action buttons (chat, cancel, rate, view bids) |
| `ShipmentBidsModal` | Modal showing all bids on a shipment; sender can accept or reject |
| `MakeBidDialog` | Traveler places a bid with a custom price offer |
| `CancelShipmentDialog` | Confirmation dialog for cancelling a shipment with penalty info |
| `ChatDialog` | Real-time messaging window between sender and traveler |
| `ChatsListDialog` | List of all open chats for a shipment |
| `RatingDialog` | Post-delivery star rating + optional comment |
| `RatingDisplay` | Shows star rating and review count for a traveler |
| `ImageUploader` | Multi-image uploader for shipment photos (with preview and removal) |
| `LocationSearchInput` | Debounced autocomplete for Pakistan-filtered location search |
| `LeafletTravelerView` | Full Leaflet map for trip planning (draw route, see nearby packages) |
| `MapLibreTravelerView` | MapLibre GL alternative for trip planner |
| `MaplibrePicker` / `MapPicker` | Location picker map components |
| `AdminMapView` | Admin view of live shipments on a map |
| `TravelerMapView` | Traveler's route + shipment markers |
| `RouteMap` | Simple route display map |
| `TravelerGuard` | Wrapper that blocks non-KYC-verified users from traveler routes |
| `ProfileCompletionGuard` | Wrapper that redirects incomplete profiles to `/account` |
| `BusinessWalletCard` | Admin card showing platform balance, total earned, recent commissions |
| `ErrorBoundary` | Catches and displays React rendering errors gracefully |
| `ThemeProvider` / `ThemeToggle` | Dark/light mode support via `next-themes` |

---

## 8. Library & Utilities

| File | Description |
|---|---|
| `lib/supabase/client.ts` | Creates browser-side Supabase client |
| `lib/supabase/server.ts` | Creates server-side Supabase client with cookie handling |
| `lib/email.ts` | Resend-powered HTML email templates: KYC approved, KYC rejected, shipment released, shipment cancelled (to traveler) |
| `lib/geocoding.ts` | `searchLocations()` (Nominatim autocomplete) + `reverseGeocode()` (lat/lng → address string) |
| `lib/geofencing.ts` | `isInPakistan(lat, lng)` using Turf.js point-in-polygon against a GeoJSON; Pakistan center/bounds constants |
| `lib/osrm.ts` | `getRoute()` via `/api/route` proxy; `routeToLineString()` (WKT); `routeToLatLngArray()`; fallback straight-line generator |
| `lib/routing.ts` | Higher-level routing helpers |
| `lib/parse-wkb.ts` | Parses PostGIS Well-Known Binary (WKB) geometry for coordinates |
| `lib/pakistan-mask.ts` | Utilities for masking map display to Pakistan |
| `lib/retry-fetch.ts` | `fetchWithRetry()` — exponential backoff wrapper for unreliable external API calls |
| `lib/utils.ts` | `cn()` — combines `clsx` + `tailwind-merge` for conditional class names |
| `data/pakistan.json` | GeoJSON polygon of Pakistan for geofencing |

---

## 9. State Management & Context

### `UserContext` (`src/contexts/user-context.tsx`)

The single global context that provides:

| Value | Description |
|---|---|
| `user` | Supabase `User` object (auth data) |
| `profile` | `UserProfile` from `public.users` table |
| `isLoading` | Auth loading state |
| `isTravelerMode` | Current role toggle state (client-side only) |
| `toggleTravelerMode()` | Switches role; validates KYC + profile completeness before allowing |
| `signOut()` | Signs out and redirects to home |
| `refreshProfile()` | Re-fetches profile from Supabase |

The context also:
- Sets up a **Realtime subscription** to `public.users` for live profile updates.
- Listens to `onAuthStateChange` for session management.

---

## 10. API Routes

### `GET /api/route?start={lng,lat}&end={lng,lat}`
- **Purpose**: Proxies requests to the OSRM routing API to avoid CORS issues from the browser.
- **Returns**: OSRM route JSON with `geometry.coordinates`, `distance`, and `duration`.
- **Source**: `src/app/api/route/route.ts`

---

## 11. Email Notifications

Implemented via the **Resend** API. Emails are sent from admin server actions. Templates are HTML-based and styled inline.

| Email | Trigger |
|---|---|
| **KYC Approved** | Admin approves a KYC document |
| **KYC Rejected** | Admin rejects a KYC document (includes rejection reason) |
| **Shipment Released** | Traveler cancels a trip; shipment returned to marketplace — notifies sender |
| **Shipment Cancelled (Traveler)** | Sender cancels an accepted shipment — notifies traveler |

---

## 12. Authentication & Security

- **Provider**: Supabase Auth (email + password).
- **Session Management**: `@supabase/ssr` handles cookie-based sessions for both server and client.
- **Middleware** (`src/middleware.ts`): Runs on every request to refresh sessions; matches all paths except static assets.
- **Admin Access**: No dedicated auth for admin. The admin panel is protected by a long obfuscated URL segment (`k4jhf4jd82jd92jd`). *Note: No role-based guard is enforced server-side on admin routes.*
- **KYC Gate**: Traveler mode requires `is_kyc_verified = true` on the user profile. This is set by the admin after reviewing documents.
- **Account Suspension**: Admins can set `is_suspended = true` on users.
- **Unverified User Cleanup**: A `pg_cron` job runs every 5 minutes to delete users who haven't verified their email within 20 minutes.

---

## 13. Admin Panel

Accessed at `/k4jhf4jd82jd92jd`. Consists of four modules:

### KYC Review (`/kyc`)
- Lists all pending KYC submissions.
- Admin can view uploaded documents (front ID, back ID, proof of address).
- Can **Approve** (sets `is_kyc_verified = true`, sends approval email) or **Reject** (with a reason, sends rejection email).

### Platform Analytics (`/analytics`)
- Charts and metrics on: user signups, shipment volume by status, revenue, commission earned.
- Date range filtering.
- Uses Recharts for visualization.

### User Management (`/users`)
- View all registered users with their profiles.
- Suspend or unsuspend accounts.
- View ratings and trust scores.

### Live Map (`/map`)
- Displays all active shipments (pending/accepted/in-transit) on a map.
- Shows pickup and dropoff markers.

### Business Wallet
- Shown on the admin home page.
- Tracks total platform balance, total earned (cumulative commission), and total withdrawn.
- Shows the 10 most recent commission transactions.

---

## 14. Geospatial System

The platform is **Pakistan-only** by design.

### Location Search
- Uses **Nominatim** (OpenStreetMap) with `countrycodes=pk`.
- Results are further filtered using a Turf.js point-in-polygon check against a Pakistan GeoJSON.

### Route Calculation
- OSRM calculates driving routes between origin and destination.
- Browser calls `/api/route` (Next.js API route) which proxies to OSRM, avoiding CORS.
- The route is converted to a WKT `LINESTRING` for storage and PostGIS queries.

### Package Matching
- PostgreSQL function `match_shipments_to_route()` uses:
  - `ST_DWithin` — checks pickup and dropoff are within 5km of the route.
  - `ST_LineLocatePoint` — ensures pickup precedes dropoff along the route (direction check).

### Map Libraries
- The project has **two map implementations**: Leaflet (via React-Leaflet) and MapLibre GL (via react-map-gl). Both are available for the traveler trip planner.

---

## 15. Business Logic & Financial Flows

### Creating a Shipment
1. Sender fills form: title, description, weight, images, pickup/dropoff (map), price.
2. If `bidding_enabled = false`: any traveler can accept at the listed price.
3. If `bidding_enabled = true`: travelers submit competing bids; sender accepts one.
4. On acceptance, funds are moved to escrow automatically via a database trigger.

### Accepting a Shipment (Traveler)
1. Traveler plans a trip, finds matching packages.
2. Clicks "Accept Delivery" — calls `acceptShipmentAction` (server action).
3. `tripId` is associated with the shipment.
4. `trigger_shipment_accepted` fires: `sender.wallet_balance -= price`, `sender.escrow_balance += price`.

### OTP Flow
1. Pickup OTP is shown on the sender's shipment card and shared verbally with the traveler.
2. Traveler enters pickup OTP on their dashboard → `complete_pickup()` → status: `in_transit`.
3. Delivery OTP is shown on the traveler's dashboard.
4. Traveler provides delivery OTP to sender on arrival → `complete_delivery()` → status: `delivered`.
5. Traveler gets 90% of offer_price; 10% goes to business wallet.

### Cancellation
- **Pending** shipments can be cancelled by sender at no cost.
- **Accepted** shipments can be cancelled by sender (penalty may apply to sender's wallet).
- Cancellation by traveler releases the shipment back to the marketplace, notifying the sender by email.

### Commission Rate
- Fixed at **10%** of `offer_price`.
- Hard-coded in both `complete_delivery()` SQL function and `handle_shipment_delivery()` trigger.

> ⚠️ **Known double-payout risk**: `complete_delivery()` directly credits the traveler AND fires the `trigger_shipment_delivered` which also credits the traveler. This is a pre-existing bug flagged in `schema_final.sql` comments.

---

## 16. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `RESEND_API_KEY` | ✅ (for emails) | Resend API key for transactional emails |
| `NEXT_PUBLIC_APP_URL` | Optional | Production URL for email links (defaults to `http://localhost:3000`) |

Copy `env.example.txt` to `.env.local` and populate the values.

---

## 17. Known Issues / Technical Notes

From `schema_final.sql` comments:

1. **Duplicate RLS Policies** on `public.users`: Two overlapping SELECT policies exist (one for own row, one for all authenticated users). The more permissive one subsumes the other — safe but redundant.

2. **Double-payout bug**: `complete_delivery()` credits the traveler's wallet, then the `trigger_shipment_delivered` trigger fires and credits the traveler again. The trigger also clears escrow while `complete_delivery()` doesn't, creating a financial inconsistency. **Needs fixing before production.**

3. **Type inconsistency**: `shipments.pickup_location` / `dropoff_location` are `GEOGRAPHY(Point)` but `shipments.pickup_route` is `GEOMETRY(LineString)` — different types in the same table.

4. **Admin route unprotected server-side**: The admin panel at `/k4jhf4jd82jd92jd` relies on URL obscurity, not a server-side role check. Any authenticated user who knows the URL can access admin features.

5. **RESEND_API_KEY** not in `env.example.txt`: The example env file doesn't document the `RESEND_API_KEY` variable, though it's required for email functionality.

---

## 18. Deployment

### Recommended: Vercel
1. Push to GitHub.
2. Import project in Vercel dashboard.
3. Add environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`).
4. Deploy.

### Database Setup
1. Create a Supabase project.
2. Run `supabase/schema_final.sql` in the Supabase SQL Editor.
3. Configure Auth: set site URL and add your domain to allowed redirect URLs.
4. Create storage bucket `avatars` (or confirm it's created by the schema).

### Scripts
```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
```
