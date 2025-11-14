import { useMemo, useState } from 'react';
import type { CaseRecord } from '../types';

type CaseBoardProps = {
  cases: CaseRecord[];
  loading: boolean;
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
      const haystack = [
        item.case_number,
        item.vehicles?.plate,
        details?.plate_number,
        details?.offender_details,
        details?.notes,
        item.subcategory,
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
            className="danger"
            onClick={deleteSelection}
            disabled={selectedCaseIds.length === 0}
          >
            Elimina selezionate
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
            const openedAt = details?.seizure_date ?? record.opened_at ?? '—';

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
                <div className="card-head">
                  <div className="card-plate">{plate}</div>
                  <div className="card-actions">
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
                  </div>
                </div>
                <div>
                  <h3 className="card-title">{record.case_number}</h3>
                  <p className="card-subtitle">{offender}</p>
                </div>
                <div className="card-meta">
                  <span className={`status-chip ${record.status}`}>
                    {record.status}
                  </span>
                  <span className="case-badge">{record.procedure_type}</span>
                  {record.subcategory && (
                    <span className="case-meta">{record.subcategory}</span>
                  )}
                </div>
                <div className="card-date">Data sequestro: {openedAt}</div>
                <div className="card-actions">
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

