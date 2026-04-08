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

-- 2C. Notifications: support actionable entries from messaging and booking updates
alter table public.notifications add column if not exists action_url text;
alter table public.notifications add column if not exists resource_id uuid;

-- 2B. Provider reviews: add dedicated customer review storage
create table if not exists public.provider_reviews (
  id                uuid default gen_random_uuid() primary key,
  provider_id       uuid not null references public.providers(id) on delete cascade,
  client_id         uuid not null references public.profiles(id) on delete cascade,
  client_name       text not null,
  client_avatar_url text,
  rating            integer not null check (rating between 1 and 5),
  comment           text,
  created_at        timestamp with time zone default now(),
  updated_at        timestamp with time zone default now(),
  unique (provider_id, client_id)
);

alter table public.provider_reviews add column if not exists client_avatar_url text;
alter table public.provider_reviews add column if not exists updated_at timestamp with time zone default now();
alter table public.provider_reviews enable row level security;

-- 2D. Messaging: conversation threads and live messages between clients and providers
create table if not exists public.message_threads (
  id                  uuid default gen_random_uuid() primary key,
  client_id           uuid not null references public.profiles(id) on delete cascade,
  provider_id         uuid not null references public.providers(id) on delete cascade,
  booking_id          uuid references public.bookings(id) on delete set null,
  created_by          uuid not null references public.profiles(id) on delete cascade,
  last_message_at     timestamp with time zone default now(),
  last_message_preview text,
  updated_at          timestamp with time zone default now(),
  created_at          timestamp with time zone default now(),
  unique (client_id, provider_id)
);

create table if not exists public.messages (
  id            uuid default gen_random_uuid() primary key,
  thread_id     uuid not null references public.message_threads(id) on delete cascade,
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  body          text not null check (length(trim(body)) > 0),
  is_read       boolean default false,
  created_at    timestamp with time zone default now()
);

alter table public.message_threads add column if not exists updated_at timestamp with time zone default now();

alter table public.message_threads enable row level security;
alter table public.messages enable row level security;

-- 3. Helpful indexes
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_vehicles_owner_id on public.vehicles(owner_id);
create index if not exists idx_vehicles_vin on public.vehicles(vin) where vin is not null;
create index if not exists idx_vehicles_serial_number on public.vehicles(serial_number) where serial_number is not null;
create index if not exists idx_provider_reviews_provider_id on public.provider_reviews(provider_id);
create index if not exists idx_provider_reviews_client_id on public.provider_reviews(client_id);
create index if not exists idx_notifications_user_id_created_at on public.notifications(user_id, created_at desc);
create index if not exists idx_message_threads_client_provider on public.message_threads(client_id, provider_id);
create index if not exists idx_message_threads_last_message_at on public.message_threads(last_message_at desc);
create index if not exists idx_messages_thread_id_created_at on public.messages(thread_id, created_at);
create index if not exists idx_messages_recipient_unread on public.messages(recipient_id, is_read, created_at desc);

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

drop policy if exists "provider_reviews_read" on public.provider_reviews;
drop policy if exists "provider_reviews_insert_own" on public.provider_reviews;
drop policy if exists "provider_reviews_update_own" on public.provider_reviews;
drop policy if exists "provider_reviews_delete_own" on public.provider_reviews;
drop policy if exists "message_threads_select_participants" on public.message_threads;
drop policy if exists "message_threads_insert_participants" on public.message_threads;
drop policy if exists "message_threads_update_participants" on public.message_threads;
drop policy if exists "messages_select_participants" on public.messages;
drop policy if exists "messages_insert_sender" on public.messages;
drop policy if exists "messages_update_recipient" on public.messages;
drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_insert_service" on public.notifications;
drop policy if exists "notifs_own" on public.notifications;

create policy "provider_reviews_read"
on public.provider_reviews
for select
using (true);

create policy "provider_reviews_insert_own"
on public.provider_reviews
for insert
with check (
  auth.uid() = client_id
  and exists (
    select 1
    from public.profiles
    where public.profiles.id = auth.uid()
      and public.profiles.role = 'client'
  )
);

create policy "provider_reviews_update_own"
on public.provider_reviews
for update
using (auth.uid() = client_id)
with check (auth.uid() = client_id);

create policy "provider_reviews_delete_own"
on public.provider_reviews
for delete
using (auth.uid() = client_id);

create policy "notifications_select_own"
on public.notifications
for select
using (auth.uid() = user_id);

create policy "notifications_update_own"
on public.notifications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "message_threads_select_participants"
on public.message_threads
for select
using (auth.uid() = client_id or auth.uid() = provider_id);

create policy "message_threads_insert_participants"
on public.message_threads
for insert
with check (
  auth.uid() = created_by
  and (auth.uid() = client_id or auth.uid() = provider_id)
);

create policy "message_threads_update_participants"
on public.message_threads
for update
using (auth.uid() = client_id or auth.uid() = provider_id)
with check (auth.uid() = client_id or auth.uid() = provider_id);

create policy "messages_select_participants"
on public.messages
for select
using (
  exists (
    select 1
    from public.message_threads
    where public.message_threads.id = public.messages.thread_id
      and (public.message_threads.client_id = auth.uid() or public.message_threads.provider_id = auth.uid())
  )
);

create policy "messages_insert_sender"
on public.messages
for insert
with check (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.message_threads
    where public.message_threads.id = public.messages.thread_id
      and (public.message_threads.client_id = auth.uid() or public.message_threads.provider_id = auth.uid())
  )
);

create policy "messages_update_recipient"
on public.messages
for update
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

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

create or replace function public.refresh_provider_review_stats()
returns trigger
language plpgsql
as $$
declare
  target_provider_id uuid;
begin
  target_provider_id := coalesce(new.provider_id, old.provider_id);

  update public.providers
  set
    rating = coalesce((
      select round(avg(rating)::numeric, 1)
      from public.provider_reviews
      where provider_id = target_provider_id
    ), 0),
    reviews = (
      select count(*)
      from public.provider_reviews
      where provider_id = target_provider_id
    )
  where id = target_provider_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists provider_reviews_set_updated_at on public.provider_reviews;
create trigger provider_reviews_set_updated_at
before update on public.provider_reviews
for each row execute function public.set_updated_at();

drop trigger if exists provider_reviews_refresh_provider_stats on public.provider_reviews;
create trigger provider_reviews_refresh_provider_stats
after insert or update or delete on public.provider_reviews
for each row execute function public.refresh_provider_review_stats();

create or replace function public.refresh_message_thread_preview()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.message_threads
  set
    last_message_at = new.created_at,
    last_message_preview = left(new.body, 160)
  where id = new.thread_id;

  return new;
end;
$$;

create or replace function public.notify_message_recipient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
begin
  select coalesce(full_name, email, 'FlashMat user')
  into sender_name
  from public.profiles
  where id = new.sender_id;

  insert into public.notifications (user_id, title, body, icon, type, is_read, action_url, resource_id)
  values (
    new.recipient_id,
    'New message',
    coalesce(sender_name, 'FlashMat user') || ': ' || left(new.body, 120),
    'MSG',
    'message',
    false,
    null,
    new.thread_id
  );

  return new;
end;
$$;

create or replace function public.notify_booking_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, body, icon, type, is_read, action_url, resource_id)
  values
    (
      new.client_id,
      'Booking confirmed',
      'Your booking for ' || coalesce(new.service, 'service') || ' is now active.',
      'BK',
      'booking',
      false,
      '/app/client/bookings',
      new.id
    ),
    (
      new.provider_id,
      'New booking request',
      'A client booked ' || coalesce(new.service, 'a service') || '.',
      'BK',
      'booking',
      false,
      '/app/provider/bookings',
      new.id
    );

  return new;
end;
$$;

create or replace function public.notify_booking_status_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications (user_id, title, body, icon, type, is_read, action_url, resource_id)
    values (
      new.client_id,
      'Booking update',
      'Your booking for ' || coalesce(new.service, 'service') || ' is now ' || coalesce(new.status, 'updated') || '.',
      'BK',
      'booking',
      false,
      '/app/client/bookings',
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists message_threads_set_updated_at on public.message_threads;
create trigger message_threads_set_updated_at
before update on public.message_threads
for each row execute function public.set_updated_at();

drop trigger if exists messages_refresh_thread_preview on public.messages;
create trigger messages_refresh_thread_preview
after insert on public.messages
for each row execute function public.refresh_message_thread_preview();

drop trigger if exists messages_notify_recipient on public.messages;
create trigger messages_notify_recipient
after insert on public.messages
for each row execute function public.notify_message_recipient();

drop trigger if exists bookings_notify_created on public.bookings;
create trigger bookings_notify_created
after insert on public.bookings
for each row execute function public.notify_booking_created();

drop trigger if exists bookings_notify_status_changed on public.bookings;
create trigger bookings_notify_status_changed
after update on public.bookings
for each row execute function public.notify_booking_status_changed();

-- 7. Allow a signed-in user to delete their own account safely
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;

  delete from auth.users
  where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
