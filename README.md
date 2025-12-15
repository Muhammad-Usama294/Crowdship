<<<<<<< HEAD
# CrowdShip - P2P Delivery Platform

A full-stack peer-to-peer logistics platform built with Next.js, Supabase, and PostGIS.

## Features

- 🚚 **Dual Mode**: Switch between Sender and Traveler roles
- 🗺️ **Geospatial Matching**: Find packages along your route using PostGIS
- 💰 **Escrow Payments**: Secure fund holding and automatic release
- 🔐 **OTP Verification**: Secure pickup and delivery confirmation
- 💳 **Wallet System**: Balance tracking, transactions, and earnings
- ⚡ **Real-time Updates**: Live status changes via Supabase Realtime
- 👨‍💼 **Admin Dashboard**: KYC verification queue

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/UI
- **Backend**: Supabase (PostgreSQL + PostGIS, Auth, Realtime)
- **Maps**: Leaflet + OpenStreetMap (OSRM routing)

## Prerequisites

- Node.js 18+ and npm
- Supabase account ([supabase.com](https://supabase.com))

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd AGAPP
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these values from your Supabase project dashboard:
- Go to **Project Settings** → **API**
- Copy the **Project URL** and **anon/public** key

### 4. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase/schema.sql`
4. Paste and run it in the SQL Editor

This will:
- Enable PostGIS extension
- Create all tables (users, shipments, trips, transactions, kyc_documents)
- Set up Row Level Security (RLS) policies
- Create database functions and triggers

### 5. Configure Supabase Auth

1. Go to **Authentication** → **Providers** → **Email**
2. **Disable** "Confirm email" (for development)
3. Go to **Authentication** → **URL Configuration**
4. Add to **Redirect URLs**: `http://localhost:3000/auth/callback`
5. Set **Site URL**: `http://localhost:3000`

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Guide

### First Time Setup

1. **Sign Up**: Create an account with email and password
2. **Add Funds**: Go to Wallet (avatar menu) → Add $100 to test
3. **Enable Traveler Mode** (optional):
   - Go to Supabase → Table Editor → `users` table
   - Find your user and set `is_kyc_verified` to `true`

### As Sender

1. Click **"Create New Shipment"**
2. Fill in details and pin pickup/dropoff locations on map
3. Submit (requires sufficient wallet balance)
4. View shipment in dashboard with OTPs

### As Traveler

1. Toggle to **Traveler Mode** in navbar (requires KYC)
2. Go to **Trip Planner**
3. Set origin and destination on map
4. Click **"Find Active Shipments"**
5. Click **"Accept Delivery"** on a package
6. Go to **Deliveries Dashboard**
7. Enter **Pickup OTP** → Status changes to "In Transit"
8. Enter **Delivery OTP** → Status changes to "Delivered"
9. Funds released to your wallet (90% after 10% commission)

## Project Structure

```
AGAPP/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── admin/          # Admin dashboard
│   │   ├── auth/           # Auth callback
│   │   ├── login/          # Login page
│   │   ├── sender/         # Sender module
│   │   ├── traveler/       # Traveler module
│   │   └── wallet/         # Wallet & payments
│   ├── components/         # Reusable UI components
│   ├── contexts/           # React contexts (UserContext)
│   ├── lib/                # Utilities (Supabase client)
│   └── types/              # TypeScript types
├── supabase/
│   └── schema.sql          # Database schema
└── public/                 # Static assets
```

## Key Features Explained

### Escrow System

- When a shipment is **accepted**, funds move from sender's wallet to escrow
- When **delivered**, funds are released to traveler (minus 10% commission)
- Automatic via database triggers

### Geospatial Matching

- Uses PostGIS `ST_DWithin` to find packages within 5km of traveler's route
- Route calculated using OSRM (Open Source Routing Machine)
- Returns packages with pickup and dropoff along the path

### Real-time Updates

- Sender dashboard auto-refreshes when shipment status changes
- Traveler dashboard updates when new shipments are assigned
- Powered by Supabase Realtime subscriptions

## Database Functions

### `match_shipments_to_route(route_geometry text, radius_meters float)`
Finds shipments along a route within specified buffer.

### `complete_pickup(shipment_id uuid, otp_input text)`
Verifies pickup OTP and updates status to 'in_transit'.

### `complete_delivery(shipment_id uuid, otp_input text)`
Verifies delivery OTP, updates status to 'delivered', and releases escrow.

## Troubleshooting

### "Email link is invalid or has expired"
- Magic links expire in 60 seconds
- Use email/password auth instead (already configured)

### "Insufficient funds"
- Go to Wallet → Add funds before creating shipments

### Traveler mode not working
- Ensure `is_kyc_verified` is set to `true` in Supabase users table

### Map not loading
- Check browser console for errors
- Ensure you're using HTTPS or localhost (required for geolocation)

### Function overload error
- Run this in Supabase SQL Editor:
  ```sql
  DROP FUNCTION IF EXISTS public.match_shipments_to_route(geometry, float);
  ```

## Production Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=your-production-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-key
```

Update Supabase redirect URLs to include your production domain.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
=======
# Crowdship
Deploying my Crowdship app
>>>>>>> eb6b549e51abc94f6c720591241e2b1813687cde
