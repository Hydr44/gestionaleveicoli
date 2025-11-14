import type { CaseRecord } from './types';

type CaseDetailProps = {
  record: CaseRecord | null;
  onRequestRelease?: (caseId: string) => void;
  onEdit?: (caseId: string) => void;
  onDelete?: (caseId: string) => void;
};

const infoRows = (record: CaseRecord) => {
  const d = record.seizure_case_details;
  if (!d) return [];

  const rows: Array<[string, string | null]> = [
    ['Data sequestro', d.seizure_date ?? '—'],
    ['Organo accertatore', d.enforcement_body ?? '—'],
    ['Generalità trasgressore', d.offender_details ?? '—'],
    ['Numero targa', d.plate_number ?? record.vehicles?.plate ?? '—'],
    ['Numero telaio', d.vin_number ?? '—'],
    ['Tipo veicolo', d.vehicle_type ?? '—'],
    ['Marca e modello', d.vehicle_brand_model ?? record.vehicles?.brand ?? '—'],
    ['Peso veicolo', d.vehicle_weight ?? '—'],
    ['Tipo intervento', d.intervention_type ?? '—'],
    ['Latore 1° trasporto', d.carrier_one ?? '—'],
    ['Km 1° trasporto', d.carrier_one_km !== null ? String(d.carrier_one_km) : '—'],
    ['Latore 2° trasporto', d.carrier_two ?? '—'],
    ['Km 2° trasporto', d.carrier_two_km !== null ? String(d.carrier_two_km) : '—'],
    ['Data entrata', d.entry_date ?? '—'],
    ['Motivo entrata', d.entry_reason ?? '—'],
    ['Data uscita', d.exit_date ?? '—'],
    ['Motivo uscita', d.exit_reason ?? '—'],
    ['Durata custodia', d.custody_duration ?? '—'],
    ['Oneri custodia', d.custody_costs ?? '—'],
    ['Numero procedimento', d.procedure_number ?? record.case_number],
  ];

  const office = record.destination_office;
  rows.push(['Ufficio destinatario', office?.name ?? d.destination_office ?? '—']);

  if (office) {
    rows.push([
      'Tipologia ufficio',
      office.office_type === 'persona_giuridica' ? 'Persona giuridica' : 'Persona fisica',
    ]);
    const locationParts = [office.address, office.city, office.province, office.postal_code]
      .filter(Boolean)
      .join(' • ');
    if (locationParts) {
      rows.push(['Indirizzo ufficio', locationParts]);
    }
    const contactParts = [office.phone, office.email, office.pec].filter(Boolean).join(' • ');
    if (contactParts) {
      rows.push(['Contatti ufficio', contactParts]);
    }
    if (office.notes) {
      rows.push(['Note ufficio', office.notes]);
    }
  }

  rows.push(
    ['Data richiesta', d.request_date ?? '—'],
    ['Data fattura', d.invoice_date ?? '—'],
    ['Numero fattura', d.invoice_number ?? '—'],
    ['Importo fattura', d.invoice_amount ?? '—'],
    ['Note varie', d.notes ?? '—']
  );

  return rows;
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

  const rows = infoRows(record);

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
            Apertura: {record.opened_at ?? '—'}
          </span>
          <span>Tipo: {record.procedure_type}</span>
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
        <table>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <th>{label}</th>
                <td>{value ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

