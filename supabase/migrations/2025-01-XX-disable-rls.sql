-- Disattiva Row Level Security su tutte le tabelle
-- ATTENZIONE: Questo script rimuove le policy RLS e disattiva RLS su tutte le tabelle.
-- Usa solo se sei sicuro che l'autenticazione a livello applicativo è sufficiente.

-- Rimuovi tutte le policy esistenti
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_insert_admin_only" on public.profiles;
drop policy if exists "profiles_delete_admin_only" on public.profiles;

drop policy if exists "vehicles_select_authenticated" on public.vehicles;
drop policy if exists "vehicles_write_non_readonly" on public.vehicles;

drop policy if exists "destination_offices_select_authenticated" on public.destination_offices;
drop policy if exists "destination_offices_write_non_readonly" on public.destination_offices;

drop policy if exists "cases_select_authenticated" on public.cases;
drop policy if exists "cases_write_non_readonly" on public.cases;

drop policy if exists "seizure_details_select_authenticated" on public.seizure_case_details;
drop policy if exists "seizure_details_write_non_readonly" on public.seizure_case_details;

drop policy if exists "case_status_select_authenticated" on public.case_status_history;
drop policy if exists "case_status_write_non_readonly" on public.case_status_history;

drop policy if exists "people_select_authenticated" on public.people;
drop policy if exists "people_write_non_readonly" on public.people;

drop policy if exists "case_people_select_authenticated" on public.case_people;
drop policy if exists "case_people_write_non_readonly" on public.case_people;

drop policy if exists "tags_select_authenticated" on public.tags;
drop policy if exists "tags_write_non_readonly" on public.tags;

drop policy if exists "case_tags_select_authenticated" on public.case_tags;
drop policy if exists "case_tags_write_non_readonly" on public.case_tags;

drop policy if exists "documents_select_authenticated" on public.documents;
drop policy if exists "documents_write_non_readonly" on public.documents;

drop policy if exists "settings_select_authenticated" on public.settings;
drop policy if exists "settings_write_admin_only" on public.settings;

-- Disattiva RLS su tutte le tabelle
alter table public.profiles disable row level security;
alter table public.vehicles disable row level security;
alter table public.cases disable row level security;
alter table public.seizure_case_details disable row level security;
alter table public.case_status_history disable row level security;
alter table public.people disable row level security;
alter table public.case_people disable row level security;
alter table public.tags disable row level security;
alter table public.case_tags disable row level security;
alter table public.documents disable row level security;
alter table public.settings disable row level security;
alter table public.destination_offices disable row level security;

