-- Aggiunge vincolo di unicità per internal_number per categoria/sottocategoria
-- Permette di avere lo stesso numero interno pratica in categorie diverse
-- (es. SIVES "01", ART 8 "01", PENALE "01")

-- Prima verifica se la tabella esiste, poi verifica se le colonne esistono già, altrimenti le aggiunge
DO $$
BEGIN
  -- Verifica se la tabella cases esiste
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'cases'
  ) THEN
    -- Aggiungi board_key se non esiste
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'cases' 
        AND column_name = 'board_key'
    ) THEN
      ALTER TABLE public.cases ADD COLUMN board_key text;
    END IF;

    -- Aggiungi internal_number se non esiste
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'cases' 
        AND column_name = 'internal_number'
    ) THEN
      ALTER TABLE public.cases ADD COLUMN internal_number text;
    END IF;
  ELSE
    RAISE NOTICE 'Tabella cases non esiste ancora. Eseguire prima lo schema iniziale.';
  END IF;
END $$;

-- Rimuovi eventuali indici unici esistenti su internal_number (se presenti)
DROP INDEX IF EXISTS cases_internal_number_unique;
DROP INDEX IF EXISTS cases_internal_number_idx;
DROP INDEX IF EXISTS cases_internal_number_category_unique;

-- Crea indice unico composito solo se la tabella esiste
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'cases'
  ) THEN
    -- Crea indice unico composito: internal_number deve essere unico per (procedure_type, subcategory)
    -- Questo permette di avere lo stesso numero in categorie diverse
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'cases' 
        AND indexname = 'cases_internal_number_category_unique'
    ) THEN
      CREATE UNIQUE INDEX cases_internal_number_category_unique 
      ON public.cases (procedure_type, COALESCE(subcategory, ''), internal_number)
      WHERE internal_number IS NOT NULL AND internal_number != '';
      
      -- Commento esplicativo
      COMMENT ON INDEX cases_internal_number_category_unique IS 
      'Garantisce che internal_number sia unico all''interno della stessa categoria/sottocategoria. Permette duplicati tra categorie diverse (es. SIVES "01", ART 8 "01", PENALE "01")';
    END IF;
  ELSE
    RAISE NOTICE 'Tabella cases non esiste ancora. Eseguire prima lo schema iniziale.';
  END IF;
END $$;

