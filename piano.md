## Panoramica
- **Obiettivo**: gestionale desktop per mezzi confiscati/sequestrati con workflow amministrativo, penale e rilascio.
- **Target utenti**: 3–4 operatori aziendali con necessità di audit, permessi e documentazione strutturata.
- **Priorità**: semplicità d’uso, tracciabilità, generazione documenti, reportistica veloce.

## Stack Tecnologico
- **App desktop**: Tauri + React (alternativa: Tauri + Svelte).
- **Linguaggi**: TypeScript/React per UI, Rust (minimo richiesto da Tauri) per bridge nativo.
- **Backend dati**: Supabase (PostgreSQL gestito, Auth, Storage, Edge Functions).
- **Distribuzione**: build native Tauri per Windows/macOS/Linux; update automatici opzionali.
- **Gestione template**: generazione PDF/Docx via librerie client-side o Edge Function dedicata.

## Moduli Funzionali
- **Autenticazione**: login con email/username + password; ruoli `admin`, `operatore`, `solo_lettura`.
- **Gestione utenti**: area riservata all’admin per creare/modificare operatori, resettare password e assegnare ruoli.
- **Dashboard**: stato pratiche, scadenze, riepilogo mezzi.
- **Anagrafiche**: veicoli, persone (proprietari/custodi/operatori), depositi.
- **Pratiche**:
  - Amministrativo → Sequestri art. 8 con sottocategorie (fermo, sequestro, ecc.).
  - SIVES (gestione manuale, eventuale integrazione futura).
  - Penale.
  - Rilascio veicolo (workflow con stati e checklist).
- **Documenti**: upload allegati, foglio consegna personalizzabile, storico versioni.
- **Tag/Sottocategorie**: classificazione libera per ricerche e report.
- **Reportistica**: export CSV/PDF, filtro per stato, periodo, responsabile.
- **Audit**: log chi crea/modifica/cambia stato, timestamp.

## Schema Dati (Supabase)
### Tabella `profiles` (estensione auth.users)
- `id` (uuid, PK, = auth.users.id).
- `username` (text, unico).
- `display_name` (text).
- `role` (text, valori: `admin`, `operatore`, `solo_lettura`).
- `created_at` (timestamp).
- `updated_at` (timestamp).
- `created_by` (uuid → auth.users, nullable).
- `updated_by` (uuid → auth.users, nullable).

### Tabella `vehicles`
- `id` (uuid, PK).
- `plate` (text, unico).
- `vin` (text).
- `brand` (text).
- `model` (text).
- `color` (text).
- `year` (smallint).
- `notes` (text).
- `created_at`, `updated_at`.
- `created_by`, `updated_by` (uuid → auth.users).

### Tabella `cases`
- `id` (uuid, PK).
- `vehicle_id` (uuid → `vehicles`).
- `case_number` (text, unico).
- `procedure_type` (enum: `amministrativo`, `sives`, `penale`, `rilascio`).
- `subcategory` (text → es. “fermo”, “sequestro”).
- `status` (enum: `aperto`, `in_lavorazione`, `in_attesa`, `chiuso`).
- `opened_at`, `closed_at`.
- `description` (text).
- `location` (text, deposito).
- `created_at`, `updated_at`, `created_by`, `updated_by`.

### Tabella `seizure_case_details`
- `case_id` (uuid, PK → `cases`).
- `seizure_date` (date).
- `enforcement_body` (text).
- `offender_details` (text).
- `plate_number` (text).
- `vin_number` (text).
- `vehicle_type` (enum: `ciclomotori`, `motocicli`, `autovetture`, `autocarri`).
- `vehicle_brand_model` (text).
- `vehicle_weight` (text).
- `intervention_type` (enum: `diurno`, `notturno`, `festivo`).
- `carrier_one` (text).
- `carrier_one_km` (numeric).
- `carrier_two` (text).
- `carrier_two_km` (numeric).
- `entry_date` (date).
- `entry_reason` (text).
- `exit_date` (date).
- `exit_reason` (text).
- `custody_duration` (text).
- `custody_costs` (text).
- `procedure_number` (text).
- `destination_office` (text).
- `request_date` (date).
- `invoice_date` (date).
- `invoice_number` (text).
- `invoice_amount` (text).
- `notes` (text).
- `created_at`, `updated_at`.

### Tabella `case_status_history`
- `id` (uuid, PK).
- `case_id` (uuid → `cases`).
- `status` (enum come sopra).
- `notes` (text).
- `changed_at` (timestamp).
- `changed_by` (uuid → auth.users).

### Tabella `people`
- `id` (uuid, PK).
- `full_name` (text).
- `tax_code` (text).
- `phone` (text).
- `email` (text).
- `address` (text).
- `notes` (text).
- `created_at`, `updated_at`.

### Tabella `case_people`
- `id` (uuid, PK).
- `case_id` (uuid → `cases`).
- `person_id` (uuid → `people`).
- `role` (enum: `proprietario`, `custode`, `operatore`, `referente_legale`).
- `notes` (text).
- `created_at`.

### Tabella `tags`
- `id` (uuid, PK).
- `label` (text).
- `parent_id` (uuid → `tags`, opzionale per sottocategorie).
- `created_at`.

### Tabella `case_tags`
- `case_id` (uuid → `cases`, PK parte).
- `tag_id` (uuid → `tags`, PK parte).

### Tabella `documents`
- `id` (uuid, PK).
- `case_id` (uuid → `cases`).
- `title` (text).
- `file_path` (text → Supabase Storage).
- `file_type` (text).
- `generated` (boolean, se creato dall’app).
- `created_at`, `created_by`.

### Tabella `settings`
- `key` (text, PK).
- `value` (jsonb) → es. template foglio consegna, preferenze report.

## Policy e Sicurezza
- Abilitare Row Level Security su tutte le tabelle.
- Consentire lettura/scrittura solo a utenti autenticati.
- Policy granulari su `profiles.role` (es. `solo_lettura` non può modificare).
- Bucket Storage privati; accesso tramite signed URL o download via Edge Function.
- Audit log con `created_by`, `updated_by`, `changed_by`.

## Flussi Principali
- **Login** → recupero profilo → memorizzazione sessione Supabase.
- **Gestione utenti (admin)**:
  1. L’admin accede alla vista utenti.
  2. Crea nuovo account (username, email, ruolo).
  3. Invia password iniziale o genera link reset.
  4. Possibilità di sospendere/riattivare o cambiare ruolo.
- **Creazione pratica**:
  1. Seleziona/crea veicolo.
  2. Associa persone e tag.
  3. Imposta stato iniziale (es. `aperto`).
  4. Compila i campi specifici del sequestro (tab `seizure_case_details`).
  5. Salva documento iniziale (verbale sequestro).
- **Aggiornamento stato**: push in `case_status_history`, update `cases.status`.
- **Foglio consegna**:
  1. Recupera dati pratica/veicolo.
  2. Genera PDF con template personalizzabile.
  3. Salva su Supabase Storage e registra in `documents`.
- **Report mezzi**:
  - Query filtrata su `cases` + join `vehicles`, `tags`.
  - Export PDF/CSV locale o upload in `reports`.

## Roadmap
1. **Setup progetto**
   - Inizializza repo Git.
   - Configura Tauri + React.
   - Integra SDK Supabase (anon/public).
2. **Schema Supabase**
   - Definisci tabelle SQL.
   - Applica RLS + policy ruoli.
   - Popola dati seed (tag standard, ruoli).
3. **Autenticazione & gestione utenti**
   - Schermata login.
   - Gestione sessione + refresh token.
   - Vista amministrazione utenti (crea, resetta password, assegna ruoli).
4. **Anagrafiche base**
   - CRUD veicoli, persone.
5. **Gestione pratiche**
   - Vista elenco + dettaglio.
   - Workflow stati + storico.
   - Form dedicato per i campi sequestro.
6. **Documenti**
   - Upload/download Storage.
   - Generazione foglio consegna.
7. **Reportistica**
   - Filtri, export CSV/PDF.
8. **Refinement**
   - Audit log UI, notifiche, impostazioni template.
9. **Distribuzione**
   - Build Tauri.
   - Setup auto-update (se richiesto).

## Configurazione Ambiente
- `.env` (non committare in repository pubblico):
  - `VITE_SUPABASE_URL=https://prrymavtfhmdfsglnatj.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycnltYXZ0ZmhtZGZzZ2xuYXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDIyMjYsImV4cCI6MjA3ODUxODIyNn0.3yuldIRWCIZMAVWcHkhGmUT0dC5tQJ6UiK7XvkGEdV8`
  - `SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycnltYXZ0ZmhtZGZzZ2xuYXRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjk0MjIyNiwiZXhwIjoyMDc4NTE4MjI2fQ.gK3BkBv7AU1lrq0mkWSEtuJhxRJQv5dWcCLqPhcEz6E`
- Per le Edge Functions, utilizzare il `SERVICE_ROLE_KEY` solo lato server (mai spedito al client).
- Salvare i template foglio consegna in Supabase Storage (`templates/`), con versione di default in `settings`.

## Note Aperte
- Valutare modalità offline (cache locale) se richiesta.
- Definire libreria definitiva per generazione PDF (es. `pdf-lib`, `react-pdf`, Edge Function con `pdfkit`).
- Prevedere eventuale sincronizzazione con sistemi esterni (es. import SIVES).
- Definire formato standard per numerazione pratiche (`CASE-YYYY-####`).


