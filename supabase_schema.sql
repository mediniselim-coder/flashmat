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
  avatar_url  text,
  created_at  timestamp with time zone default now()
);

-- 2. TABLE VEHICLES (véhicules des clients)
create table public.vehicles (
  id          uuid default gen_random_uuid() primary key,
  owner_id    uuid references public.profiles(id) on delete cascade,
  make        text not null,
  model       text not null,
  year        integer not null,
  plate       text,
  color       text,
  vin         text,
  flash_score integer default 80,
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
alter table public.bookings      enable row level security;
alter table public.notifications enable row level security;
alter table public.marketplace   enable row level security;

-- Profiles: chacun voit son propre profil, fournisseurs publics
create policy "profiles_own"    on public.profiles for all using (auth.uid() = id);
create policy "profiles_public" on public.profiles for select using (true);

-- Vehicles: propriétaire seulement
create policy "vehicles_own" on public.vehicles for all using (auth.uid() = owner_id);

-- Providers: publics en lecture, propriétaire en écriture
create policy "providers_read"  on public.providers for select using (true);
create policy "providers_write" on public.providers for all  using (auth.uid() = id);

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
