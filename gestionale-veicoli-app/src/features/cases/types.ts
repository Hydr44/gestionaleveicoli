export type VehicleTypeOption = 'ciclomotori' | 'motocicli' | 'autovetture' | 'autocarri';
export type InterventionTypeOption = 'diurno' | 'notturno' | 'festivo';

export type OfficeTypeOption = 'persona_fisica' | 'persona_giuridica';

export type DestinationOfficeFormData = {
  office_type: OfficeTypeOption;
  name: string;
  tax_code: string;
  vat_number: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  phone: string;
  email: string;
  pec: string;
  notes: string;
};

export type SeizureCaseFormData = {
  data_sequestro: string;
  organo_accertatore: string;
  generalita_trasgressore: string;
  numero_targa: string;
  numero_telaio: string;
  tipo_veicolo: VehicleTypeOption;
  marca_modello_veicolo: string;
  peso_veicolo: string;
  tipo_intervento: InterventionTypeOption;
  latore_1_trasporto: string;
  km_1_trasporto: string;
  latore_2_trasporto: string;
  km_2_trasporto: string;
  data_entrata: string;
  motivo_entrata: string;
  data_uscita: string;
  motivo_uscita: string;
  durata_custodia: string;
  oneri_custodia: string;
  numero_procedimento: string;
  destination_office_id: string | null;
  ufficio_destinatario: string;
  data_richiesta: string;
  data_fattura: string;
  numero_fattura: string;
  importo_fattura: string;
  note_varie: string;
  chiave_bacheca: string;
  numero_interno_pratica: string;
};

export type SeizureCaseDetails = {
  case_id?: string;
  seizure_date: string | null;
  enforcement_body: string | null;
  offender_details: string | null;
  plate_number: string | null;
  vin_number: string | null;
  vehicle_type: VehicleTypeOption | null;
  vehicle_brand_model: string | null;
  vehicle_weight: string | null;
  intervention_type: InterventionTypeOption | null;
  carrier_one: string | null;
  carrier_one_km: number | null;
  carrier_two: string | null;
  carrier_two_km: number | null;
  entry_date: string | null;
  entry_reason: string | null;
  exit_date: string | null;
  exit_reason: string | null;
  custody_duration: string | null;
  custody_costs: string | null;
  procedure_number: string | null;
  destination_office: string | null;
  destination_office_id?: string | null;
  request_date: string | null;
  invoice_date: string | null;
  invoice_number: string | null;
  invoice_amount: string | null;
  notes: string | null;
};

export type VehicleSummary = {
  id: string;
  plate: string;
  vin: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
};

export type CaseRecord = {
  id: string;
  case_number: string;
  status: string;
  procedure_type: string;
  subcategory?: string | null;
  opened_at: string | null;
  created_at: string;
  vehicle_id?: string | null;
  destination_office_id?: string | null;
  board_key?: string | null;
  internal_number?: string | null;
  vehicles?: VehicleSummary | null;
  seizure_case_details?: SeizureCaseDetails | null;
  destination_office?: DestinationOfficeRecord | null;
};

export type CaseCategoryOption = {
  key: string;
  label: string;
  subOptions?: Array<{
    key: string;
    label: string;
  }>;
};

export type DestinationOfficeRecord = {
  id: string;
  office_type: OfficeTypeOption;
  name: string;
  tax_code: string | null;
  vat_number: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  pec: string | null;
  notes: string | null;
};

export type ReleasePrintPayload = {
  caseId?: string;
  procedimentoNumero: string;
  dispostoDa: string;
  ufficioDi: string;
  dataDisposizione: string;
  oraPresenza: string;
  nome: string;
  luogoNascita: string;
  dataNascita: string;
  residenza: string;
  via: string;
  marca: string;
  targa: string;
  telaio: string;
  dataGela: string;
};

