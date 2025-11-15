import { useMemo, useState } from 'react';
import type { CaseRecord } from '../types';

type CaseBoardProps = {
  cases: CaseRecord[];
  loading: boolean;
  deleting?: boolean;
  selectedCaseId: string | null;
  selectedCaseIds: string[];
  onToggleCaseSelection: (id: string) => void;
  onToggleAllCases: (ids: string[]) => void;
  onCreateCase: () => void;
  onEditCase: (id: string) => void;
  onDeleteCases: (ids: string[]) => void;
  onOpenRelease: (caseId: string | null) => void;
  onOpenReport: () => void;
  onRefresh: () => void;
  onShowDetails: (id: string) => void;
};

export function CaseBoard({
  cases,
  loading,
  deleting = false,
  selectedCaseId,
  selectedCaseIds,
  onToggleCaseSelection,
  onToggleAllCases,
  onCreateCase,
  onEditCase,
  onDeleteCases,
  onOpenRelease,
  onOpenReport,
  onRefresh,
  onShowDetails,
}: CaseBoardProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('tutti');
  const [procedureFilter, setProcedureFilter] = useState('tutti');
  const [subcategoryFilter, setSubcategoryFilter] = useState('tutte');

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of cases) {
      if (item.status) {
        set.add(item.status);
      }
    }
    return Array.from(set);
  }, [cases]);

  const procedureOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of cases) {
      if (item.procedure_type) {
        set.add(item.procedure_type);
      }
    }
    return Array.from(set);
  }, [cases]);

  const subcategoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of cases) {
      if (item.subcategory) {
        set.add(item.subcategory);
      }
    }
    return Array.from(set);
  }, [cases]);

  const filteredCases = useMemo(() => {
    const term = search.trim().toLowerCase();
    return cases.filter((item) => {
      const matchesStatus =
        statusFilter === 'tutti' ||
        item.status?.toLowerCase() === statusFilter.toLowerCase();
      const matchesProcedure =
        procedureFilter === 'tutti' ||
        item.procedure_type?.toLowerCase() === procedureFilter.toLowerCase();
      const matchesSubcategory =
        subcategoryFilter === 'tutte' ||
        item.subcategory?.toLowerCase() === subcategoryFilter.toLowerCase();

      if (!matchesStatus || !matchesProcedure || !matchesSubcategory) {
        return false;
      }

      if (!term) return true;

      const details = item.seizure_case_details;
      
      // Formatta la data per la ricerca
      const formatDateForSearch = (dateStr: string | null | undefined) => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}-${month}-${year} ${day}${month}${year}`;
        } catch {
          return dateStr;
        }
      };
      
      const haystack = [
        // Numero interno pratica
        item.internal_number,
        // Numero procedimento
        item.case_number,
        details?.procedure_number,
        // Chiave in bacheca
        item.board_key,
        // Targa
        item.vehicles?.plate,
        details?.plate_number,
        // Generalità trasgressore
        details?.offender_details,
        // Organo accertatore
        details?.enforcement_body,
        // Tipo veicolo
        details?.vehicle_type,
        // Marca e modello
        details?.vehicle_brand_model,
        item.vehicles?.brand,
        item.vehicles?.model,
        // Numero telaio
        details?.vin_number,
        item.vehicles?.vin,
        // Note
        details?.notes,
        // Sottocategoria
        item.subcategory,
        // Data sequestro (formattata)
        formatDateForSearch(details?.seizure_date),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [cases, search, statusFilter, procedureFilter, subcategoryFilter]);

  const selectionOnScreen = filteredCases.filter((item) =>
    selectedCaseIds.includes(item.id)
  );

  const toggleAllVisible = () => {
    const visibleIds = filteredCases.map((item) => item.id);
    onToggleAllCases(visibleIds);
  };

  const deleteSelection = () => {
    if (selectedCaseIds.length === 0) return;
    onDeleteCases(selectedCaseIds);
  };

  const handleRelease = () => {
    const targetId = selectedCaseIds[0] ?? selectedCaseId;
    onOpenRelease(targetId ?? null);
  };

  return (
    <div className="cases-board">
      <header className="cases-board-header">
        <div>
          <h2>Elenco pratiche</h2>
          <p>
            {loading
              ? 'Caricamento pratiche in corso…'
              : `${cases.length} pratiche totali`}
          </p>
        </div>
        <div className="cases-board-header-actions">
          <button type="button" className="secondary ghost" onClick={onRefresh}>
            Aggiorna
          </button>
          <button type="button" className="primary" onClick={onCreateCase}>
            + Nuova pratica
          </button>
        </div>
      </header>

      <div className="cases-board-toolbar">
        <div className="toolbar-left">
          <span className="toolbar-counter">
            Selezionate: {selectedCaseIds.length}
          </span>
          <button
            type="button"
            className="ghost"
            onClick={toggleAllVisible}
            disabled={filteredCases.length === 0}
          >
            {selectionOnScreen.length === filteredCases.length
              ? 'Deseleziona visibili'
              : 'Seleziona visibili'}
          </button>
        </div>
        <div className="toolbar-right">
          <button
            type="button"
            className="secondary"
            onClick={onOpenReport}
          >
            Report mezzi
          </button>
          <button
            type="button"
            className="primary"
            onClick={handleRelease}
            disabled={!selectedCaseIds.length && !selectedCaseId}
          >
            Rilascio veicolo
          </button>
          <button
            type="button"
            className={`danger ${deleting ? 'loading' : ''}`}
            onClick={deleteSelection}
            disabled={selectedCaseIds.length === 0 || deleting}
          >
            {deleting ? 'Eliminazione...' : 'Elimina selezionate'}
          </button>
        </div>
      </div>

      <section className="cases-board-filters">
        <label>
          <span>Ricerca</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cerca per targa, nominativo, note…"
          />
        </label>
        <label>
          <span>Stato pratica</span>
          <div className="select-wrapper">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="tutti">Tutti</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <span className="chevron">▾</span>
          </div>
        </label>
        <label>
          <span>Tipologia</span>
          <div className="select-wrapper">
            <select
              value={procedureFilter}
              onChange={(event) => setProcedureFilter(event.target.value)}
            >
              <option value="tutti">Tutte</option>
              {procedureOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="chevron">▾</span>
          </div>
        </label>
        <label>
          <span>Sottocategoria</span>
          <div className="select-wrapper">
            <select
              value={subcategoryFilter}
              onChange={(event) => setSubcategoryFilter(event.target.value)}
            >
              <option value="tutte">Tutte</option>
              {subcategoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="chevron">▾</span>
          </div>
        </label>
      </section>

      <section className="cases-board-grid">
        {loading ? (
          <p className="empty-state board-empty">Caricamento in corso…</p>
        ) : filteredCases.length === 0 ? (
          <p className="empty-state board-empty">
            Nessuna pratica corrisponde ai filtri correnti.
          </p>
        ) : (
          filteredCases.map((record) => {
            const details = record.seizure_case_details;
            const isActive = record.id === selectedCaseId;
            const isSelected = selectedCaseIds.includes(record.id);
            const plate =
              record.vehicles?.plate ?? details?.plate_number ?? '—';
            const offender = details?.offender_details ?? 'Trasgressore n.d.';
            
            const formatDate = (dateStr: string | null | undefined) => {
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
            
            const seizureDate = formatDate(details?.seizure_date);
            const vehicleType = details?.vehicle_type ?? '—';
            const vehicleBrandModel = details?.vehicle_brand_model ?? record.vehicles?.brand ?? '—';

            return (
              <div
                key={record.id}
                role="button"
                tabIndex={0}
                className={`cases-card ${isActive ? 'active' : ''} ${
                  isSelected ? 'selected' : ''
                }`}
                onClick={() => onShowDetails(record.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onShowDetails(record.id);
                  }
                }}
              >
                <div className="card-top-bar">
                  <label
                    className="card-checkbox"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(event) => {
                        event.stopPropagation();
                        onToggleCaseSelection(record.id);
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                    />
                    <span />
                  </label>
                  <div className="card-plate-badge">{plate}</div>
                  <div className="card-tags-inline">
                    <span className={`status-chip ${record.status}`}>
                      {record.status}
                    </span>
                    <span className="case-badge">{record.procedure_type}</span>
                  </div>
                </div>

                <div className="card-main-content">
                  <div className="card-primary-info">
                    <div className="card-number-section">
                      <span className="card-number-label">N° Pratica</span>
                      <span className="card-number-value">
                        {record.internal_number ? `#${record.internal_number}` : record.case_number}
                      </span>
                    </div>
                    <div className="card-client-section">
                      <span className="card-client-label">Cliente</span>
                      <span className="card-client-value">{offender}</span>
                    </div>
                  </div>

                  <div className="card-secondary-info">
                    <div className="card-info-grid">
                      <div className="card-info-cell">
                        <span className="card-info-label">Data sequestro</span>
                        <span className="card-info-text">{seizureDate}</span>
                      </div>
                      <div className="card-info-cell">
                        <span className="card-info-label">Tipo veicolo</span>
                        <span className="card-info-text">{vehicleType}</span>
                      </div>
                      <div className="card-info-cell">
                        <span className="card-info-label">Marca/Modello</span>
                        <span className="card-info-text">{vehicleBrandModel}</span>
                      </div>
                      {record.board_key && (
                        <div className="card-info-cell">
                          <span className="card-info-label">Chiave bacheca</span>
                          <span className="card-info-text">{record.board_key}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {record.subcategory && (
                    <div className="card-subcategory">
                      <span className="case-meta">{record.subcategory}</span>
                    </div>
                  )}
                </div>

                <div className="card-actions">
                  <button
                    type="button"
                    className="ghost small"
                    onClick={(event) => {
                      event.stopPropagation();
                      onShowDetails(record.id);
                    }}
                  >
                    Maggiori dettagli
                  </button>
                  <button
                    type="button"
                    className="secondary small"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEditCase(record.id);
                    }}
                  >
                    Modifica
                  </button>
                  <button
                    type="button"
                    className="primary small"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenRelease(record.id);
                    }}
                  >
                    Rilascio
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

