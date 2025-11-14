import { useEffect, useMemo, useState } from 'react';
import type { CaseRecord, ReleasePrintPayload } from '../types';

type ReleaseModalProps = {
  open: boolean;
  cases: CaseRecord[];
  initialCaseId: string | null;
  onClose: () => void;
  onPrint: (payload: ReleasePrintPayload) => void;
};

export function ReleaseModal({
  open,
  cases,
  initialCaseId,
  onClose,
  onPrint,
}: ReleaseModalProps) {
  const [query, setQuery] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [releaseDate, setReleaseDate] = useState<string>('');
  const [recipientName, setRecipientName] = useState('');
  const [procedimentoNumero, setProcedimentoNumero] = useState('');
  const [dispostoDa, setDispostoDa] = useState('');
  const [ufficioDi, setUfficioDi] = useState('');
  const [dataDisposizione, setDataDisposizione] = useState('');
  const [oraPresenza, setOraPresenza] = useState('');
  const [luogoNascita, setLuogoNascita] = useState('');
  const [dataNascita, setDataNascita] = useState('');
  const [residenza, setResidenza] = useState('');
  const [via, setVia] = useState('');
  const [marca, setMarca] = useState('');
  const [targaValue, setTargaValue] = useState('');
  const [telaio, setTelaio] = useState('');
  const [dataGela, setDataGela] = useState('');

  const filteredCases = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return cases;
    return cases.filter((item) => {
      const details = item.seizure_case_details;
      const haystack = [
        item.case_number,
        item.vehicles?.plate,
        details?.plate_number,
        details?.offender_details,
        item.procedure_type,
        item.subcategory,
        item.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [cases, query]);

  const selectedCase = useMemo(() => {
    if (!filteredCases.length) return null;
    if (!selectedCaseId) return filteredCases[0];
    return filteredCases.find((item) => item.id === selectedCaseId) ?? filteredCases[0];
  }, [filteredCases, selectedCaseId]);

  useEffect(() => {
    if (!open) return;
    const today = new Date().toISOString().slice(0, 10);
    setQuery('');
    setReleaseDate(today);
    setRecipientName('');
    setDispostoDa('');
    setUfficioDi('');
    setDataDisposizione('');
    setOraPresenza('');
    setLuogoNascita('');
    setDataNascita('');
    setResidenza('');
    setVia('');
    setMarca('');
    setTargaValue('');
    setTelaio('');
    setDataGela(today);

    const initial =
      initialCaseId && cases.some((item) => item.id === initialCaseId)
        ? initialCaseId
        : cases[0]?.id ?? '';
    setSelectedCaseId(initial);
  }, [open, initialCaseId, cases]);

  useEffect(() => {
    if (!selectedCase) return;
    const details = selectedCase.seizure_case_details;
    setProcedimentoNumero(details?.procedure_number ?? selectedCase.case_number ?? '');
    setUfficioDi(
      selectedCase.destination_office?.name ??
        details?.destination_office ??
        ''
    );
    setMarca(details?.vehicle_brand_model ?? selectedCase.vehicles?.brand ?? '');
    setTargaValue(
      selectedCase.vehicles?.plate ?? details?.plate_number ?? ''
    );
    setTelaio(details?.vin_number ?? selectedCase.vehicles?.vin ?? '');
  }, [selectedCase]);

  useEffect(() => {
    if (!releaseDate) return;
    setDataGela((prev) => prev || releaseDate);
  }, [releaseDate]);

  if (!open) return null;

  const vehicleDetails = selectedCase?.seizure_case_details;
  const vehicleLabel =
    selectedCase?.vehicles?.model ??
    vehicleDetails?.vehicle_brand_model ??
    'Veicolo non specificato';
  const plateLabel =
    selectedCase?.vehicles?.plate ?? vehicleDetails?.plate_number ?? '—';

  const handlePrint = () => {
    if (!selectedCase) {
      globalThis.alert('Seleziona una pratica da rilasciare.');
      return;
    }

    onPrint({
      procedimentoNumero: procedimentoNumero || '—',
      dispostoDa: dispostoDa || '—',
      ufficioDi: ufficioDi || '—',
      dataDisposizione: dataDisposizione || '—',
      oraPresenza: oraPresenza || '—',
      nome: recipientName || '—',
      luogoNascita: luogoNascita || '—',
      dataNascita: dataNascita || '—',
      residenza: residenza || '—',
      via: via || '—',
      marca: marca || '—',
      targa: targaValue || '—',
      telaio: telaio || '—',
      dataGela: dataGela || releaseDate || new Date().toISOString().slice(0, 10),
    });
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-card-wide">
        <div className="modal-header">
          <h3>Rilascio veicolo</h3>
          <p>Compila i dati richiesti e stampa il foglio di consegna personalizzato.</p>
        </div>
        <div className="modal-body release-modal-content">
          <div className="release-form-panel">
            <div className="release-field-group">
              <label>
                <span>Ricerca per targa, tag o numero pratica</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Es. AA123BB, custodia, CASE-2025-001"
                />
              </label>
              <label>
                <span>Pratica da rilasciare</span>
                <div className="select-wrapper">
                  <select
                    value={selectedCaseId}
                    onChange={(event) => setSelectedCaseId(event.target.value)}
                  >
                    {filteredCases.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.case_number} •{' '}
                        {item.vehicles?.plate ??
                          item.seizure_case_details?.plate_number ??
                          'Targa n.d.'}
                      </option>
                    ))}
                    {filteredCases.length === 0 && <option>Nessuna pratica trovata</option>}
                  </select>
                  <span className="chevron">▾</span>
                </div>
              </label>
            </div>

            {selectedCase && (
              <div className="release-summary-card">
                <div>
                  <strong>{selectedCase.case_number}</strong>
                  <span>{targaValue || plateLabel}</span>
                </div>
                <div>
                  <span>{marca || vehicleLabel}</span>
                </div>
              </div>
            )}

            <div className="release-form-grid">
              <label>
                <span>Data rilascio</span>
                <input
                  type="date"
                  value={releaseDate}
                  onChange={(event) => setReleaseDate(event.target.value)}
                />
              </label>
              <label>
                <span>Consegnatario</span>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(event) => setRecipientName(event.target.value)}
                  placeholder="Nome e cognome"
                />
              </label>
            </div>

            <div className="release-form-grid">
              <label>
                <span>Procedimento n.</span>
                <input
                  type="text"
                  value={procedimentoNumero}
                  onChange={(event) => setProcedimentoNumero(event.target.value)}
                />
              </label>
              <label>
                <span>Disposto da</span>
                <input
                  type="text"
                  value={dispostoDa}
                  onChange={(event) => setDispostoDa(event.target.value)}
                />
              </label>
              <label>
                <span>Ufficio di</span>
                <input
                  type="text"
                  value={ufficioDi}
                  onChange={(event) => setUfficioDi(event.target.value)}
                />
              </label>
              <label>
                <span>Data disposizione</span>
                <input
                  type="date"
                  value={dataDisposizione}
                  onChange={(event) => setDataDisposizione(event.target.value)}
                />
              </label>
              <label>
                <span>Ora presenza</span>
                <input
                  type="time"
                  value={oraPresenza}
                  onChange={(event) => setOraPresenza(event.target.value)}
                />
              </label>
            </div>

            <div className="release-form-grid">
              <label>
                <span>Luogo nascita</span>
                <input
                  type="text"
                  value={luogoNascita}
                  onChange={(event) => setLuogoNascita(event.target.value)}
                />
              </label>
              <label>
                <span>Data nascita</span>
                <input
                  type="date"
                  value={dataNascita}
                  onChange={(event) => setDataNascita(event.target.value)}
                />
              </label>
              <label>
                <span>Residenza</span>
                <input
                  type="text"
                  value={residenza}
                  onChange={(event) => setResidenza(event.target.value)}
                  placeholder="Comune / Provincia"
                />
              </label>
              <label>
                <span>Via</span>
                <input
                  type="text"
                  value={via}
                  onChange={(event) => setVia(event.target.value)}
                  placeholder="Indirizzo completo"
                />
              </label>
            </div>

            <div className="release-form-grid">
              <label>
                <span>Marca veicolo</span>
                <input
                  type="text"
                  value={marca}
                  onChange={(event) => setMarca(event.target.value)}
                />
              </label>
              <label>
                <span>Targa</span>
                <input
                  type="text"
                  value={targaValue}
                  onChange={(event) => setTargaValue(event.target.value.toUpperCase())}
                />
              </label>
              <label>
                <span>Telaio</span>
                <input
                  type="text"
                  value={telaio}
                  onChange={(event) => setTelaio(event.target.value)}
                />
              </label>
            </div>

            <label className="full-width">
              <span>Date / Note aggiuntive</span>
              <div className="release-field-group">
                <label>
                  <span>Data dichiarazione (Gela)</span>
                  <input
                    type="date"
                    value={dataGela}
                    onChange={(event) => setDataGela(event.target.value)}
                  />
                </label>
              </div>
            </label>

          </div>
          <div className="release-preview-panel">
            <h4>Anteprima foglio rilascio</h4>
            <div className="release-preview">
              <h5>Scozzarini Service Car</h5>
              <p>Foglio di consegna – {releaseDate || 'Data da definire'}</p>
              <div className="preview-grid">
                <div>
                  <span className="preview-label">Procedimento</span>
                  <span className="preview-value">{procedimentoNumero || '—'}</span>
                </div>
                <div>
                  <span className="preview-label">Disposto da</span>
                  <span className="preview-value">{dispostoDa || '—'}</span>
                </div>
                <div>
                  <span className="preview-label">Ufficio</span>
                  <span className="preview-value">{ufficioDi || '—'}</span>
                </div>
                <div>
                  <span className="preview-label">Data disposizione</span>
                  <span className="preview-value">{dataDisposizione || '—'}</span>
                </div>
                <div>
                  <span className="preview-label">Ora presenza</span>
                  <span className="preview-value">{oraPresenza || '—'}</span>
                </div>
                <div>
                  <span className="preview-label">Consegnatario</span>
                  <span className="preview-value">{recipientName || '—'}</span>
                </div>
                <div>
                  <span className="preview-label">Luogo / Data nascita</span>
                  <span className="preview-value">
                    {(luogoNascita || '—') + ' / ' + (dataNascita || '—')}
                  </span>
                </div>
                <div>
                  <span className="preview-label">Residenza</span>
                  <span className="preview-value">
                    {(residenza || '—') + (via ? ', ' + via : '')}
                  </span>
                </div>
                <div>
                  <span className="preview-label">Marca</span>
                  <span className="preview-value">{marca || '—'}</span>
                </div>
                <div>
                  <span className="preview-label">Targa</span>
                  <span className="preview-value">{targaValue || '—'}</span>
                </div>
                <div>
                  <span className="preview-label">Telaio</span>
                  <span className="preview-value">{telaio || '—'}</span>
                </div>
              </div>
              <div className="preview-notes">
                <span className="preview-label">Gela</span>
                <p>{dataGela || releaseDate || '—'}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary ghost" onClick={onClose}>
            Chiudi
          </button>
          <button type="button" className="primary" onClick={handlePrint}>
            Stampa foglio
          </button>
        </div>
      </div>
    </div>
  );
}

