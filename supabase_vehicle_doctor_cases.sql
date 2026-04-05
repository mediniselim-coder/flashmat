create table if not exists public.vehicle_doctor_cases (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  type text not null default 'repair' check (type in ('repair', 'maintenance')),
  symptom_terms text[] not null default '{}',
  probable_issue text not null,
  confidence text not null default 'Moyenne',
  urgency text not null default 'A verifier',
  estimate text,
  duration text,
  price_note text,
  duration_note text,
  summary text not null,
  guidance_title text,
  guidance_items text[] not null default '{}',
  search_cat text not null default 'mechanic',
  is_active boolean not null default true,
  created_at timestamp with time zone default now()
);

alter table public.vehicle_doctor_cases enable row level security;

create policy "vehicle_doctor_cases_read"
on public.vehicle_doctor_cases
for select
using (is_active = true);
