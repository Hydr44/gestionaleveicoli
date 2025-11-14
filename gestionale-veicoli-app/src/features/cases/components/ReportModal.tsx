import { useEffect, useMemo, useState } from 'react';
import type { CaseRecord } from '../types';
import type { ReportColumn } from '../printReportDocument';

type ReportModalProps = {
  open: boolean;
  cases: CaseRecord[];
  columns: ReportColumn[];
  onClose: () => void;
  onPrint: (rows: CaseRecord[], columns: ReportColumn[]) => void;
};

export function ReportModal({
  open,
  cases,
  columns,
  onClose,
  onPrint,
}: ReportModalProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('tutti');
  const [procedureFilter, setProcedureFilter] = useState('tutti');
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>(
    columns.map((column) => column.key)
  );

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setStatusFilter('tutti');
    setProcedureFilter('tutti');
    setSelectedColumnKeys(columns.map((column) => column.key));
  }, [open, columns]);

  const procedureOptions = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((item) => {
      if (item.procedure_type) {
        set.add(item.procedure_type);
      }
    });
    return Array.from(set);
  }, [cases]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((item) => {
      if (item.status) {
        set.add(item.status);
      }
    });
    return Array.from(set);
  }, [cases]);

  const filteredCases = useMemo(() => {
    const term = search.trim().toLowerCase();
    return cases.filter((item) => {
      const matchesProcedure =
        procedureFilter === 'tutti' ||
        item.procedure_type?.toLowerCase() === procedureFilter.toLowerCase();
      const matchesStatus =
        statusFilter === 'tutti' ||
        item.status?.toLowerCase() === statusFilter.toLowerCase();

      if (!matchesProcedure || !matchesStatus) return false;

      if (!term) return true;

      const details = item.seizure_case_details;
      const content = [
        item.case_number,
        item.vehicles?.plate,
        details?.offender_details,
        details?.notes,
        item.subcategory,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return content.includes(term);
    });
  }, [cases, search, procedureFilter, statusFilter]);

  const selectedColumns = useMemo(
    () => columns.filter((column) => selectedColumnKeys.includes(column.key)),
    [columns, selectedColumnKeys]
  );

  const toggleColumn = (key: string) => {
    setSelectedColumnKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const handlePrint = () => {
    if (selectedColumns.length === 0) {
      globalThis.alert('Seleziona almeno una colonna da includere nel report.');
      return;
    }
    onPrint(filteredCases, selectedColumns);
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-card-wide">
        <div className="modal-header">
          <h3>Report mezzi con tutti i titoli</h3>
          <p>Seleziona le colonne e i filtri da includere nel report stampabile.</p>
        </div>
        <div className="modal-body report-modal">
          <section className="report-section">
            <h4>Filtri</h4>
            <div className="cases-board-filters">
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
            </div>
          </section>

          <section className="report-section">
            <h4>Colonne da includere</h4>
            <div className="report-columns-grid">
              {columns.map((column) => {
                const checked = selectedColumnKeys.includes(column.key);
                return (
                  <label key={column.key} className={`report-column-item ${checked ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleColumn(column.key)}
                    />
                    <span>{column.label}</span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="report-section">
            <h4>Anteprima</h4>
            <div className="report-preview">
              {filteredCases.length === 0 ? (
                <p className="empty-state">
                  Nessuna pratica corrisponde ai filtri impostati.
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      {selectedColumns.map((column) => (
                        <th key={column.key}>{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.slice(0, 8).map((record) => (
                      <tr key={record.id}>
                        {selectedColumns.map((column) => (
                          <td key={column.key}>{column.accessor(record) || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {filteredCases.length > 8 && (
              <p className="preview-footnote">
                Mostra solo le prime 8 righe. Il report stampato conterrà tutte le {filteredCases.length}{' '}
                pratiche filtrate.
              </p>
            )}
          </section>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary ghost" onClick={onClose}>
            Chiudi
          </button>
          <button type="button" className="primary" onClick={handlePrint}>
            Stampa report
          </button>
        </div>
      </div>
    </div>
  );
}

