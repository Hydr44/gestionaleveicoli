-- Sistema di locking per pratiche in modifica
-- Impedisce a più utenti di modificare la stessa pratica contemporaneamente

create table if not exists case_edit_locks (
  case_id uuid primary key references cases (id) on delete cascade,
  locked_by uuid not null references auth.users (id) on delete cascade,
  locked_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

-- Indice per pulizia automatica dei lock scaduti
create index if not exists idx_case_edit_locks_expires_at on case_edit_locks (expires_at);

-- Funzione per pulire automaticamente i lock scaduti
create or replace function cleanup_expired_locks()
returns void
language plpgsql
as $$
begin
  delete from case_edit_locks
  where expires_at < now();
end;
$$;

-- Trigger per pulire i lock scaduti prima di inserire un nuovo lock
create or replace function check_and_cleanup_locks()
returns trigger
language plpgsql
as $$
begin
  -- Pulisci i lock scaduti
  perform cleanup_expired_locks();
  return new;
end;
$$;

create trigger before_insert_case_edit_locks
before insert on case_edit_locks
for each row
execute function check_and_cleanup_locks();

-- RLS per case_edit_locks
alter table case_edit_locks enable row level security;

-- Policy: gli utenti autenticati possono vedere tutti i lock
create policy "case_edit_locks_select_authenticated" on case_edit_locks
for select
using (auth.role() = 'authenticated');

-- Policy: gli utenti possono creare lock solo per se stessi
create policy "case_edit_locks_insert_own" on case_edit_locks
for insert
with check (auth.uid() = locked_by);

-- Policy: gli utenti possono eliminare solo i propri lock
create policy "case_edit_locks_delete_own" on case_edit_locks
for delete
using (auth.uid() = locked_by);

-- Policy: gli admin possono eliminare qualsiasi lock
create policy "case_edit_locks_delete_admin" on case_edit_locks
for delete
using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  )
);

