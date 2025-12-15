-- Enable PostGIS
create extension if not exists postgis;

-- Database Schema for CrowdShip

-- USERS TABLE
create table public.users (
  id uuid references auth.users not null primary key,
  full_name text,
  phone_number text,
  avatar_url text,
  is_kyc_verified boolean default false,
  trust_score int default 100,
  role text check (role in ('user', 'admin')) default 'user',
  wallet_balance decimal default 0.0,
  escrow_balance decimal default 0.0,
  created_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can view their own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can insert their own profile" on public.users
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile" on public.users
  for update using (auth.uid() = id);


-- KYC DOCUMENTS TABLE
create type kyc_status as enum ('pending', 'approved', 'rejected');

create table public.kyc_documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  document_url text not null,
  status kyc_status default 'pending',
  admin_note text,
  created_at timestamptz default now()
);

alter table public.kyc_documents enable row level security;

create policy "Users can view their own KYC docs" on public.kyc_documents
  for select using (auth.uid() = user_id);

create policy "Users can upload KYC docs" on public.kyc_documents
  for insert with check (auth.uid() = user_id);

-- SHIPMENTS TABLE
create type shipment_status as enum ('pending', 'accepted', 'in_transit', 'delivered', 'cancelled');

create table public.shipments (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.users(id) not null,
  traveler_id uuid references public.users(id),
  title text not null,
  description text,
  weight_kg decimal,
  image_url text,
  pickup_address text,
  pickup_location geography(Point, 4326),
  dropoff_address text,
  dropoff_location geography(Point, 4326),
  status shipment_status default 'pending',
  offer_price decimal not null,
  pickup_otp text,
  delivery_otp text,
  created_at timestamptz default now()
);

alter table public.shipments enable row level security;

-- Policies for Shipments
create policy "Anyone can view pending shipments" on public.shipments
  for select using (status = 'pending');

create policy "Sender can view their shipments" on public.shipments
  for select using (auth.uid() = sender_id);

create policy "Traveler can view assigned shipments" on public.shipments
  for select using (auth.uid() = traveler_id);

create policy "Sender can create shipments" on public.shipments
  for insert with check (auth.uid() = sender_id);

create policy "Sender can update pending shipments" on public.shipments
  for update using (auth.uid() = sender_id and status = 'pending');

create policy "Traveler can update status" on public.shipments
  for update using (auth.uid() = traveler_id);


-- TRIPS TABLE
create table public.trips (
  id uuid default gen_random_uuid() primary key,
  traveler_id uuid references public.users(id) not null,
  origin_address text,
  origin_location geography(Point, 4326),
  destination_address text,
  destination_location geography(Point, 4326),
  route_polyline text,
  departure_time timestamptz,
  created_at timestamptz default now()
);

alter table public.trips enable row level security;

create policy "Traveler can manage their trips" on public.trips
  for all using (auth.uid() = traveler_id);


-- TRANSACTIONS TABLE
create type transaction_status as enum ('held', 'released', 'refunded');

create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  shipment_id uuid references public.shipments(id) not null,
  amount decimal not null,
  commission_fee decimal default 0.0,
  status transaction_status default 'held',
  created_at timestamptz default now()
);

alter table public.transactions enable row level security;

-- Only system/admin should really manipulate transactions, but for visibility:
create policy "Users can view transactions concerning them" on public.transactions
  for select using (
    exists (
      select 1 from public.shipments s
      where s.id = shipment_id
      and (s.sender_id = auth.uid() or s.traveler_id = auth.uid())
    )
  );


-- FUNCTIONS

-- Match Shipments to Route
-- Returns shipments where both pickup and dropoff are within radius of the route (polyline)
-- Note: Simplified logic using ST_DWithin and ST_LineFromEncodedPolyline (if available) or just geometry
-- For this prototype, we'll assume route_polyline is a LineString geometry or we reconstruct it.
-- PostGIS doesn't parse Google Polyline automatically without extra functions.
-- We will assume the frontend sends a GeoJSON LineString for the route to this function for simplicity.

create or replace function match_shipments_to_route(
  route_geometry text,
  radius_meters float
)
returns table (
  id uuid,
  title text,
  description text,
  offer_price decimal,
  weight_kg decimal,
  pickup_lat float,
  pickup_lng float,
  dropoff_lat float,
  dropoff_lng float
)
language sql
as $$
  select 
    id, 
    title, 
    description, 
    offer_price, 
    weight_kg,
    st_y(pickup_location::geometry) as pickup_lat, 
    st_x(pickup_location::geometry) as pickup_lng,
    st_y(dropoff_location::geometry) as dropoff_lat, 
    st_x(dropoff_location::geometry) as dropoff_lng
  from public.shipments
  where status = 'pending'
  and st_dwithin(
    pickup_location::geometry, 
    st_geomfromtext(route_geometry, 4326), 
    radius_meters
  )
  and st_dwithin(
    dropoff_location::geometry, 
    st_geomfromtext(route_geometry, 4326), 
    radius_meters
  );
$$;

-- Triggers for Escrow Logic

-- 1. On Accept: Move funds to Escrow
create or replace function handle_shipment_acceptance()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    -- Deduct from Sender
    update public.users
    set wallet_balance = wallet_balance - new.offer_price,
        escrow_balance = escrow_balance + new.offer_price
    where id = new.sender_id;
    
    -- Create held transaction
    insert into public.transactions (shipment_id, amount, status)
    values (new.id, new.offer_price, 'held');
  end if;
  return new;
end;
$$;

create trigger trigger_shipment_accepted
after update on public.shipments
for each row execute function handle_shipment_acceptance();

-- 2. On Delivery: Release funds
create or replace function handle_shipment_delivery()
returns trigger
language plpgsql
security definer
as $$
declare
  fee decimal;
  payout decimal;
begin
  if new.status = 'delivered' and old.status <> 'delivered' then
    fee := new.offer_price * 0.10;
    payout := new.offer_price - fee;
    
    -- Release Escrow from Sender (it was strictly in sender's escrow bucket? No, usually escrow is a system holding. 
    -- But our schema put `escrow_balance` on the user. Let's assume we deduct from Sender's escrow_balance record to clear it.)
    update public.users
    set escrow_balance = escrow_balance - new.offer_price
    where id = new.sender_id;
    
    -- Add to Traveler Wallet
    update public.users
    set wallet_balance = wallet_balance + payout
    where id = new.traveler_id;
    
    -- Admin Fee (Assuming there's an admin user or we just log it)
    -- For now, just logging via transaction update
    update public.transactions
    set status = 'released', commission_fee = fee
    where shipment_id = new.id;
    
  end if;
  return new;
end;
$$;

create trigger trigger_shipment_delivered
after update on public.shipments
for each row execute function handle_shipment_delivery();

-- Handle New User creation (Sync with Auth)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Secure OTP Verification Functions for Traveler
create or replace function public.complete_pickup(shipment_id uuid, otp_input text)
returns boolean
language plpgsql
security definer
as $$
declare
  updated boolean;
begin
  updated := false;
  
  update public.shipments
  set status = 'in_transit'
  where id = shipment_id
  and pickup_otp = otp_input
  and status = 'accepted';
  
  if found then
    return true;
  else
    return false;
  end if;
end;
$$;

create or replace function public.complete_delivery(shipment_id uuid, otp_input text)
returns boolean
language plpgsql
security definer
as $$
begin
  update public.shipments
  set status = 'delivered'
  where id = shipment_id
  and delivery_otp = otp_input
  and status = 'in_transit';
  
  if found then
    return true;
  else
    return false;
  end if;
end;
$$;

