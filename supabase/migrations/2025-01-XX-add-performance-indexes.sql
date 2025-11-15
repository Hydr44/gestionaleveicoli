-- Indici per ottimizzare le performance con migliaia di pratiche
-- Eseguire dal SQL Editor di Supabase

-- Indici sulla tabella cases (più importante)
CREATE INDEX IF NOT EXISTS idx_cases_internal_number ON public.cases (internal_number) WHERE internal_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON public.cases (case_number) WHERE case_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases (status);
CREATE INDEX IF NOT EXISTS idx_cases_procedure_type ON public.cases (procedure_type);
CREATE INDEX IF NOT EXISTS idx_cases_subcategory ON public.cases (subcategory) WHERE subcategory IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON public.cases (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_opened_at ON public.cases (opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_vehicle_id ON public.cases (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_cases_destination_office_id ON public.cases (destination_office_id) WHERE destination_office_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_board_key ON public.cases (board_key) WHERE board_key IS NOT NULL;

-- Indice composito per ordinamento comune
CREATE INDEX IF NOT EXISTS idx_cases_internal_number_created_at ON public.cases (internal_number NULLS LAST, created_at DESC);

-- Indici sulla tabella seizure_case_details (per ricerche)
CREATE INDEX IF NOT EXISTS idx_seizure_details_plate_number ON public.seizure_case_details (plate_number) WHERE plate_number IS NOT NULL;
-- Indice normale per offender_details (più compatibile, funziona bene con LIKE/ILIKE)
CREATE INDEX IF NOT EXISTS idx_seizure_details_offender_details ON public.seizure_case_details (offender_details) WHERE offender_details IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seizure_details_seizure_date ON public.seizure_case_details (seizure_date) WHERE seizure_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seizure_details_enforcement_body ON public.seizure_case_details (enforcement_body) WHERE enforcement_body IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seizure_details_vehicle_brand_model ON public.seizure_case_details (vehicle_brand_model) WHERE vehicle_brand_model IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seizure_details_procedure_number ON public.seizure_case_details (procedure_number) WHERE procedure_number IS NOT NULL;

-- Indici sulla tabella vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON public.vehicles (plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON public.vehicles (vin) WHERE vin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_brand ON public.vehicles (brand) WHERE brand IS NOT NULL;

-- Indici sulla tabella destination_offices
CREATE INDEX IF NOT EXISTS idx_destination_offices_name ON public.destination_offices (name);
CREATE INDEX IF NOT EXISTS idx_destination_offices_tax_code ON public.destination_offices (tax_code) WHERE tax_code IS NOT NULL;

-- Commenti esplicativi
COMMENT ON INDEX idx_cases_internal_number IS 'Ottimizza ricerca e ordinamento per numero interno pratica';
COMMENT ON INDEX idx_cases_internal_number_created_at IS 'Ottimizza ordinamento combinato (numero interno + data creazione)';
COMMENT ON INDEX idx_seizure_details_offender_details IS 'Ottimizza ricerca su generalità trasgressore (LIKE/ILIKE)';

