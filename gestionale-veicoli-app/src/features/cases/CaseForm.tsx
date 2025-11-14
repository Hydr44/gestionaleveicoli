import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createDestinationOffice,
  fetchDestinationOffices,
} from './api';
import type {
  SeizureCaseFormData,
  InterventionTypeOption,
  VehicleTypeOption,
  CaseCategoryOption,
  DestinationOfficeFormData,
  DestinationOfficeRecord,
  OfficeTypeOption,
} from './types';

type CaseFormProps = {
  onSubmit: (form: SeizureCaseFormData) => Promise<void>;
  onCancel: () => void;
  categories: CaseCategoryOption[];
  selectedCategoryKey: string;
  selectedSubCategoryKey: string | null;
  mode?: 'create' | 'edit';
  initialForm?: Partial<SeizureCaseFormData> | null;
  onFormChange?: (hasChanges: boolean) => void;
};

const vehicleTypes: VehicleTypeOption[] = ['ciclomotori', 'motocicli', 'autovetture', 'autocarri'];
const interventionTypes: InterventionTypeOption[] = ['diurno', 'notturno', 'festivo'];

const defaultForm: SeizureCaseFormData = {
  data_sequestro: '',
  organo_accertatore: '',
  generalita_trasgressore: '',
  numero_targa: '',
  numero_telaio: '',
  tipo_veicolo: 'autovetture',
  marca_modello_veicolo: '',
  peso_veicolo: '',
  tipo_intervento: 'diurno',
  latore_1_trasporto: '',
  km_1_trasporto: '',
  latore_2_trasporto: '',
  km_2_trasporto: '',
  data_entrata: '',
  motivo_entrata: '',
  data_uscita: '',
  motivo_uscita: '',
  durata_custodia: '',
  oneri_custodia: '',
  numero_procedimento: '',
  destination_office_id: null,
  ufficio_destinatario: '',
  data_richiesta: '',
  data_fattura: '',
  numero_fattura: '',
  importo_fattura: '',
  note_varie: '',
  chiave_bacheca: '',
  numero_interno_pratica: '',
};

const defaultOfficeForm: DestinationOfficeFormData = {
  office_type: 'persona_giuridica',
  name: '',
  tax_code: '',
  vat_number: '',
  address: '',
  city: '',
  province: '',
  postal_code: '',
  phone: '',
  email: '',
  pec: '',
  notes: '',
};

export function CaseForm({
  onSubmit,
  onCancel,
  categories,
  selectedCategoryKey,
  selectedSubCategoryKey,
  mode = 'create',
  initialForm = null,
  onFormChange,
}: CaseFormProps) {
  const [form, setForm] = useState<SeizureCaseFormData>({ ...defaultForm, ...initialForm });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [offices, setOffices] = useState<DestinationOfficeRecord[]>([]);
  const [officesLoading, setOfficesLoading] = useState(false);
  const [officesError, setOfficesError] = useState<string | null>(null);
  const [officeSearch, setOfficeSearch] = useState('');
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [officeSaving, setOfficeSaving] = useState(false);
  const [officeForm, setOfficeForm] = useState<DestinationOfficeFormData>(defaultOfficeForm);

  const hasFormChanges = useMemo(() => {
    const baseForm = initialForm ? { ...defaultForm, ...initialForm } : defaultForm;
    const formString = JSON.stringify(form);
    const baseString = JSON.stringify(baseForm);
    return formString !== baseString || Object.keys(customFieldValues).some(key => customFieldValues[key]?.trim());
  }, [form, initialForm, customFieldValues]);

  useEffect(() => {
    if (onFormChange) {
      onFormChange(hasFormChanges);
    }
  }, [hasFormChanges, onFormChange]);

  const handleCancel = () => {
    if (hasFormChanges) {
      const message = mode === 'edit'
        ? 'Sei sicuro di voler uscire? Le modifiche non salvate verranno perse.'
        : 'Sei sicuro di voler uscire? I dati inseriti verranno persi.';
      if (!window.confirm(message)) {
        return;
      }
    }
    onCancel();
  };

  const handleChange = (
    field: keyof SeizureCaseFormData,
    value: string | VehicleTypeOption | InterventionTypeOption | null
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const customSummaryEntries = customFieldDefs
        .map((field) => {
          const value = customFieldValues[field.id]?.trim();
          return value ? `${field.label}: ${value}` : null;
        })
        .filter(Boolean) as string[];

      const formEnhanced: SeizureCaseFormData = { ...form };
      if (customSummaryEntries.length > 0) {
        const header = `[Campi personalizzati - ${selectedCategory.label}${
          selectedSubOption ? ` / ${selectedSubOption.label}` : ''
        }]`;
        const addition = `${header}\n${customSummaryEntries.join('\n')}`;
        formEnhanced.note_varie = [form.note_varie?.trim(), addition].filter(Boolean).join('\n\n');
      }

      await onSubmit(formEnhanced);
      setForm(initialForm ? { ...defaultForm, ...initialForm } : defaultForm);
      setCustomFieldValues({});
    } catch (submissionError: unknown) {
      if (submissionError instanceof Error) {
        setError(submissionError.message);
      } else {
        setError('Errore durante il salvataggio della pratica.');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find((cat) => cat.key === selectedCategoryKey) ?? categories[0];
  const subOptions = selectedCategory?.subOptions ?? [];
  const selectedSubOption =
    subOptions.find((sub) => sub.key === selectedSubCategoryKey) ?? subOptions[0] ?? null;
  const customFieldDefs = useMemo(
    () => getCustomFieldDefs(selectedCategoryKey, selectedSubOption?.key ?? null),
    [selectedCategoryKey, selectedSubOption?.key]
  );

  useEffect(() => {
    setCustomFieldValues((prev) => {
      const next: Record<string, string> = {};
      customFieldDefs.forEach((def) => {
        next[def.id] = prev[def.id] ?? '';
      });
      return next;
    });
  }, [customFieldDefs]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, ...initialForm }));
  }, [initialForm]);

  useEffect(() => {
    const loadOffices = async () => {
      setOfficesLoading(true);
      setOfficesError(null);
      try {
        const result = await fetchDestinationOffices();
        setOffices(result);
      } catch (fetchError: unknown) {
        console.error(fetchError);
        setOfficesError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Errore durante il caricamento degli uffici destinatari.'
        );
      } finally {
        setOfficesLoading(false);
      }
    };

    loadOffices();
  }, []);

  const filteredOffices = useMemo(() => {
    const query = officeSearch.trim().toLowerCase();
    if (!query) return offices;
    return offices.filter((office) => {
      const tokens = [
        office.name,
        office.tax_code ?? '',
        office.vat_number ?? '',
        office.city ?? '',
        office.province ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return tokens.includes(query);
    });
  }, [officeSearch, offices]);

  const selectedOffice = form.destination_office_id
    ? offices.find((office) => office.id === form.destination_office_id) ?? null
    : null;

  const resetOfficeForm = () => {
    setOfficeForm(defaultOfficeForm);
  };

  const handleSaveOffice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOfficeSaving(true);
    try {
      const newOffice = await createDestinationOffice(officeForm);
      setOffices((prev) => [...prev, newOffice].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((prev) => ({
        ...prev,
        destination_office_id: newOffice.id,
        ufficio_destinatario: newOffice.name,
      }));
      setOfficeSearch('');
      setShowOfficeModal(false);
      resetOfficeForm();
    } catch (creationError: unknown) {
      console.error(creationError);
      alert(
        creationError instanceof Error
          ? creationError.message
          : 'Errore durante il salvataggio dell’ufficio destinatario.'
      );
    } finally {
      setOfficeSaving(false);
    }
  };

  return (
    <div className="cases-detail-panel form-mode">
      <header className="case-detail-header">
        <div className="case-banner">
          <span className="badge">
            {mode === 'edit' ? 'Modifica pratica' : 'Creazione pratica'}
          </span>
          <h2>{selectedCategory.label}</h2>
          <p>
            {selectedSubOption
              ? selectedSubOption.label
              : 'Compila i dati richiesti per la registrazione della pratica.'}
          </p>
        </div>
        <div className="case-banner-hint">
          <p>
            <strong>Consiglio:</strong> inserisci targa e numero procedimento per generare
            documenti coerenti. Puoi aggiornare i dettagli in qualsiasi momento.
          </p>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      <form className="cases-form" onSubmit={handleSubmit}>
        {customFieldDefs.length > 0 && (
          <section className="custom-fields">
            <h3>Campi personalizzati</h3>
            <div className="custom-field-grid">
              {customFieldDefs.map((field) => (
                <label key={field.id} className="custom-field">
                  <span>{field.label}</span>
                  <input
                    type={field.type ?? 'text'}
                    placeholder={field.placeholder}
                    value={customFieldValues[field.id] ?? ''}
                    onChange={(event) =>
                      setCustomFieldValues((prev) => ({
                        ...prev,
                        [field.id]: event.target.value,
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3>Dati principali</h3>
          <div className="form-grid">
            <label>
              <span>Data sequestro</span>
              <input
                type="date"
                value={form.data_sequestro}
                onChange={(event) => handleChange('data_sequestro', event.target.value)}
              />
            </label>

            <label>
              <span>Numero procedimento</span>
              <input
                type="text"
                value={form.numero_procedimento}
                onChange={(event) => handleChange('numero_procedimento', event.target.value)}
                placeholder="es. CASE-2025-001"
              />
            </label>

            <label>
              <span>Chiave in bacheca</span>
              <input
                type="text"
                value={form.chiave_bacheca}
                onChange={(event) => handleChange('chiave_bacheca', event.target.value)}
                placeholder="es. B-001"
              />
            </label>

            <label>
              <span>Numero interno pratica</span>
              <input
                type="text"
                value={form.numero_interno_pratica}
                onChange={(event) => handleChange('numero_interno_pratica', event.target.value)}
                placeholder="es. INT-2025-001"
              />
            </label>

            <label>
              <span>Organo accertatore</span>
              <input
                type="text"
                value={form.organo_accertatore}
                onChange={(event) => handleChange('organo_accertatore', event.target.value)}
              />
            </label>

            <label>
              <span>Generalità trasgressore</span>
              <input
                type="text"
                value={form.generalita_trasgressore}
                onChange={(event) => handleChange('generalita_trasgressore', event.target.value)}
              />
            </label>
          </div>
        </section>

        <section>
          <h3>Dati veicolo</h3>
          <div className="form-grid">
            <label>
              <span>Numero targa</span>
              <input
                type="text"
                value={form.numero_targa}
                onChange={(event) => handleChange('numero_targa', event.target.value.toUpperCase())}
                required
              />
            </label>

            <label>
              <span>Numero telaio</span>
              <input
                type="text"
                value={form.numero_telaio}
                onChange={(event) => handleChange('numero_telaio', event.target.value)}
              />
            </label>

            <label>
              <span>Tipo veicolo</span>
              <div className="select-wrapper">
                <select
                  value={form.tipo_veicolo}
                  onChange={(event) => handleChange('tipo_veicolo', event.target.value as VehicleTypeOption)}
                >
                  {vehicleTypes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <span className="chevron">▾</span>
              </div>
            </label>

            <label>
              <span>Marca e modello</span>
              <input
                type="text"
                value={form.marca_modello_veicolo}
                onChange={(event) => handleChange('marca_modello_veicolo', event.target.value)}
              />
            </label>

            <label>
              <span>Peso veicolo</span>
              <input
                type="text"
                value={form.peso_veicolo}
                onChange={(event) => handleChange('peso_veicolo', event.target.value)}
                placeholder="es. 1350 kg"
              />
            </label>

            <label>
              <span>Tipo intervento</span>
              <div className="select-wrapper">
                <select
                  value={form.tipo_intervento}
                  onChange={(event) =>
                    handleChange('tipo_intervento', event.target.value as InterventionTypeOption)
                  }
                >
                  {interventionTypes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <span className="chevron">▾</span>
              </div>
            </label>
          </div>
        </section>

        <section>
          <h3>Trasporti e cronologia</h3>
          <div className="form-grid">
            <label>
              <span>Latore 1° trasporto</span>
              <input
                type="text"
                value={form.latore_1_trasporto}
                onChange={(event) => handleChange('latore_1_trasporto', event.target.value)}
              />
            </label>
            <label>
              <span>Km 1° trasporto</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.km_1_trasporto}
                onChange={(event) => handleChange('km_1_trasporto', event.target.value)}
              />
            </label>
            <label>
              <span>Latore 2° trasporto</span>
              <input
                type="text"
                value={form.latore_2_trasporto}
                onChange={(event) => handleChange('latore_2_trasporto', event.target.value)}
              />
            </label>
            <label>
              <span>Km 2° trasporto</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.km_2_trasporto}
                onChange={(event) => handleChange('km_2_trasporto', event.target.value)}
              />
            </label>
            <label>
              <span>Data entrata</span>
              <input
                type="date"
                value={form.data_entrata}
                onChange={(event) => handleChange('data_entrata', event.target.value)}
              />
            </label>
            <label>
              <span>Motivo entrata</span>
              <input
                type="text"
                value={form.motivo_entrata}
                onChange={(event) => handleChange('motivo_entrata', event.target.value)}
              />
            </label>
            <label>
              <span>Data uscita</span>
              <input
                type="date"
                value={form.data_uscita}
                onChange={(event) => handleChange('data_uscita', event.target.value)}
              />
            </label>
            <label>
              <span>Motivo uscita</span>
              <input
                type="text"
                value={form.motivo_uscita}
                onChange={(event) => handleChange('motivo_uscita', event.target.value)}
              />
            </label>
            <label>
              <span>Durata custodia</span>
              <input
                type="text"
                value={form.durata_custodia}
                onChange={(event) => handleChange('durata_custodia', event.target.value)}
                placeholder="es. 14 giorni"
              />
            </label>
            <label>
              <span>Oneri custodia</span>
              <input
                type="text"
                value={form.oneri_custodia}
                onChange={(event) => handleChange('oneri_custodia', event.target.value)}
                placeholder="es. € 250,00"
              />
            </label>
          </div>
        </section>

        <section>
          <h3>Amministrazione</h3>
          <div className="form-grid">
            <div className="office-select-field">
              <label>
                <span>Ufficio destinatario</span>
                <div className="office-select">
                  <input
                    type="search"
                    placeholder="Cerca anagrafica ufficio..."
                    value={officeSearch}
                    onChange={(event) => setOfficeSearch(event.target.value)}
                    disabled={officesLoading}
                  />
                  <div className="office-select-list">
                    {officesLoading ? (
                      <p className="empty-state">Caricamento in corso...</p>
                    ) : filteredOffices.length === 0 ? (
                      <p className="empty-state">
                        Nessun ufficio trovato. Aggiungi una nuova anagrafica.
                      </p>
                    ) : (
                      filteredOffices.map((office) => (
                        <button
                          key={office.id}
                          type="button"
                          className={`office-select-item ${
                            office.id === form.destination_office_id ? 'selected' : ''
                          }`}
                          onClick={() => {
                            handleChange('destination_office_id', office.id);
                            handleChange('ufficio_destinatario', office.name);
                          }}
                        >
                          <span className="office-select-name">{office.name}</span>
                          <span className="office-select-meta">
                            {office.office_type === 'persona_giuridica' ? 'Persona giuridica' : 'Persona fisica'}
                            {office.city ? ` • ${office.city}` : ''}
                            {office.province ? ` (${office.province})` : ''}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </label>
              <div className="office-actions">
                <button
                  type="button"
                  className="secondary ghost"
                  onClick={() => {
                    setShowOfficeModal(true);
                    resetOfficeForm();
                  }}
                >
                  + Nuovo ufficio destinatario
                </button>
                {selectedOffice && (
                  <div className="office-summary">
                    <strong>{selectedOffice.name}</strong>
                    <span>
                      {selectedOffice.city ?? 'Comune n.d.'}
                      {selectedOffice.province ? ` (${selectedOffice.province})` : ''}
                    </span>
                    {selectedOffice.phone && <span>Tel: {selectedOffice.phone}</span>}
                    {selectedOffice.email && <span>Email: {selectedOffice.email}</span>}
                    {selectedOffice.pec && <span>PEC: {selectedOffice.pec}</span>}
                  </div>
                )}
                {officesError && <p className="form-error">{officesError}</p>}
              </div>
            </div>
            <label>
              <span>Denominazione per documenti</span>
              <input
                type="text"
                value={form.ufficio_destinatario}
                onChange={(event) => handleChange('ufficio_destinatario', event.target.value)}
                placeholder="Nome ufficio da mostrare su documenti e note"
              />
            </label>
            <label>
              <span>Data richiesta</span>
              <input
                type="date"
                value={form.data_richiesta}
                onChange={(event) => handleChange('data_richiesta', event.target.value)}
              />
            </label>
            <label>
              <span>Data fattura</span>
              <input
                type="date"
                value={form.data_fattura}
                onChange={(event) => handleChange('data_fattura', event.target.value)}
              />
            </label>
            <label>
              <span>Numero fattura</span>
              <input
                type="text"
                value={form.numero_fattura}
                onChange={(event) => handleChange('numero_fattura', event.target.value)}
              />
            </label>
            <label>
              <span>Importo fattura</span>
              <input
                type="text"
                value={form.importo_fattura}
                onChange={(event) => handleChange('importo_fattura', event.target.value)}
                placeholder="es. € 183,00"
              />
            </label>
          </div>
        </section>

        <section>
          <h3>Note</h3>
          <label className="form-textarea">
            <span>Note varie</span>
            <textarea
              rows={4}
              value={form.note_varie}
              onChange={(event) => handleChange('note_varie', event.target.value)}
              placeholder="Annotazioni aggiuntive, verbali, riferimenti..."
            />
          </label>
        </section>

        <footer className="form-actions">
          <button type="button" className="secondary ghost" onClick={handleCancel} disabled={loading}>
            Annulla
          </button>
          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Salvataggio...' : mode === 'edit' ? 'Aggiorna pratica' : 'Salva pratica'}
          </button>
        </footer>
      </form>

      {showOfficeModal && (
        <div className="modal-backdrop">
          <div className="modal-card modal-card-wide">
            <div className="modal-header">
              <h3>Nuovo ufficio destinatario</h3>
              <p>Compila l’anagrafica dell’ufficio (persona giuridica o fisica).</p>
            </div>
            <form className="modal-body scrollable" onSubmit={handleSaveOffice}>
              <div className="office-type-selector">
                <label>
                  <input
                    type="radio"
                    name="office_type"
                    value="persona_giuridica"
                    checked={officeForm.office_type === 'persona_giuridica'}
                    onChange={(event) =>
                      setOfficeForm((prev) => ({
                        ...prev,
                        office_type: event.target.value as OfficeTypeOption,
                      }))
                    }
                  />
                  Persona giuridica
                </label>
                <label>
                  <input
                    type="radio"
                    name="office_type"
                    value="persona_fisica"
                    checked={officeForm.office_type === 'persona_fisica'}
                    onChange={(event) =>
                      setOfficeForm((prev) => ({
                        ...prev,
                        office_type: event.target.value as OfficeTypeOption,
                        vat_number: '',
                      }))
                    }
                  />
                  Persona fisica
                </label>
              </div>

              <div className="form-grid">
                <label className="full-width">
                  <span>Denominazione / Nome e cognome</span>
                  <input
                    type="text"
                    required
                    value={officeForm.name}
                    onChange={(event) =>
                      setOfficeForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Es. Prefettura di Napoli / Mario Rossi"
                  />
                </label>
                {officeForm.office_type === 'persona_fisica' ? (
                  <label>
                    <span>Codice fiscale</span>
                    <input
                      type="text"
                      required
                      value={officeForm.tax_code}
                      onChange={(event) =>
                        setOfficeForm((prev) => ({ ...prev, tax_code: event.target.value }))
                      }
                    />
                  </label>
                ) : (
                  <>
                    <label>
                      <span>Codice fiscale (opzionale)</span>
                      <input
                        type="text"
                        value={officeForm.tax_code}
                        onChange={(event) =>
                          setOfficeForm((prev) => ({ ...prev, tax_code: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>Partita IVA</span>
                      <input
                        type="text"
                        required
                        value={officeForm.vat_number}
                        onChange={(event) =>
                          setOfficeForm((prev) => ({ ...prev, vat_number: event.target.value }))
                        }
                      />
                    </label>
                  </>
                )}
                <label className="full-width">
                  <span>Indirizzo</span>
                  <input
                    type="text"
                    value={officeForm.address}
                    onChange={(event) =>
                      setOfficeForm((prev) => ({ ...prev, address: event.target.value }))
                    }
                    placeholder="Via/Piazza e numero civico"
                  />
                </label>
                <label>
                  <span>Comune</span>
                  <input
                    type="text"
                    value={officeForm.city}
                    onChange={(event) =>
                      setOfficeForm((prev) => ({ ...prev, city: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Provincia</span>
                  <input
                    type="text"
                    value={officeForm.province}
                    onChange={(event) =>
                      setOfficeForm((prev) => ({ ...prev, province: event.target.value }))
                    }
                    placeholder="es. NA"
                    maxLength={2}
                  />
                </label>
                <label>
                  <span>CAP</span>
                  <input
                    type="text"
                    value={officeForm.postal_code}
                    onChange={(event) =>
                      setOfficeForm((prev) => ({ ...prev, postal_code: event.target.value }))
                    }
                    placeholder="es. 80100"
                  />
                </label>
                <label>
                  <span>Telefono</span>
                  <input
                    type="text"
                    value={officeForm.phone}
                    onChange={(event) =>
                      setOfficeForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={officeForm.email}
                    onChange={(event) =>
                      setOfficeForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>PEC</span>
                  <input
                    type="email"
                    value={officeForm.pec}
                    onChange={(event) =>
                      setOfficeForm((prev) => ({ ...prev, pec: event.target.value }))
                    }
                  />
                </label>
                <label className="full-width">
                  <span>Note</span>
                  <textarea
                    rows={3}
                    value={officeForm.notes}
                    onChange={(event) =>
                      setOfficeForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    placeholder="Informazioni aggiuntive, orari, referente..."
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary ghost"
                  onClick={() => {
                    if (!officeSaving) {
                      setShowOfficeModal(false);
                      resetOfficeForm();
                    }
                  }}
                >
                  Annulla
                </button>
                <button type="submit" className="primary" disabled={officeSaving}>
                  {officeSaving ? 'Salvataggio...' : 'Salva anagrafica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

type CustomFieldDef = {
  id: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'date' | 'number';
};

const CUSTOM_FIELD_DEFINITIONS: Record<
  string,
  {
    default?: CustomFieldDef[];
    [subKey: string]: CustomFieldDef[] | undefined;
  }
> = {
  amministrativo: {
    default: [],
    sequestri: [
      { id: 'numero_verbale', label: 'Numero verbale', placeholder: 'Es. VERB-1234' },
      { id: 'autorita_competente', label: 'Autorità competente', placeholder: 'Es. Prefettura Milano' },
    ],
    sives: [
      { id: 'codice_sives', label: 'Codice SIVES', placeholder: 'Es. SIVES-00123' },
      { id: 'referente_sives', label: 'Referente SIVES', placeholder: 'Nome e cognome' },
    ],
  },
  penale: {
    default: [
      { id: 'pubblico_ministero', label: 'Pubblico Ministero', placeholder: 'Nome PM' },
      { id: 'tribunale_competente', label: 'Tribunale competente', placeholder: 'Es. Tribunale di ...' },
    ],
  },
};

function getCustomFieldDefs(categoryKey: string, subKey: string | null): CustomFieldDef[] {
  const group = CUSTOM_FIELD_DEFINITIONS[categoryKey];
  if (!group) {
    return [];
  }
  if (subKey && group[subKey]) {
    return group[subKey] ?? [];
  }
  return group.default ?? [];
}

