import { useCallback, useEffect, useMemo, useState } from 'react';
import { CaseForm } from './CaseForm';
import {
  createCaseFromForm,
  deleteCases,
  fetchCases,
  updateCaseFromForm,
  updateCaseStatus,
} from './api';
import type { CaseRecord, ReleasePrintPayload, SeizureCaseFormData } from './types';
import {
  CASE_CATEGORIES,
  DEFAULT_CATEGORY_KEY,
  DEFAULT_SUBCATEGORY_KEY,
  deriveCategoryFromCase,
  deriveProcedureMeta,
} from './caseCategories';
import { mapCaseRecordToForm } from './mappers';
import { CaseBoard } from './components/CaseBoard';
import { CreateSidebar } from './components/CreateSidebar';
import { CaseDetailModal } from './components/CaseDetailModal';
import { ReleaseModal } from './components/ReleaseModal';
import { ReportModal } from './components/ReportModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { printReleaseDocument } from './printReleaseDocument';
import {
  printReportDocument,
  type ReportColumn,
} from './printReportDocument';

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

const REPORT_COLUMNS: ReportColumn[] = [
  {
    key: 'numero_interno_pratica',
    label: 'Numero interno pratica',
    accessor: (record) => record.internal_number ?? '—',
  },
  {
    key: 'numero_procedimento',
    label: 'Numero procedimento',
    accessor: (record) => record.seizure_case_details?.procedure_number ?? record.case_number ?? '—',
  },
  {
    key: 'chiave_bacheca',
    label: 'Chiave in bacheca',
    accessor: (record) => record.board_key ?? '—',
  },
  {
    key: 'data_sequestro',
    label: 'Data sequestro',
    accessor: (record) => formatDate(record.seizure_case_details?.seizure_date) ?? '—',
  },
  {
    key: 'organo_accertatore',
    label: 'Organo accertatore',
    accessor: (record) => record.seizure_case_details?.enforcement_body ?? '—',
  },
  {
    key: 'generalita_trasgressore',
    label: 'Generalità trasgressore',
    accessor: (record) => record.seizure_case_details?.offender_details ?? '—',
  },
  {
    key: 'numero_targa',
    label: 'Numero targa',
    accessor: (record) =>
      record.vehicles?.plate ?? record.seizure_case_details?.plate_number ?? '—',
  },
  {
    key: 'numero_telaio',
    label: 'Numero telaio',
    accessor: (record) => record.seizure_case_details?.vin_number ?? '—',
  },
  {
    key: 'tipo_veicolo',
    label: 'Tipo veicolo',
    accessor: (record) => {
      const tipo = record.seizure_case_details?.vehicle_type;
      if (!tipo) return '—';
      return tipo.charAt(0).toUpperCase() + tipo.slice(1);
    },
  },
  {
    key: 'marca_modello_veicolo',
    label: 'Marca e modello',
    accessor: (record) =>
      record.seizure_case_details?.vehicle_brand_model ?? record.vehicles?.brand ?? '—',
  },
  {
    key: 'peso_veicolo',
    label: 'Peso veicolo',
    accessor: (record) => record.seizure_case_details?.vehicle_weight ?? '—',
  },
  {
    key: 'tipo_intervento',
    label: 'Tipo intervento',
    accessor: (record) => {
      const tipo = record.seizure_case_details?.intervention_type;
      if (!tipo) return '—';
      return tipo.charAt(0).toUpperCase() + tipo.slice(1);
    },
  },
  {
    key: 'latore_1_trasporto',
    label: 'Latore 1° trasporto',
    accessor: (record) => record.seizure_case_details?.carrier_one ?? '—',
  },
  {
    key: 'km_1_trasporto',
    label: 'Km 1° trasporto',
    accessor: (record) =>
      record.seizure_case_details?.carrier_one_km !== null && record.seizure_case_details?.carrier_one_km !== undefined
        ? `${record.seizure_case_details.carrier_one_km} km`
        : '—',
  },
  {
    key: 'latore_2_trasporto',
    label: 'Latore 2° trasporto',
    accessor: (record) => record.seizure_case_details?.carrier_two ?? '—',
  },
  {
    key: 'km_2_trasporto',
    label: 'Km 2° trasporto',
    accessor: (record) =>
      record.seizure_case_details?.carrier_two_km !== null && record.seizure_case_details?.carrier_two_km !== undefined
        ? `${record.seizure_case_details.carrier_two_km} km`
        : '—',
  },
  {
    key: 'data_entrata',
    label: 'Data entrata',
    accessor: (record) => formatDate(record.seizure_case_details?.entry_date) ?? '—',
  },
  {
    key: 'motivo_entrata',
    label: 'Motivo entrata',
    accessor: (record) => record.seizure_case_details?.entry_reason ?? '—',
  },
  {
    key: 'data_uscita',
    label: 'Data uscita',
    accessor: (record) => formatDate(record.seizure_case_details?.exit_date) ?? '—',
  },
  {
    key: 'motivo_uscita',
    label: 'Motivo uscita',
    accessor: (record) => record.seizure_case_details?.exit_reason ?? '—',
  },
  {
    key: 'durata_custodia',
    label: 'Durata custodia',
    accessor: (record) => record.seizure_case_details?.custody_duration ?? '—',
  },
  {
    key: 'oneri_custodia',
    label: 'Oneri custodia',
    accessor: (record) => record.seizure_case_details?.custody_costs ?? '—',
  },
  {
    key: 'ufficio_destinatario',
    label: 'Ufficio destinatario',
    accessor: (record) =>
      record.destination_office?.name ??
      record.seizure_case_details?.destination_office ??
      '—',
  },
  {
    key: 'data_richiesta',
    label: 'Data richiesta',
    accessor: (record) => formatDate(record.seizure_case_details?.request_date) ?? '—',
  },
  {
    key: 'data_fattura',
    label: 'Data fattura',
    accessor: (record) => formatDate(record.seizure_case_details?.invoice_date) ?? '—',
  },
  {
    key: 'numero_fattura',
    label: 'Numero fattura',
    accessor: (record) => record.seizure_case_details?.invoice_number ?? '—',
  },
  {
    key: 'importo_fattura',
    label: 'Importo fattura',
    accessor: (record) => record.seizure_case_details?.invoice_amount ?? '—',
  },
  {
    key: 'note_varie',
    label: 'Note varie',
    accessor: (record) => record.seizure_case_details?.notes ?? '—',
  },
  {
    key: 'status',
    label: 'Stato pratica',
    accessor: (record) => record.status ?? '—',
  },
  {
    key: 'procedure_type',
    label: 'Tipologia',
    accessor: (record) => record.procedure_type ?? '—',
  },
  {
    key: 'subcategory',
    label: 'Sottocategoria',
    accessor: (record) => record.subcategory ?? '—',
  },
];

type ViewMode = 'list' | 'create' | 'edit';
type PrintStatus = 'idle' | 'preparing' | 'printing' | 'blocked' | 'error';

type CasesPageProps = {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
};

export function CasesPage({ showToast }: CasesPageProps) {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [creationCategoryKey, setCreationCategoryKey] = useState(DEFAULT_CATEGORY_KEY);
  const [creationSubCategoryKey, setCreationSubCategoryKey] = useState<string | null>(
    DEFAULT_SUBCATEGORY_KEY
  );
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [releaseInitialCaseId, setReleaseInitialCaseId] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [printStatus, setPrintStatus] = useState<PrintStatus>('idle');
  const [printError, setPrintError] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalCaseId, setDetailModalCaseId] = useState<string | null>(null);
  const [hasFormChanges, setHasFormChanges] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const loadCases = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await fetchCases();
      if (silent) {
        // Refresh silenzioso: aggiorna i dati mantenendo l'ordine esistente quando possibile
        setCases((prevCases) => {
          // Se non ci sono pratiche precedenti, usa i nuovi dati direttamente
          if (prevCases.length === 0) {
            return data;
          }
          
          // Crea una mappa dei nuovi dati per accesso rapido
          const dataMap = new Map(data.map(item => [item.id, item]));
          
          // Mantieni l'ordine delle pratiche esistenti, aggiornando i dati
          const updated = prevCases
            .map(prev => {
              const updatedItem = dataMap.get(prev.id);
              if (updatedItem) {
                dataMap.delete(prev.id);
                return updatedItem;
              }
              return null; // Pratica eliminata
            })
            .filter((item): item is CaseRecord => item !== null);
          
          // Aggiungi nuove pratiche alla fine
          dataMap.forEach(item => updated.push(item));
          
          return updated;
        });
      } else {
        // Caricamento iniziale: usa i dati direttamente
        setCases(data);
      }
      setSelectedCaseIds((prev) => prev.filter((id) => data.some((item) => item.id === id)));
      if (selectedCaseId && !data.some((item) => item.id === selectedCaseId)) {
        setSelectedCaseId(data[0]?.id ?? null);
      } else if (!selectedCaseId && data.length > 0) {
        setSelectedCaseId(data[0].id);
      }
    } catch (err: unknown) {
      if (!silent) {
        const message =
          err instanceof Error ? err.message : 'Errore durante il caricamento delle pratiche.';
        setError(message);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [selectedCaseId]);

  useEffect(() => {
    loadCases();
    
    // Refresh automatico silenzioso ogni 60 secondi per vedere modifiche di altri utenti
    // Con migliaia di pratiche, riduciamo la frequenza per non sovraccaricare il sistema
    const refreshInterval = setInterval(() => {
      loadCases(true); // Refresh silenzioso
    }, 60000); // 60 secondi invece di 30 (ottimizzato per migliaia di record)
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [loadCases]);

  const handleToggleCaseSelection = (id: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleAllCases = (ids: string[]) => {
    if (ids.length === 0) return;
    const allSelected = ids.every((id) => selectedCaseIds.includes(id));
    if (allSelected) {
      setSelectedCaseIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      const next = new Set(selectedCaseIds);
      for (const id of ids) {
        next.add(id);
      }
      setSelectedCaseIds(Array.from(next));
    }
  };

  const resetCreationState = () => {
    setCreationCategoryKey(DEFAULT_CATEGORY_KEY);
    setCreationSubCategoryKey(DEFAULT_SUBCATEGORY_KEY);
  };

  const handleCreateView = async () => {
    const currentMode = viewMode;
    const isCreateMode = currentMode === 'create' || currentMode === 'edit';
    if (isCreateMode && hasFormChanges) {
      const message = currentMode === 'edit'
        ? 'Sei sicuro di voler uscire? Le modifiche non salvate verranno perse.'
        : 'Sei sicuro di voler uscire? I dati inseriti verranno persi.';
      if (!window.confirm(message)) {
        return;
      }
    }

    resetCreationState();
    setViewMode('create');
    setEditingCaseId(null);
    setSelectedCaseId(null);
    setDetailModalOpen(false);
    setDetailModalCaseId(null);
    setHasFormChanges(false);
  };

  const handleCancelForm = async () => {
    setViewMode('list');
    setEditingCaseId(null);
    setHasFormChanges(false);
    if (cases.length > 0 && !selectedCaseId) {
      setSelectedCaseId(cases[0].id);
    }
  };

  const editingCase = useMemo(
    () => (editingCaseId ? cases.find((item) => item.id === editingCaseId) ?? null : null),
    [cases, editingCaseId]
  );

  const editingForm: SeizureCaseFormData | null = useMemo(() => {
    if (!editingCase) return null;
    return mapCaseRecordToForm(editingCase);
  }, [editingCase]);

  const handleSubmitForm = async (form: SeizureCaseFormData) => {
    setSaving(true);
    try {
      const { procedureType, subCategoryLabel } = deriveProcedureMeta(
        creationCategoryKey,
        creationSubCategoryKey
      );

      if (viewMode === 'edit' && editingCaseId) {
        const record = cases.find((item) => item.id === editingCaseId);
        const vehicleId = record?.vehicle_id ?? record?.vehicles?.id ?? null;
        await updateCaseFromForm(
          editingCaseId,
          form,
          {
            categoryKey: creationCategoryKey,
            subCategoryLabel,
            procedureType,
          },
          {
            vehicleId,
            caseNumber: record?.case_number ?? '',
          }
        );
        showToast('Pratica modificata con successo', 'success');
      } else {
        await createCaseFromForm(form, {
          categoryKey: creationCategoryKey,
          subCategoryLabel,
          procedureType,
        });
        showToast('Pratica creata con successo', 'success');
      }

      await loadCases();
      setViewMode('list');
      setEditingCaseId(null);
      setHasFormChanges(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore durante il salvataggio della pratica';
      showToast(message, 'error');
      console.error('Errore durante il salvataggio:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCases = async (ids: string[]) => {
    if (ids.length === 0) return;
    const message =
      ids.length === 1
        ? 'Confermi l\'eliminazione della pratica selezionata? L\'operazione è irreversibile.'
        : `Confermi l'eliminazione delle ${ids.length} pratiche selezionate? L'operazione è irreversibile.`;
    
    setConfirmDialog({
      open: true,
      title: 'Conferma eliminazione',
      message,
        onConfirm: () => {
          setConfirmDialog((prev) => ({ ...prev, open: false }));
          (async () => {
            setDeleting(true);
            try {
              await deleteCases(ids);
              await loadCases();
              setSelectedCaseIds((prev) => prev.filter((id) => !ids.includes(id)));
              setDetailModalOpen(false);
              setDetailModalCaseId(null);
              showToast(
                ids.length === 1 
                  ? 'Pratica eliminata con successo' 
                  : `${ids.length} pratiche eliminate con successo`,
                'success'
              );
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Errore durante l\'eliminazione delle pratiche';
              showToast(message, 'error');
              console.error('Errore durante l\'eliminazione:', error);
            } finally {
              setDeleting(false);
            }
          })();
        },
    });
  };

  const handleEditCase = async (id: string) => {
    const currentMode = viewMode;
    const isCreateMode = currentMode === 'create' || currentMode === 'edit';
    if (isCreateMode && hasFormChanges) {
      const message = currentMode === 'edit'
        ? 'Sei sicuro di voler uscire? Le modifiche non salvate verranno perse.'
        : 'Sei sicuro di voler uscire? I dati inseriti verranno persi.';
      if (!window.confirm(message)) {
        return;
      }
    }

    const record = cases.find((item) => item.id === id);
    if (!record) return;
    const { categoryKey, subCategoryKey } = deriveCategoryFromCase(record);
    setCreationCategoryKey(categoryKey);
    setCreationSubCategoryKey(subCategoryKey);
    setEditingCaseId(id);
    setViewMode('edit');
    setDetailModalOpen(false);
    setDetailModalCaseId(null);
    setHasFormChanges(false);
  };

  const handleOpenRelease = (caseId: string | null) => {
    setDetailModalOpen(false);
    setDetailModalCaseId(null);
    setReleaseInitialCaseId(caseId);
    setReleaseModalOpen(true);
  };

  const handlePrintRelease = async (payload: ReleasePrintPayload) => {
    setPrintError(null);
    setPrintStatus('preparing');
    try {
      await printReleaseDocument(payload);
      setPrintStatus('idle');
      
      // Chiedi se segnare il veicolo come rilasciato
      const caseId = payload.caseId || cases.find(
        (c) => 
          c.case_number === payload.procedimentoNumero ||
          c.seizure_case_details?.procedure_number === payload.procedimentoNumero ||
          (payload.targa && (
            c.vehicles?.plate === payload.targa ||
            c.seizure_case_details?.plate_number === payload.targa
          ))
      )?.id;
      
      if (caseId) {
        const shouldMarkReleased = window.confirm(
          'Il foglio di rilascio è stato generato con successo.\n\nVuoi segnare questo veicolo come rilasciato?'
        );
        
        if (shouldMarkReleased) {
          try {
            await updateCaseStatus(caseId, 'rilasciato');
            await loadCases();
            showToast('Veicolo segnato come rilasciato', 'success');
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Errore durante l\'aggiornamento dello status';
            showToast(message, 'error');
            console.error('Errore aggiornamento status:', error);
          }
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Errore durante la generazione del foglio.';
      setPrintError(message);
      setPrintStatus(message.toLowerCase().includes('bloccato') ? 'blocked' : 'error');
    }
  };

  const handleOpenReport = () => {
    setReportModalOpen(true);
  };

  const handlePrintReport = async (rows: CaseRecord[], columns: ReportColumn[]) => {
    if (rows.length === 0) {
      globalThis.alert('Nessuna pratica corrisponde ai filtri selezionati.');
      return;
    }
    setReportModalOpen(false);
    setPrintError(null);
    setPrintStatus('preparing');
    try {
      await printReportDocument(rows, columns);
      setPrintStatus('idle');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Errore durante la generazione del report.';
      setPrintError(message);
      setPrintStatus(message.toLowerCase().includes('bloccato') ? 'blocked' : 'error');
    }
  };

  const dismissPrintFeedback = () => {
    setPrintStatus('idle');
    setPrintError(null);
  };

  const handleShowDetails = (id: string) => {
    setViewMode('list');
    setEditingCaseId(null);
    setSelectedCaseId(id);
    setDetailModalCaseId(id);
    setDetailModalOpen(true);
  };

  const detailCase = useMemo(
    () => (detailModalCaseId ? cases.find((item) => item.id === detailModalCaseId) ?? null : null),
    [cases, detailModalCaseId]
  );

  const createMode = viewMode === 'create' || viewMode === 'edit';

  return (
    <section className="cases-page-root">
      <div className="cases-view-toggle">
        <button
          type="button"
          className={`toggle-pill ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => {
            if (createMode && hasFormChanges) {
              const message = viewMode === 'edit'
                ? 'Sei sicuro di voler uscire? Le modifiche non salvate verranno perse.'
                : 'Sei sicuro di voler uscire? I dati inseriti verranno persi.';
              if (!window.confirm(message)) {
                return;
              }
            }
            setViewMode('list');
          }}
        >
          Elenco pratiche
        </button>
        <button
          type="button"
          className={`toggle-pill ${createMode ? 'active' : ''}`}
          onClick={() => {
            if (createMode && hasFormChanges) {
              const message = viewMode === 'edit'
                ? 'Sei sicuro di voler uscire? Le modifiche non salvate verranno perse.'
                : 'Sei sicuro di voler uscire? I dati inseriti verranno persi.';
              if (!window.confirm(message)) {
                return;
              }
            }
            resetCreationState();
            setViewMode('create');
          }}
        >
          Nuova pratica
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {viewMode === 'list' && (
        <CaseBoard
          cases={cases}
          loading={loading}
          deleting={deleting}
          selectedCaseId={selectedCaseId}
          selectedCaseIds={selectedCaseIds}
          onToggleCaseSelection={handleToggleCaseSelection}
          onToggleAllCases={handleToggleAllCases}
          onCreateCase={handleCreateView}
          onEditCase={handleEditCase}
          onDeleteCases={handleDeleteCases}
          onOpenRelease={handleOpenRelease}
          onOpenReport={handleOpenReport}
          onRefresh={loadCases}
          onShowDetails={handleShowDetails}
        />
      )}

      {createMode && (
        <div className="create-layout">
          <CreateSidebar
            categories={CASE_CATEGORIES}
            selectedCategoryKey={creationCategoryKey}
            selectedSubCategoryKey={creationSubCategoryKey}
            onSelectCategory={(key) => {
              setCreationCategoryKey(key);
              const category = CASE_CATEGORIES.find((item) => item.key === key);
              setCreationSubCategoryKey(category?.subOptions?.[0]?.key ?? null);
            }}
            onSelectSubCategory={(key) => setCreationSubCategoryKey(key)}
          />
          <CaseForm
            onSubmit={handleSubmitForm}
            onCancel={handleCancelForm}
            categories={CASE_CATEGORIES}
            selectedCategoryKey={creationCategoryKey}
            selectedSubCategoryKey={creationSubCategoryKey}
            mode={viewMode === 'edit' ? 'edit' : 'create'}
            initialForm={viewMode === 'edit' ? editingForm : null}
            onFormChange={setHasFormChanges}
            saving={saving}
          />
        </div>
      )}

      {releaseModalOpen && (
        <ReleaseModal
          open={releaseModalOpen}
          cases={cases}
          initialCaseId={releaseInitialCaseId}
          onClose={() => setReleaseModalOpen(false)}
          onPrint={handlePrintRelease}
        />
      )}

      {reportModalOpen && (
        <ReportModal
          open={reportModalOpen}
          cases={cases}
          columns={REPORT_COLUMNS}
          onClose={() => setReportModalOpen(false)}
          onPrint={handlePrintReport}
        />
      )}

      {(printStatus === 'preparing' || printStatus === 'printing') && (
        <div className="print-spinner-overlay">
          <div className="print-spinner-card">
            <div className="spinner" />
            <p>Preparazione documento di stampa…</p>
          </div>
        </div>
      )}

      {(printStatus === 'blocked' || printStatus === 'error') && (
        <div className="print-spinner-overlay">
          <div className="print-spinner-card">
            <p>{printError ?? 'Impossibile completare la stampa.'}</p>
            <button type="button" className="primary" onClick={dismissPrintFeedback}>
              Ho capito
            </button>
          </div>
        </div>
      )}

      <CaseDetailModal
        open={detailModalOpen}
        record={detailCase}
        onClose={() => setDetailModalOpen(false)}
        onEdit={(id) => handleEditCase(id)}
        onDelete={(id) => {
          handleDeleteCases([id]);
        }}
        onRelease={(id) => handleOpenRelease(id)}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />
    </section>
  );
}

