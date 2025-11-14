import { useCallback, useEffect, useMemo, useState } from 'react';
import { CaseForm } from './CaseForm';
import {
  acquireCaseLock,
  checkCaseLock,
  createCaseFromForm,
  deleteCases,
  fetchCases,
  releaseCaseLock,
  updateCaseFromForm,
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

const REPORT_COLUMNS: ReportColumn[] = [
  {
    key: 'plate',
    label: 'Targa',
    accessor: (record) =>
      record.vehicles?.plate ?? record.seizure_case_details?.plate_number ?? '—',
  },
  {
    key: 'case_number',
    label: 'Numero pratica',
    accessor: (record) => record.case_number ?? '—',
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
  {
    key: 'owner',
    label: 'Trasgressore / proprietario',
    accessor: (record) =>
      record.seizure_case_details?.offender_details ??
      record.seizure_case_details?.notes ??
      '—',
  },
  {
    key: 'dates',
    label: 'Date principali',
    accessor: (record) => {
      const details = record.seizure_case_details;
      const parts = [
        details?.seizure_date ? `Sequestro: ${details.seizure_date}` : null,
        details?.entry_date ? `Entrata: ${details.entry_date}` : null,
        details?.exit_date ? `Uscita: ${details.exit_date}` : null,
      ].filter(Boolean);
      return parts.join(' • ') || '—';
    },
  },
  {
    key: 'custody',
    label: 'Custodia',
    accessor: (record) => {
      const details = record.seizure_case_details;
      const parts = [
        details?.custody_duration ? `Durata: ${details.custody_duration}` : null,
        details?.custody_costs ? `Oneri: ${details.custody_costs}` : null,
      ].filter(Boolean);
      return parts.join(' • ') || '—';
    },
  },
  {
    key: 'invoice',
    label: 'Fatturazione',
    accessor: (record) => {
      const details = record.seizure_case_details;
      const parts = [
        details?.invoice_number ? `N° ${details.invoice_number}` : null,
        details?.invoice_amount ? `Importo ${details.invoice_amount}` : null,
        details?.invoice_date ? `Data ${details.invoice_date}` : null,
      ].filter(Boolean);
      return parts.join(' • ') || '—';
    },
  },
];

type ViewMode = 'list' | 'create' | 'edit';
type PrintStatus = 'idle' | 'preparing' | 'printing' | 'blocked' | 'error';

export function CasesPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [lockError, setLockError] = useState<string | null>(null);
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

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCases();
      setCases(data);
      setSelectedCaseIds((prev) => prev.filter((id) => data.some((item) => item.id === id)));
      if (selectedCaseId && !data.some((item) => item.id === selectedCaseId)) {
        setSelectedCaseId(data[0]?.id ?? null);
      } else if (!selectedCaseId && data.length > 0) {
        setSelectedCaseId(data[0].id);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Errore durante il caricamento delle pratiche.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedCaseId]);

  useEffect(() => {
    loadCases();
    
    // Refresh automatico ogni 30 secondi per vedere modifiche di altri utenti
    const refreshInterval = setInterval(() => {
      loadCases();
    }, 30000);
    
    return () => {
      clearInterval(refreshInterval);
      // Rilascia il lock quando il componente viene smontato
      if (editingCaseId) {
        releaseCaseLock(editingCaseId).catch((error) => {
          console.error('Errore rilascio lock al cleanup:', error);
        });
      }
    };
  }, [loadCases, editingCaseId]);

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

    // Rilascia il lock se si sta modificando una pratica
    if (editingCaseId) {
      try {
        await releaseCaseLock(editingCaseId);
      } catch (error) {
        console.error('Errore rilascio lock:', error);
      }
    }

    resetCreationState();
    setViewMode('create');
    setEditingCaseId(null);
    setSelectedCaseId(null);
    setDetailModalOpen(false);
    setDetailModalCaseId(null);
    setHasFormChanges(false);
    setLockError(null);
  };

  const handleCancelForm = async () => {
    // Rilascia il lock se si sta modificando una pratica
    if (editingCaseId) {
      try {
        await releaseCaseLock(editingCaseId);
      } catch (error) {
        console.error('Errore rilascio lock:', error);
      }
    }
    
    setViewMode('list');
    setEditingCaseId(null);
    setHasFormChanges(false);
    setLockError(null);
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
    } else {
      await createCaseFromForm(form, {
        categoryKey: creationCategoryKey,
        subCategoryLabel,
        procedureType,
      });
    }

    // Rilascia il lock dopo il salvataggio
    if (editingCaseId) {
      try {
        await releaseCaseLock(editingCaseId);
      } catch (error) {
        console.error('Errore rilascio lock:', error);
      }
    }

    await loadCases();
    setViewMode('list');
    setEditingCaseId(null);
    setHasFormChanges(false);
    setLockError(null);
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
            try {
              await deleteCases(ids);
              await loadCases();
              setSelectedCaseIds((prev) => prev.filter((id) => !ids.includes(id)));
              setDetailModalOpen(false);
              setDetailModalCaseId(null);
            } catch (error) {
              console.error('Errore durante l\'eliminazione:', error);
              alert('Errore durante l\'eliminazione delle pratiche. Controlla la console per i dettagli.');
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

    // Verifica se la pratica è già bloccata
    try {
      const existingLock = await checkCaseLock(id);
      if (existingLock) {
        const lockedBy = existingLock.locked_by_display_name || existingLock.locked_by_username || 'un altro utente';
        setLockError(`La pratica è già in modifica da ${lockedBy}.`);
        return;
      }

      // Acquisisci il lock
      await acquireCaseLock(id);
      setLockError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore durante l\'acquisizione del lock.';
      setLockError(message);
      return;
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
      {lockError && (
        <div className="alert error" style={{ margin: '1rem 0', padding: '1rem', borderRadius: '8px' }}>
          <strong>Attenzione:</strong> {lockError}
        </div>
      )}

      {viewMode === 'list' && (
        <CaseBoard
          cases={cases}
          loading={loading}
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

