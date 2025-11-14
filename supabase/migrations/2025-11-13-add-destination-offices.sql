-- Migrazione: anagrafiche uffici destinatari
-- Eseguire con la chiave service_role oppure dal SQL editor con privilegi adeguati.

set search_path to public;

-- 1. Tipologia uffici (se non esiste già)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'office_type_enum') then
    create type office_type_enum as enum ('persona_fisica', 'persona_giuridica');
  end if;
end;
$$;

-- 2. Tabella anagrafiche uffici destinatari
create table if not exists public.destination_offices (
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

-- 3. Nuovi riferimenti nelle pratiche
alter table public.cases
  add column if not exists destination_office_id uuid references public.destination_offices (id);

alter table public.seizure_case_details
  add column if not exists destination_office_id uuid references public.destination_offices (id);

-- 4. Trigger updated_at per la nuova tabella
create trigger trg_destination_offices_updated
  before update on public.destination_offices
  for each row
  execute procedure public.set_current_timestamp();

-- 5. RLS & policy
alter table public.destination_offices enable row level security;

drop policy if exists "destination_offices_select_authenticated" on public.destination_offices;
create policy "destination_offices_select_authenticated" on public.destination_offices
for select
using (auth.role() = 'authenticated');

drop policy if exists "destination_offices_write_non_readonly" on public.destination_offices;
create policy "destination_offices_write_non_readonly" on public.destination_offices
for all
using (not public.current_user_is_readonly())
with check (not public.current_user_is_readonly());

-- 6. Aggiornamento funzioni helper in modalità SECURITY DEFINER
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
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.current_user_is_readonly()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'solo_lettura', false);
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.current_user_is_readonly() to authenticated;

-- 7. Nota: per retrofitting dei dati esistenti, associare eventuali pratiche
--    all'anagrafica ufficio corretta con update manuali.

