import { supabase } from '../../lib/supabaseClient';
import type {
  CaseRecord,
  DestinationOfficeFormData,
  DestinationOfficeRecord,
  SeizureCaseDetails,
  SeizureCaseFormData,
  VehicleSummary,
  VehicleTypeOption,
  InterventionTypeOption,
} from './types';

const procedureTypeDefault = 'amministrativo';
const subcategoryDefault = 'sequestro';
const defaultStatus = 'aperto';

const normalizeString = (value: string) => value?.trim() || null;
const normalizeDate = (value: string) => (value ? value : null);

const parseNumberOrNull = (value: string) => {
  if (value === '') return null;
  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const toVehicleType = (value: string): VehicleTypeOption | null => {
  if (value === 'ciclomotori' || value === 'motocicli' || value === 'autovetture' || value === 'autocarri') {
    return value;
  }
  return null;
};

const toInterventionType = (value: string): InterventionTypeOption | null => {
  if (value === 'diurno' || value === 'notturno' || value === 'festivo') {
    return value;
  }
  return null;
};

type SupabaseCaseRow = {
  id: string;
  case_number: string;
  status: string;
  procedure_type: string;
  subcategory: string | null;
  opened_at: string | null;
  created_at: string;
  vehicle_id: string | null;
  destination_office_id: string | null;
  board_key: string | null;
  internal_number: string | null;
  vehicles: VehicleSummary | VehicleSummary[] | null;
  seizure_case_details: SeizureCaseDetails | SeizureCaseDetails[] | null;
  destination_offices: DestinationOfficeRecord | DestinationOfficeRecord[] | null;
};

export async function fetchCases(): Promise<CaseRecord[]> {
  const { data, error } = await supabase
    .from('cases')
    .select(
      `
      id,
      case_number,
      status,
      procedure_type,
      subcategory,
      opened_at,
      created_at,
      vehicle_id,
      destination_office_id,
      board_key,
      internal_number,
      vehicles:vehicle_id (
        id,
        plate,
        vin,
        brand,
        model,
        color
      ),
      destination_offices:destination_office_id (
        id,
        office_type,
        name,
        tax_code,
        vat_number,
        address,
        city,
        province,
        postal_code,
        phone,
        email,
        pec,
        notes
      ),
      seizure_case_details (
        seizure_date,
        enforcement_body,
        offender_details,
        plate_number,
        vin_number,
        vehicle_type,
        vehicle_brand_model,
        vehicle_weight,
        intervention_type,
        carrier_one,
        carrier_one_km,
        carrier_two,
        carrier_two_km,
        entry_date,
        entry_reason,
        exit_date,
        exit_reason,
        custody_duration,
        custody_costs,
        procedure_number,
        destination_office,
        destination_office_id,
        request_date,
        invoice_date,
        invoice_number,
        invoice_amount,
        notes
      )
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Errore caricando le pratiche', error);
    throw error;
  }

  const raw = (data ?? []) as SupabaseCaseRow[];

  return raw.map((item) => ({
    id: item.id,
    case_number: item.case_number,
    status: item.status,
    procedure_type: item.procedure_type,
    subcategory: item.subcategory,
    opened_at: item.opened_at,
    created_at: item.created_at,
    vehicle_id: item.vehicle_id,
    destination_office_id: item.destination_office_id,
    board_key: item.board_key,
    internal_number: item.internal_number,
    vehicles: Array.isArray(item.vehicles) ? item.vehicles[0] ?? null : item.vehicles,
    seizure_case_details: Array.isArray(item.seizure_case_details)
      ? item.seizure_case_details[0] ?? null
      : item.seizure_case_details,
    destination_office: Array.isArray(item.destination_offices)
      ? item.destination_offices[0] ?? null
      : item.destination_offices,
  })) as CaseRecord[];
}

export async function createCaseFromForm(
  form: SeizureCaseFormData,
  options: {
    categoryKey: string;
    subCategoryLabel: string | null;
    procedureType: string;
  }
) {
  const plate = form.numero_targa.trim().toUpperCase();
  const vehicleBrandModel = form.marca_modello_veicolo.trim();
  const nowIsoDate = new Date().toISOString().slice(0, 10);

  const { data: vehicleData, error: vehicleError } = await supabase
    .from('vehicles')
    .upsert(
      [
        {
          plate,
          vin: normalizeString(form.numero_telaio),
          brand: vehicleBrandModel || null,
          model: null,
          color: null,
          notes: normalizeString(form.note_varie),
        },
      ],
      {
        onConflict: 'plate',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (vehicleError) {
    console.error('Errore creazione/aggiornamento veicolo', vehicleError);
    throw vehicleError;
  }

  const caseNumber =
    normalizeString(form.numero_procedimento) ||
    `CASE-${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}`;

  const openedAt = normalizeDate(form.data_sequestro) || nowIsoDate;

  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .insert([
      {
        vehicle_id: vehicleData.id,
        case_number: caseNumber,
        procedure_type: options.procedureType || procedureTypeDefault,
        subcategory: options.subCategoryLabel || subcategoryDefault,
        status: defaultStatus,
        opened_at: openedAt,
        closed_at: null,
        description: normalizeString(form.note_varie),
        location: normalizeString(form.ufficio_destinatario),
        destination_office_id: form.destination_office_id ?? null,
        board_key: normalizeString(form.chiave_bacheca),
        internal_number: normalizeString(form.numero_interno_pratica),
      },
    ])
    .select()
    .single();

  if (caseError) {
    console.error('Errore creazione pratica', caseError);
    throw caseError;
  }

  const detailsPayload = {
    case_id: caseData.id,
    seizure_date: normalizeDate(form.data_sequestro),
    enforcement_body: normalizeString(form.organo_accertatore),
    offender_details: normalizeString(form.generalita_trasgressore),
    plate_number: plate,
    vin_number: normalizeString(form.numero_telaio),
    vehicle_type: toVehicleType(form.tipo_veicolo) ?? null,
    vehicle_brand_model: vehicleBrandModel || null,
    vehicle_weight: normalizeString(form.peso_veicolo),
    intervention_type: toInterventionType(form.tipo_intervento) ?? null,
    carrier_one: normalizeString(form.latore_1_trasporto),
    carrier_one_km: parseNumberOrNull(form.km_1_trasporto),
    carrier_two: normalizeString(form.latore_2_trasporto),
    carrier_two_km: parseNumberOrNull(form.km_2_trasporto),
    entry_date: normalizeDate(form.data_entrata),
    entry_reason: normalizeString(form.motivo_entrata),
    exit_date: normalizeDate(form.data_uscita),
    exit_reason: normalizeString(form.motivo_uscita),
    custody_duration: normalizeString(form.durata_custodia),
    custody_costs: normalizeString(form.oneri_custodia),
    procedure_number: normalizeString(form.numero_procedimento),
    destination_office: normalizeString(form.ufficio_destinatario),
    destination_office_id: form.destination_office_id ?? null,
    request_date: normalizeDate(form.data_richiesta),
    invoice_date: normalizeDate(form.data_fattura),
    invoice_number: normalizeString(form.numero_fattura),
    invoice_amount: normalizeString(form.importo_fattura),
    notes: normalizeString(form.note_varie),
  };

  const { error: detailsError } = await supabase
    .from('seizure_case_details')
    .insert([detailsPayload]);

  if (detailsError) {
    console.error('Errore salvataggio dettagli sequestro', detailsError);
    throw detailsError;
  }

  const { error: historyError } = await supabase
    .from('case_status_history')
    .insert([
      {
        case_id: caseData.id,
        status: defaultStatus,
        notes: 'Pratica creata',
      },
    ]);

  if (historyError) {
    console.error('Errore salvataggio storico stato', historyError);
    throw historyError;
  }

  return caseData;
}

export async function fetchDestinationOffices(): Promise<DestinationOfficeRecord[]> {
  const { data, error } = await supabase
    .from('destination_offices')
    .select(
      `
      id,
      office_type,
      name,
      tax_code,
      vat_number,
      address,
      city,
      province,
      postal_code,
      phone,
      email,
      pec,
      notes
    `
    )
    .order('name', { ascending: true });

  if (error) {
    console.error('Errore caricando gli uffici destinatari', error);
    throw error;
  }

  return (data ?? []) as DestinationOfficeRecord[];
}

export async function createDestinationOffice(
  payload: DestinationOfficeFormData
): Promise<DestinationOfficeRecord> {
  const { data, error } = await supabase
    .from('destination_offices')
    .insert([
      {
        office_type: payload.office_type,
        name: payload.name.trim(),
        tax_code: normalizeString(payload.tax_code),
        vat_number: normalizeString(payload.vat_number),
        address: normalizeString(payload.address),
        city: normalizeString(payload.city),
        province: normalizeString(payload.province),
        postal_code: normalizeString(payload.postal_code),
        phone: normalizeString(payload.phone),
        email: normalizeString(payload.email),
        pec: normalizeString(payload.pec),
        notes: normalizeString(payload.notes),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Errore creazione ufficio destinatario', error);
    throw error;
  }

  return data as DestinationOfficeRecord;
}

export async function updateDestinationOffice(
  id: string,
  payload: Partial<DestinationOfficeFormData>
): Promise<DestinationOfficeRecord> {
  const updates: Record<string, unknown> = {};

  if (payload.office_type) updates.office_type = payload.office_type;
  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.tax_code !== undefined) updates.tax_code = normalizeString(payload.tax_code);
  if (payload.vat_number !== undefined) updates.vat_number = normalizeString(payload.vat_number);
  if (payload.address !== undefined) updates.address = normalizeString(payload.address);
  if (payload.city !== undefined) updates.city = normalizeString(payload.city);
  if (payload.province !== undefined) updates.province = normalizeString(payload.province);
  if (payload.postal_code !== undefined) updates.postal_code = normalizeString(payload.postal_code);
  if (payload.phone !== undefined) updates.phone = normalizeString(payload.phone);
  if (payload.email !== undefined) updates.email = normalizeString(payload.email);
  if (payload.pec !== undefined) updates.pec = normalizeString(payload.pec);
  if (payload.notes !== undefined) updates.notes = normalizeString(payload.notes);

  const { data, error } = await supabase
    .from('destination_offices')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Errore aggiornamento ufficio destinatario', error);
    throw error;
  }

  return data as DestinationOfficeRecord;
}

export async function deleteDestinationOffices(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('destination_offices').delete().in('id', ids);
  if (error) {
    console.error('Errore eliminazione uffici destinatari', error);
    throw error;
  }
}

export async function updateCaseFromForm(
  caseId: string,
  form: SeizureCaseFormData,
  options: {
    categoryKey: string;
    subCategoryLabel: string | null;
    procedureType: string;
  },
  context: {
    vehicleId: string | null;
    caseNumber: string;
  }
) {
  const plate = form.numero_targa.trim().toUpperCase();
  const vehicleBrandModel = form.marca_modello_veicolo.trim();

  const vehiclePayload = {
    id: context.vehicleId ?? undefined,
    plate,
    vin: normalizeString(form.numero_telaio),
    brand: vehicleBrandModel || null,
    model: null,
    color: null,
    notes: normalizeString(form.note_varie),
  };

  const { data: vehicleData, error: vehicleError } = await supabase
    .from('vehicles')
    .upsert([vehiclePayload], { onConflict: 'id', ignoreDuplicates: false })
    .select()
    .single();

  if (vehicleError) {
    console.error('Errore aggiornamento veicolo', vehicleError);
    throw vehicleError;
  }

  const caseNumberValue =
    normalizeString(form.numero_procedimento) ?? context.caseNumber ?? `CASE-${caseId}`;

  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .update({
      vehicle_id: vehicleData.id,
      case_number: caseNumberValue,
      procedure_type: options.procedureType,
      subcategory: options.subCategoryLabel || subcategoryDefault,
      description: normalizeString(form.note_varie),
      location: normalizeString(form.ufficio_destinatario),
      destination_office_id: form.destination_office_id ?? null,
      board_key: normalizeString(form.chiave_bacheca),
      internal_number: normalizeString(form.numero_interno_pratica),
    })
    .eq('id', caseId)
    .select()
    .single();

  if (caseError) {
    console.error('Errore aggiornamento pratica', caseError);
    throw caseError;
  }

  const detailsPayload = {
    case_id: caseId,
    seizure_date: normalizeDate(form.data_sequestro),
    enforcement_body: normalizeString(form.organo_accertatore),
    offender_details: normalizeString(form.generalita_trasgressore),
    plate_number: plate,
    vin_number: normalizeString(form.numero_telaio),
    vehicle_type: toVehicleType(form.tipo_veicolo) ?? null,
    vehicle_brand_model: vehicleBrandModel || null,
    vehicle_weight: normalizeString(form.peso_veicolo),
    intervention_type: toInterventionType(form.tipo_intervento) ?? null,
    carrier_one: normalizeString(form.latore_1_trasporto),
    carrier_one_km: parseNumberOrNull(form.km_1_trasporto),
    carrier_two: normalizeString(form.latore_2_trasporto),
    carrier_two_km: parseNumberOrNull(form.km_2_trasporto),
    entry_date: normalizeDate(form.data_entrata),
    entry_reason: normalizeString(form.motivo_entrata),
    exit_date: normalizeDate(form.data_uscita),
    exit_reason: normalizeString(form.motivo_uscita),
    custody_duration: normalizeString(form.durata_custodia),
    custody_costs: normalizeString(form.oneri_custodia),
    procedure_number: normalizeString(form.numero_procedimento) ?? caseNumberValue,
    destination_office: normalizeString(form.ufficio_destinatario),
    destination_office_id: form.destination_office_id ?? null,
    request_date: normalizeDate(form.data_richiesta),
    invoice_date: normalizeDate(form.data_fattura),
    invoice_number: normalizeString(form.numero_fattura),
    invoice_amount: normalizeString(form.importo_fattura),
    notes: normalizeString(form.note_varie),
  };

  const { error: detailsError } = await supabase
    .from('seizure_case_details')
    .update(detailsPayload)
    .eq('case_id', caseId);

  if (detailsError) {
    console.error('Errore aggiornamento dettagli sequestro', detailsError);
    throw detailsError;
  }

  return caseData;
}

export async function deleteCases(caseIds: string[]): Promise<void> {
  if (caseIds.length === 0) return;
  const { error } = await supabase.from('cases').delete().in('id', caseIds);
  if (error) {
    console.error('Errore eliminazione pratiche', error);
    throw error;
  }
}

// Sistema di locking per pratiche
export type CaseLockInfo = {
  case_id: string;
  locked_by: string;
  locked_at: string;
  expires_at: string;
  locked_by_username?: string | null;
  locked_by_display_name?: string | null;
};

export async function acquireCaseLock(caseId: string): Promise<CaseLockInfo> {
  // Prima pulisci i lock scaduti
  await supabase.rpc('cleanup_expired_locks');
  
  // Verifica se esiste già un lock valido
  const { data: existingLock, error: checkError } = await supabase
    .from('case_edit_locks')
    .select(
      `
      case_id,
      locked_by,
      locked_at,
      expires_at,
      profiles:locked_by (
        username,
        display_name
      )
      `
    )
    .eq('case_id', caseId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (checkError) {
    console.error('Errore verifica lock', checkError);
    throw checkError;
  }

  if (existingLock) {
    const profile = Array.isArray(existingLock.profiles) 
      ? existingLock.profiles[0] 
      : existingLock.profiles;
    
    throw new Error(
      `La pratica è già in modifica da ${profile?.display_name || profile?.username || 'un altro utente'}.`
    );
  }

  // Crea il nuovo lock
  const { data: newLock, error: lockError } = await supabase
    .from('case_edit_locks')
    .insert([
      {
        case_id: caseId,
        locked_by: (await supabase.auth.getUser()).data.user?.id,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minuti
      },
    ])
    .select(
      `
      case_id,
      locked_by,
      locked_at,
      expires_at,
      profiles:locked_by (
        username,
        display_name
      )
      `
    )
    .single();

  if (lockError) {
    console.error('Errore acquisizione lock', lockError);
    throw lockError;
  }

  const profile = Array.isArray(newLock.profiles) 
    ? newLock.profiles[0] 
    : newLock.profiles;

  return {
    case_id: newLock.case_id,
    locked_by: newLock.locked_by,
    locked_at: newLock.locked_at,
    expires_at: newLock.expires_at,
    locked_by_username: profile?.username ?? null,
    locked_by_display_name: profile?.display_name ?? null,
  };
}

export async function releaseCaseLock(caseId: string): Promise<void> {
  const { error } = await supabase
    .from('case_edit_locks')
    .delete()
    .eq('case_id', caseId);

  if (error) {
    console.error('Errore rilascio lock', error);
    throw error;
  }
}

export async function checkCaseLock(caseId: string): Promise<CaseLockInfo | null> {
  const { data, error } = await supabase
    .from('case_edit_locks')
    .select(
      `
      case_id,
      locked_by,
      locked_at,
      expires_at,
      profiles:locked_by (
        username,
        display_name
      )
      `
    )
    .eq('case_id', caseId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error('Errore verifica lock', error);
    throw error;
  }

  if (!data) return null;

  const profile = Array.isArray(data.profiles) 
    ? data.profiles[0] 
    : data.profiles;

  return {
    case_id: data.case_id,
    locked_by: data.locked_by,
    locked_at: data.locked_at,
    expires_at: data.expires_at,
    locked_by_username: profile?.username ?? null,
    locked_by_display_name: profile?.display_name ?? null,
  };
}

