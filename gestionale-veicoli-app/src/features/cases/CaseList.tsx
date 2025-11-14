import { useMemo, useState } from 'react';
import type { CaseRecord } from './types';

type CaseListProps = {
  cases: CaseRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
};

export function CaseList({ cases, selectedId, onSelect, onCreate }: CaseListProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return cases;
    const value = search.trim().toLowerCase();
    return cases.filter((item) => {
      const details = item.seizure_case_details;
      const vehiclePlate = item.vehicles?.plate ?? '';
      const caseNumber = item.case_number ?? '';
      const offender = details?.offender_details ?? '';
      const notes = details?.notes ?? '';
      return (
        vehiclePlate.toLowerCase().includes(value) ||
        caseNumber.toLowerCase().includes(value) ||
        offender.toLowerCase().includes(value) ||
        notes.toLowerCase().includes(value)
      );
    });
  }, [cases, search]);

  return (
    <div className="cases-list-panel">
      <div className="cases-list-header">
        <div>
          <h2>Pratiche</h2>
          <p>{cases.length} pratiche totali</p>
        </div>
        <button type="button" className="primary" onClick={onCreate}>
          + Nuova pratica
        </button>
      </div>

      <label className="cases-search-field">
        <input
          type="search"
          placeholder="Cerca per targa, pratica o nominativo..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      <div className="cases-list-body">
        {filtered.length === 0 ? (
          <p className="empty-state">
            Nessuna pratica trovata. {search ? 'Prova a cambiare i filtri.' : 'Crea la prima pratica utilizzando il pulsante in alto.'}
          </p>
        ) : (
          <ul>
            {filtered.map((item) => {
              const isSelected = item.id === selectedId;
              const details = item.seizure_case_details;
              const plate = item.vehicles?.plate ?? details?.plate_number ?? '—';
              const offender = details?.offender_details ?? 'Sconosciuto';
              const seizureDate = details?.seizure_date ?? item.opened_at ?? '—';
              const subcategoryLabel = item.subcategory ?? details?.entry_reason ?? '';
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`case-list-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelect(item.id)}
                  >
                    <div className="case-list-item-top">
                      <span className="case-plate">{plate}</span>
                      <span className={`case-status ${item.status}`}>{item.status}</span>
                    </div>
                    <div className="case-list-item-middle">
                      <p className="case-title">{item.case_number}</p>
                      <p className="case-subtitle">{offender}</p>
                    </div>
                    <div className="case-list-item-bottom">
                      <span className="case-badge">{item.procedure_type.toUpperCase()}</span>
                      {subcategoryLabel && <span className="case-meta">{subcategoryLabel}</span>}
                      <span className="case-date">Data sequestro: {seizureDate ?? '—'}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

