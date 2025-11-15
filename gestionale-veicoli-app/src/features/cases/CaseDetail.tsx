import type { CaseRecord } from './types';

type CaseDetailProps = {
  record: CaseRecord | null;
  onRequestRelease?: (caseId: string) => void;
  onEdit?: (caseId: string) => void;
  onDelete?: (caseId: string) => void;
};

type DetailSection = {
  title: string;
  rows: Array<[string, string | null]>;
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
};

const getDetailSections = (record: CaseRecord): DetailSection[] => {
  const d = record.seizure_case_details;
  if (!d) return [];

  const sections: DetailSection[] = [];

  // Sezione: Informazioni Pratica
  sections.push({
    title: 'Informazioni Pratica',
    rows: [
      ['Numero interno pratica', record.internal_number ?? '—'],
      ['Numero procedimento', d.procedure_number ?? record.case_number],
      ['Chiave in bacheca', record.board_key ?? '—'],
      ['Data sequestro', formatDate(d.seizure_date)],
      ['Organo accertatore', d.enforcement_body ?? '—'],
      ['Generalità trasgressore', d.offender_details ?? '—'],
    ],
  });

  // Sezione: Informazioni Veicolo
  sections.push({
    title: 'Informazioni Veicolo',
    rows: [
      ['Numero targa', d.plate_number ?? record.vehicles?.plate ?? '—'],
      ['Numero telaio', d.vin_number ?? '—'],
      ['Tipo veicolo', d.vehicle_type ?? '—'],
      ['Marca e modello', d.vehicle_brand_model ?? record.vehicles?.brand ?? '—'],
      ['Peso veicolo', d.vehicle_weight ?? '—'],
    ],
  });

  // Sezione: Trasporto
  sections.push({
    title: 'Trasporto',
    rows: [
      ['Tipo intervento', d.intervention_type ?? '—'],
      ['Latore 1° trasporto', d.carrier_one ?? '—'],
      ['Km 1° trasporto', d.carrier_one_km !== null ? `${d.carrier_one_km} km` : '—'],
      ['Latore 2° trasporto', d.carrier_two ?? '—'],
      ['Km 2° trasporto', d.carrier_two_km !== null ? `${d.carrier_two_km} km` : '—'],
    ],
  });

  // Sezione: Custodia
  sections.push({
    title: 'Custodia',
    rows: [
      ['Data entrata', formatDate(d.entry_date)],
      ['Motivo entrata', d.entry_reason ?? '—'],
      ['Data uscita', formatDate(d.exit_date)],
      ['Motivo uscita', d.exit_reason ?? '—'],
      ['Durata custodia', d.custody_duration ?? '—'],
      ['Oneri custodia', d.custody_costs ?? '—'],
    ],
  });

  // Sezione: Ufficio Destinatario
  const office = record.destination_office;
  const officeRows: Array<[string, string | null]> = [
    ['Ufficio destinatario', office?.name ?? d.destination_office ?? '—'],
  ];

  if (office) {
    officeRows.push([
      'Tipologia ufficio',
      office.office_type === 'persona_giuridica' ? 'Persona giuridica' : 'Persona fisica',
    ]);
    if (office.tax_code) {
      officeRows.push(['Codice fiscale', office.tax_code]);
    }
    if (office.vat_number) {
      officeRows.push(['Partita IVA', office.vat_number]);
    }
    const locationParts = [office.address, office.city, office.province, office.postal_code]
      .filter(Boolean)
      .join(', ');
    if (locationParts) {
      officeRows.push(['Indirizzo', locationParts]);
    }
    const contactParts = [office.phone, office.email, office.pec].filter(Boolean).join(' • ');
    if (contactParts) {
      officeRows.push(['Contatti', contactParts]);
    }
    if (office.notes) {
      officeRows.push(['Note ufficio', office.notes]);
    }
  }

  sections.push({
    title: 'Ufficio Destinatario',
    rows: officeRows,
  });

  // Sezione: Fatturazione
  sections.push({
    title: 'Fatturazione',
    rows: [
      ['Data richiesta', formatDate(d.request_date)],
      ['Data fattura', formatDate(d.invoice_date)],
      ['Numero fattura', d.invoice_number ?? '—'],
      ['Importo fattura', d.invoice_amount ?? '—'],
    ],
  });

  // Sezione: Note
  if (d.notes) {
    sections.push({
      title: 'Note',
      rows: [['Note varie', d.notes]],
    });
  }

  return sections;
};

export function CaseDetail({ record, onRequestRelease, onEdit, onDelete }: CaseDetailProps) {
  if (!record) {
    return (
      <div className="cases-detail-panel">
        <h2>Dettaglio pratica</h2>
        <p className="empty-state">
          Seleziona una pratica dalla lista per visualizzare i dettagli.
        </p>
      </div>
    );
  }

  const sections = getDetailSections(record);

  return (
    <div className="cases-detail-panel">
      <header className="case-detail-header">
        <div>
          <h2>Pratica {record.case_number}</h2>
          <p>
            Stato: <span className={`case-status ${record.status}`}>{record.status}</span>
          </p>
        </div>
        <div className="case-detail-meta">
          <span>
            Apertura: {formatDate(record.opened_at)}
          </span>
          <span>Tipo: {record.procedure_type}</span>
          {record.subcategory && <span>Sottocategoria: {record.subcategory}</span>}
        </div>
      </header>

      {(onEdit || onDelete || onRequestRelease) && (
        <div className="case-detail-toolbar">
          {onEdit && (
            <button type="button" className="secondary" onClick={() => onEdit(record.id)}>
              Modifica
            </button>
          )}
          {onDelete && (
            <button type="button" className="danger" onClick={() => onDelete(record.id)}>
              Elimina
            </button>
          )}
          {onRequestRelease && (
            <button
              type="button"
              className="primary"
              onClick={() => onRequestRelease(record.id)}
            >
              Rilascio veicolo
            </button>
          )}
        </div>
      )}

      <div className="case-detail-content">
        {sections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="detail-section">
            <h3 className="detail-section-title">{section.title}</h3>
            <div className="detail-section-content">
              {section.rows.map(([label, value], rowIdx) => (
                <div key={rowIdx} className="detail-row">
                  <span className="detail-label">{label}</span>
                  <span className="detail-value">{value ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

