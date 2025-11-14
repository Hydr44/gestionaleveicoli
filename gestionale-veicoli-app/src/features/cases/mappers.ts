import type { CaseRecord, SeizureCaseFormData } from './types';

export function mapCaseRecordToForm(record: CaseRecord): SeizureCaseFormData {
  const details = record.seizure_case_details;
  const vehicle = record.vehicles;

  return {
    data_sequestro: details?.seizure_date ?? '',
    organo_accertatore: details?.enforcement_body ?? '',
    generalita_trasgressore: details?.offender_details ?? '',
    numero_targa: details?.plate_number ?? vehicle?.plate ?? '',
    numero_telaio: details?.vin_number ?? vehicle?.vin ?? '',
    tipo_veicolo: (details?.vehicle_type as SeizureCaseFormData['tipo_veicolo']) ?? 'autovetture',
    marca_modello_veicolo: details?.vehicle_brand_model ?? vehicle?.brand ?? '',
    peso_veicolo: details?.vehicle_weight ?? '',
    tipo_intervento:
      (details?.intervention_type as SeizureCaseFormData['tipo_intervento']) ?? 'diurno',
    latore_1_trasporto: details?.carrier_one ?? '',
    km_1_trasporto:
      details?.carrier_one_km !== null && details?.carrier_one_km !== undefined
        ? String(details.carrier_one_km)
        : '',
    latore_2_trasporto: details?.carrier_two ?? '',
    km_2_trasporto:
      details?.carrier_two_km !== null && details?.carrier_two_km !== undefined
        ? String(details.carrier_two_km)
        : '',
    data_entrata: details?.entry_date ?? '',
    motivo_entrata: details?.entry_reason ?? '',
    data_uscita: details?.exit_date ?? '',
    motivo_uscita: details?.exit_reason ?? '',
    durata_custodia: details?.custody_duration ?? '',
    oneri_custodia: details?.custody_costs ?? '',
    numero_procedimento: details?.procedure_number ?? record.case_number ?? '',
    destination_office_id:
      record.destination_office_id ??
      details?.destination_office_id ??
      null,
    ufficio_destinatario:
      details?.destination_office ??
      record.destination_office?.name ??
      '',
    data_richiesta: details?.request_date ?? '',
    data_fattura: details?.invoice_date ?? '',
    numero_fattura: details?.invoice_number ?? '',
    importo_fattura: details?.invoice_amount ?? '',
    note_varie: details?.notes ?? '',
    chiave_bacheca: record.board_key ?? '',
    numero_interno_pratica: record.internal_number ?? '',
  };
}

