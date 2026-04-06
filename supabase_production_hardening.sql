-- ============================================================
-- FLASHMAT.CA - Production hardening migration
-- Run this in Supabase SQL Editor on the current production project.
-- ============================================================

-- 1. Profiles: add the account fields the app expects
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists province text;
alter table public.profiles add column if not exists postal_code text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists updated_at timestamp with time zone default now();

-- 2. Vehicles: add lifecycle and media fields used by FlashMat
alter table public.vehicles add column if not exists trim text;
alter table public.vehicles add column if not exists serial_number text;
alter table public.vehicles add column if not exists mileage integer;
alter table public.vehicles add column if not exists image_url text;
alter table public.vehicles add column if not exists photo_url text;
alter table public.vehicles add column if not exists updated_at timestamp with time zone default now();

-- 3. Helpful indexes
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_vehicles_owner_id on public.vehicles(owner_id);
create index if not exists idx_vehicles_vin on public.vehicles(vin) where vin is not null;
create index if not exists idx_vehicles_serial_number on public.vehicles(serial_number) where serial_number is not null;

-- 4. Backfill profile details from auth metadata where available
update public.profiles as p
set
  phone = coalesce(p.phone, u.raw_user_meta_data->>'phone'),
  address = coalesce(p.address, u.raw_user_meta_data->>'address'),
  city = coalesce(p.city, u.raw_user_meta_data->>'city'),
  province = coalesce(p.province, u.raw_user_meta_data->>'province'),
  postal_code = coalesce(p.postal_code, u.raw_user_meta_data->>'postal_code'),
  avatar_url = coalesce(p.avatar_url, u.raw_user_meta_data->>'avatar_url'),
  updated_at = now()
from auth.users as u
where p.id = u.id;

-- 5. Replace broad policies with operation-specific ones
drop policy if exists "profiles_own" on public.profiles;
drop policy if exists "profiles_public" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_public_provider" on public.profiles;
drop policy if exists "profiles_booked_client_visible_to_provider" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles_public_provider"
on public.profiles
for select
using (role = 'provider');

create policy "profiles_booked_client_visible_to_provider"
on public.profiles
for select
using (
  role = 'client'
  and exists (
    select 1
    from public.bookings
    where public.bookings.client_id = public.profiles.id
      and public.bookings.provider_id = auth.uid()
  )
);

drop policy if exists "vehicles_own" on public.vehicles;
drop policy if exists "vehicles_select_own" on public.vehicles;
drop policy if exists "vehicles_insert_own" on public.vehicles;
drop policy if exists "vehicles_update_own" on public.vehicles;
drop policy if exists "vehicles_delete_own" on public.vehicles;

create policy "vehicles_select_own"
on public.vehicles
for select
using (auth.uid() = owner_id);

create policy "vehicles_insert_own"
on public.vehicles
for insert
with check (auth.uid() = owner_id);

create policy "vehicles_update_own"
on public.vehicles
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id or owner_id is null);

create policy "vehicles_delete_own"
on public.vehicles
for delete
using (auth.uid() = owner_id);

-- 6. Keep updated_at fresh automatically
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();
