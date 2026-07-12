-- =====================================================================
-- Seed: 5 dummy users, all KYC-verified, password = '123456'
-- =====================================================================
--
-- Inserts directly into auth.users (Supabase's auth schema). The
-- on_auth_user_created trigger (handle_new_user) will automatically
-- create a matching row in public.users for each one, so we only need
-- to UPDATE that row afterward to mark KYC as verified.
--
-- Password hashing uses pgcrypto's crypt()/gen_salt('bf'), which is
-- what Supabase's GoTrue expects for encrypted_password.
--
-- Run this against a dev/staging database only — never seed dummy
-- credentials like this into production.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Create the 5 auth users
-- ---------------------------------------------------------------------
insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
)
values
    (
        '11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'dummy1@crowdship.test',
        crypt('123456', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Ali Raza","avatar_url":""}',
        now(),
        now(),
        '', '', '', ''
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'dummy2@crowdship.test',
        crypt('123456', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Sana Khan","avatar_url":""}',
        now(),
        now(),
        '', '', '', ''
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'dummy3@crowdship.test',
        crypt('123456', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Bilal Ahmed","avatar_url":""}',
        now(),
        now(),
        '', '', '', ''
    ),
    (
        '44444444-4444-4444-4444-444444444444',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'dummy4@crowdship.test',
        crypt('123456', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Ayesha Malik","avatar_url":""}',
        now(),
        now(),
        '', '', '', ''
    ),
    (
        '55555555-5555-5555-5555-555555555555',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'dummy5@crowdship.test',
        crypt('123456', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Usman Tariq","avatar_url":""}',
        now(),
        now(),
        '', '', '', ''
    )
on conflict (id) do nothing;

-- Also need a matching row in auth.identities for Supabase's email
-- provider to recognize these accounts as sign-in-able.
insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
)
select
    gen_random_uuid(),
    u.id,
    u.id::text,
    jsonb_build_object('sub', u.id::text, 'email', u.email),
    'email',
    now(),
    now(),
    now()
from auth.users u
where u.id in (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 2. Mark all 5 as KYC-verified in public.users
--    (rows already exist here via the handle_new_user trigger)
-- ---------------------------------------------------------------------
update public.users
set
    is_kyc_verified = true,
    phone_number = coalesce(phone_number, '+92300' || floor(random() * 9000000 + 1000000)::text)
where id in (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
);

-- ---------------------------------------------------------------------
-- 3. Give each an approved KYC document row for consistency
-- ---------------------------------------------------------------------
insert into public.kyc_documents (user_id, document_url, document_type, status)
values
    ('11111111-1111-1111-1111-111111111111', 'https://example.com/dummy-kyc/1.jpg', 'national_id', 'approved'),
    ('22222222-2222-2222-2222-222222222222', 'https://example.com/dummy-kyc/2.jpg', 'national_id', 'approved'),
    ('33333333-3333-3333-3333-333333333333', 'https://example.com/dummy-kyc/3.jpg', 'national_id', 'approved'),
    ('44444444-4444-4444-4444-444444444444', 'https://example.com/dummy-kyc/4.jpg', 'national_id', 'approved'),
    ('55555555-5555-5555-5555-555555555555', 'https://example.com/dummy-kyc/5.jpg', 'national_id', 'approved');

-- ---------------------------------------------------------------------
-- Login reference (dev/staging only):
--   dummy1@crowdship.test / 123456
--   dummy2@crowdship.test / 123456
--   dummy3@crowdship.test / 123456
--   dummy4@crowdship.test / 123456
--   dummy5@crowdship.test / 123456
-- ---------------------------------------------------------------------
