-- Rende case_number opzionale (nullable) e rimuove il vincolo unique
-- Il numero procedimento non è più obbligatorio, solo il numero interno pratica lo è

DO $$
BEGIN
  -- Verifica se la tabella cases esiste
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'cases'
  ) THEN
    -- Rimuovi il vincolo unique se esiste
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'cases_case_number_key'
    ) THEN
      ALTER TABLE public.cases DROP CONSTRAINT cases_case_number_key;
    END IF;

    -- Rendi case_number nullable
    ALTER TABLE public.cases ALTER COLUMN case_number DROP NOT NULL;

    RAISE NOTICE 'case_number reso opzionale con successo.';
  ELSE
    RAISE NOTICE 'Tabella cases non esiste ancora. Eseguire prima lo schema iniziale.';
  END IF;
END $$;

