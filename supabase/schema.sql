-- Schema iniziale per Gestionale Veicoli - Supabase
-- Eseguire dal SQL Editor di Supabase o via psql con servizio role.

set search_path to public;

------------------------------------------------------------
-- Estensioni utili
------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

------------------------------------------------------------
-- Tipi enumerati
------------------------------------------------------------
create type procedure_type_enum as enum ('amministrativo', 'sives', 'penale', 'rilascio');
create type case_status_enum as enum ('aperto', 'in_lavorazione', 'in_attesa', 'chiuso');
create type vehicle_type_enum as enum ('ciclomotori', 'motocicli', 'autovetture', 'autocarri');
create type intervention_type_enum as enum ('diurno', 'notturno', 'festivo');
create type case_person_role_enum as enum ('proprietario', 'custode', 'operatore', 'referente_legale');
create type user_role_enum as enum ('admin', 'operatore', 'solo_lettura');
create type office_type_enum as enum ('persona_fisica', 'persona_giuridica');

------------------------------------------------------------
-- Tabelle
------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  role user_role_enum not null default 'operatore',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id)
);

create table if not exists destination_offices (
  id uuid primary key default gen_random_uuid(),
  office_type office_type_enum not null default 'persona_giuridica',
  name text not null,
  tax_code text,
  vat_number text,
  address text,
  city text,
  province text,
  postal_code text,
  phone text,
  email text,
  pec text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id),
  updated_by uuid references auth.users (id)
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  plate text unique not null,
  vin text,
  brand text,
  model text,
  color text,
  year smallint,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id),
  updated_by uuid references auth.users (id)
);

create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  case_number text unique not null,
  procedure_type procedure_type_enum not null,
  subcategory text,
  status case_status_enum not null default 'aperto',
  opened_at date not null default current_date,
  closed_at date,
  description text,
  location text,
  destination_office_id uuid references destination_offices (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id),
  updated_by uuid references auth.users (id)
);

create table if not exists seizure_case_details (
  case_id uuid primary key references cases (id) on delete cascade,
  seizure_date date,
  enforcement_body text,
  offender_details text,
  plate_number text,
  vin_number text,
  vehicle_type vehicle_type_enum,
  vehicle_brand_model text,
  vehicle_weight text,
  intervention_type intervention_type_enum,
  carrier_one text,
  carrier_one_km numeric(10,2) default 0,
  carrier_two text,
  carrier_two_km numeric(10,2) default 0,
  entry_date date,
  entry_reason text,
  exit_date date,
  exit_reason text,
  custody_duration text,
  custody_costs text,
  procedure_number text,
  destination_office text,
  destination_office_id uuid references destination_offices (id),
  request_date date,
  invoice_date date,
  invoice_number text,
  invoice_amount text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists case_status_history (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases (id) on delete cascade,
  status case_status_enum not null,
  notes text,
  changed_at timestamptz not null default now(),
  changed_by uuid default auth.uid() references auth.users (id)
);

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  tax_code text,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id),
  updated_by uuid references auth.users (id)
);

create table if not exists case_people (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases (id) on delete cascade,
  person_id uuid not null references people (id) on delete cascade,
  role case_person_role_enum not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  parent_id uuid references tags (id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id)
);

create table if not exists case_tags (
  case_id uuid not null references cases (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (case_id, tag_id)
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases (id) on delete cascade,
  title text not null,
  file_path text not null,
  file_type text,
  generated boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id)
);

create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

------------------------------------------------------------
-- Trigger aggiornamento updated_at
------------------------------------------------------------
create or replace function public.set_current_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated
  before update on profiles
  for each row
  execute procedure set_current_timestamp();

create trigger trg_vehicles_updated
  before update on vehicles
  for each row
  execute procedure set_current_timestamp();

create trigger trg_destination_offices_updated
  before update on destination_offices
  for each row
  execute procedure set_current_timestamp();

create trigger trg_cases_updated
  before update on cases
  for each row
  execute procedure set_current_timestamp();

create trigger trg_seizure_details_updated
  before update on seizure_case_details
  for each row
  execute procedure set_current_timestamp();

create trigger trg_people_updated
  before update on people
  for each row
  execute procedure set_current_timestamp();

create trigger trg_tags_updated
  before update on tags
  for each row
  execute procedure set_current_timestamp();

create trigger trg_settings_updated
  before update on settings
  for each row
  execute procedure set_current_timestamp();

------------------------------------------------------------
-- Funzioni helper per policy
------------------------------------------------------------
create or replace function public.current_user_role()
returns user_role_enum
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result user_role_enum;
begin
  select role into result
  from public.profiles
  where id = auth.uid();
  return result;
end;
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_user_role() = 'admin', false);
$$;

create or replace function public.current_user_is_readonly()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_user_role() = 'solo_lettura', false);
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.current_user_is_readonly() to authenticated;

------------------------------------------------------------
-- RLS
------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.cases enable row level security;
alter table public.seizure_case_details enable row level security;
alter table public.case_status_history enable row level security;
alter table public.people enable row level security;
alter table public.case_people enable row level security;
alter table public.tags enable row level security;
alter table public.case_tags enable row level security;
alter table public.documents enable row level security;
alter table public.settings enable row level security;
alter table public.destination_offices enable row level security;

-- Profili: gli utenti vedono se stessi; gli admin vedono tutto e possono modificare
create policy "profiles_select_self_or_admin" on public.profiles
for select
using (
  auth.role() = 'authenticated'
  and (
    id = auth.uid()
    or current_user_is_admin()
  )
);

create policy "profiles_update_self" on public.profiles
for update
using (id = auth.uid() or current_user_is_admin())
with check (id = auth.uid() or current_user_is_admin());

create policy "profiles_insert_admin_only" on public.profiles
for insert
with check (current_user_is_admin());

create policy "profiles_delete_admin_only" on public.profiles
for delete
using (current_user_is_admin());

-- Tabelle operative: tutti gli utenti autenticati possono leggere.
-- Inserimento/modifica vietata ai solo lettura.
create policy "vehicles_select_authenticated" on public.vehicles
for select
using (auth.role() = 'authenticated');

create policy "vehicles_write_non_readonly" on public.vehicles
for all
using (not current_user_is_readonly())
with check (not current_user_is_readonly());

create policy "destination_offices_select_authenticated" on public.destination_offices
for select
using (auth.role() = 'authenticated');

create policy "destination_offices_write_non_readonly" on public.destination_offices
for all
using (not current_user_is_readonly())
with check (not current_user_is_readonly());

create policy "cases_select_authenticated" on public.cases
for select
using (auth.role() = 'authenticated');

create policy "cases_write_non_readonly" on public.cases
for all
using (not current_user_is_readonly())
with check (not current_user_is_readonly());

create policy "seizure_details_select_authenticated" on public.seizure_case_details
for select
using (auth.role() = 'authenticated');

create policy "seizure_details_write_non_readonly" on public.seizure_case_details
for all
using (not current_user_is_readonly())
with check (not current_user_is_readonly());

create policy "case_status_select_authenticated" on public.case_status_history
for select
using (auth.role() = 'authenticated');

create policy "case_status_write_non_readonly" on public.case_status_history
for all
using (not current_user_is_readonly())
with check (not current_user_is_readonly());

create policy "people_select_authenticated" on public.people
for select
using (auth.role() = 'authenticated');

create policy "people_write_non_readonly" on public.people
for all
using (not current_user_is_readonly())
with check (not current_user_is_readonly());

create policy "case_people_select_authenticated" on public.case_people
for select
using (auth.role() = 'authenticated');

create policy "case_people_write_non_readonly" on public.case_people
for all
using (not current_user_is_readonly())
with check (not current_user_is_readonly());

create policy "tags_select_authenticated" on public.tags
for select
using (auth.role() = 'authenticated');

create policy "tags_write_non_readonly" on public.tags
for all
using (not current_user_is_readonly())
with check (not current_user_is_readonly());

create policy "case_tags_select_authenticated" on public.case_tags
for select
using (auth.role() = 'authenticated');

create policy "case_tags_write_non_readonly" on public.case_tags
for all
using (not current_user_is_readonly())
with check (not current_user_is_readonly());

create policy "documents_select_authenticated" on public.documents
for select
using (auth.role() = 'authenticated');

create policy "documents_write_non_readonly" on public.documents
for all
using (not current_user_is_readonly())
with check (not current_user_is_readonly());

create policy "settings_select_authenticated" on public.settings
for select
using (auth.role() = 'authenticated');

create policy "settings_write_admin_only" on public.settings
for all
using (current_user_is_admin())
with check (current_user_is_admin());

------------------------------------------------------------
-- Trigger per auto-creazione profilo su nuovo utente
------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, role, created_by, updated_by)
  values (new.id, new.email, new.raw_user_meta_data ->> 'display_name', 'operatore', new.id, new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

------------------------------------------------------------
-- Utile: funzione per impostare un utente admin manualmente
------------------------------------------------------------
create or replace function public.promote_to_admin(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set role = 'admin', updated_at = now(), updated_by = auth.uid()
  where id = target_user;
end;
$$;

grant execute on function public.promote_to_admin(uuid) to authenticated;

-- Nota: chiamare con service role oppure da Edge Function controllata.


