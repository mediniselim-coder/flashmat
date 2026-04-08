-- ============================================================
-- FLASHMAT.CA — Base de données Supabase
-- Copie-colle ce code dans : Supabase > SQL Editor > New Query
-- ============================================================

-- 1. TABLE PROFILES (utilisateurs)
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text not null,
  email       text not null,
  role        text not null check (role in ('client','provider')),
  phone       text,
  address     text,
  city        text,
  province    text,
  postal_code text,
  avatar_url  text,
  updated_at  timestamp with time zone default now(),
  created_at  timestamp with time zone default now()
);

-- 2. TABLE VEHICLES (véhicules des clients)
create table public.vehicles (
  id          uuid default gen_random_uuid() primary key,
  owner_id    uuid references public.profiles(id) on delete cascade,
  make        text not null,
  model       text not null,
  year        integer not null,
  trim        text,
  plate       text,
  color       text,
  vin         text,
  serial_number text,
  mileage     integer,
  image_url   text,
  photo_url   text,
  flash_score integer default 80,
  updated_at  timestamp with time zone default now(),
  created_at  timestamp with time zone default now()
);

-- 3. TABLE PROVIDERS (profils fournisseurs)
create table public.providers (
  id          uuid references public.profiles(id) on delete cascade primary key,
  shop_name   text not null,
  address     text,
  phone       text,
  description text,
  services    text[],
  rating      numeric(3,1) default 5.0,
  reviews     integer default 0,
  is_open     boolean default true,
  created_at  timestamp with time zone default now()
);

-- 3B. TABLE PROVIDER_REVIEWS (avis clients sur les fournisseurs)
create table public.provider_reviews (
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

-- 4. TABLE BOOKINGS (réservations)
create table public.bookings (
  id           uuid default gen_random_uuid() primary key,
  client_id    uuid references public.profiles(id) on delete cascade,
  provider_id  uuid references public.providers(id) on delete cascade,
  vehicle_id   uuid references public.vehicles(id),
  service      text not null,
  service_icon text default '🔧',
  date         date,
  time_slot    text,
  notes        text,
  price        text,
  status       text default 'pending' check (status in ('pending','confirmed','progress','done','cancelled')),
  created_at   timestamp with time zone default now()
);

-- 5. TABLE NOTIFICATIONS
create table public.notifications (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  title       text not null,
  body        text,
  icon        text default '🔔',
  type        text default 'info',
  is_read     boolean default false,
  created_at  timestamp with time zone default now()
);

-- 6. TABLE MARKETPLACE
create table public.marketplace (
  id          uuid default gen_random_uuid() primary key,
  seller_id   uuid references public.profiles(id) on delete cascade,
  title       text not null,
  price       numeric(10,2),
  category    text,
  condition   text,
  description text,
  city        text default 'Montréal',
  is_active   boolean default true,
  created_at  timestamp with time zone default now()
);

-- ============================================================
-- SÉCURITÉ (Row Level Security)
-- ============================================================

alter table public.profiles      enable row level security;
alter table public.vehicles      enable row level security;
alter table public.providers     enable row level security;
alter table public.provider_reviews enable row level security;
alter table public.bookings      enable row level security;
alter table public.notifications enable row level security;
alter table public.marketplace   enable row level security;

-- Profiles: chacun voit son propre profil, fournisseurs publics
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_public_provider" on public.profiles for select using (role = 'provider');
create policy "profiles_booked_client_visible_to_provider" on public.profiles for select using (
  role = 'client'
  and exists (
    select 1
    from public.bookings
    where public.bookings.client_id = public.profiles.id
      and public.bookings.provider_id = auth.uid()
  )
);

-- Vehicles: propriétaire seulement
create policy "vehicles_select_own" on public.vehicles for select using (auth.uid() = owner_id);
create policy "vehicles_insert_own" on public.vehicles for insert with check (auth.uid() = owner_id);
create policy "vehicles_update_own" on public.vehicles for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id or owner_id is null);
create policy "vehicles_delete_own" on public.vehicles for delete using (auth.uid() = owner_id);

-- Providers: publics en lecture, propriétaire en écriture
create policy "providers_read"  on public.providers for select using (true);
create policy "providers_write" on public.providers for all  using (auth.uid() = id);

-- Provider reviews: publics en lecture, clients authentifiÃ©s en gÃ©rance de leurs avis
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

-- Bookings: client ou fournisseur concerné
create policy "bookings_client"   on public.bookings for all using (auth.uid() = client_id);
create policy "bookings_provider" on public.bookings for all using (auth.uid() = provider_id);

-- Notifications: destinataire seulement
create policy "notifs_own" on public.notifications for all using (auth.uid() = user_id);

-- Marketplace: tous lisent, vendeur gère les siennes
create policy "market_read"  on public.marketplace for select using (is_active = true);
create policy "market_write" on public.marketplace for all   using (auth.uid() = seller_id);

-- ============================================================
-- TRIGGER: créer automatiquement le profil après inscription
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Utilisateur'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- REVIEWS AGGREGATION
-- ============================================================
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

create or replace function public.set_review_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger provider_reviews_set_updated_at
before update on public.provider_reviews
for each row execute function public.set_review_updated_at();

create trigger provider_reviews_refresh_provider_stats
after insert or update or delete on public.provider_reviews
for each row execute function public.refresh_provider_review_stats();

-- ============================================================
-- SELF-SERVICE ACCOUNT DELETION
-- ============================================================
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

-- ============================================================
-- LIVE MESSAGING + ACTIONABLE NOTIFICATIONS
-- ============================================================

alter table public.notifications add column if not exists action_url text;
alter table public.notifications add column if not exists resource_id uuid;

create table if not exists public.message_threads (
  id                   uuid default gen_random_uuid() primary key,
  client_id            uuid not null references public.profiles(id) on delete cascade,
  provider_id          uuid not null references public.providers(id) on delete cascade,
  booking_id           uuid references public.bookings(id) on delete set null,
  created_by           uuid not null references public.profiles(id) on delete cascade,
  last_message_at      timestamp with time zone default now(),
  last_message_preview text,
  updated_at           timestamp with time zone default now(),
  created_at           timestamp with time zone default now(),
  unique (client_id, provider_id)
);

create table if not exists public.messages (
  id           uuid default gen_random_uuid() primary key,
  thread_id    uuid not null references public.message_threads(id) on delete cascade,
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body         text not null check (length(trim(body)) > 0),
  is_read      boolean default false,
  created_at   timestamp with time zone default now()
);

alter table public.message_threads enable row level security;
alter table public.messages enable row level security;

drop policy if exists "notifs_own" on public.notifications;
drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "message_threads_select_participants" on public.message_threads;
drop policy if exists "message_threads_insert_participants" on public.message_threads;
drop policy if exists "message_threads_update_participants" on public.message_threads;
drop policy if exists "messages_select_participants" on public.messages;
drop policy if exists "messages_insert_sender" on public.messages;
drop policy if exists "messages_update_recipient" on public.messages;

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
    last_message_preview = left(new.body, 160),
    updated_at = now()
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

  insert into public.notifications (user_id, title, body, icon, type, action_url, resource_id)
  values (
    new.recipient_id,
    'New message',
    coalesce(sender_name, 'FlashMat user') || ': ' || left(new.body, 120),
    'MSG',
    'message',
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
  insert into public.notifications (user_id, title, body, icon, type, action_url, resource_id)
  values
    (
      new.client_id,
      'Booking confirmed',
      'Your booking for ' || coalesce(new.service, 'service') || ' is now active.',
      'BK',
      'booking',
      '/app/client/bookings',
      new.id
    ),
    (
      new.provider_id,
      'New booking request',
      'A client booked ' || coalesce(new.service, 'a service') || '.',
      'BK',
      'booking',
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
    insert into public.notifications (user_id, title, body, icon, type, action_url, resource_id)
    values (
      new.client_id,
      'Booking update',
      'Your booking for ' || coalesce(new.service, 'service') || ' is now ' || coalesce(new.status, 'updated') || '.',
      'BK',
      'booking',
      '/app/client/bookings',
      new.id
    );
  end if;

  return new;
end;
$$;

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
