import { CaseDetail } from '../CaseDetail';
import type { CaseRecord } from '../types';

type CaseDetailModalProps = {
  open: boolean;
  record: CaseRecord | null;
  onClose: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRelease?: (id: string) => void;
};

export function CaseDetailModal({
  open,
  record,
  onClose,
  onEdit,
  onDelete,
  onRelease,
}: CaseDetailModalProps) {
  if (!open || !record) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-card-wide case-detail-modal-card">
        <div className="modal-header">
          <h3>Dettaglio pratica</h3>
        </div>
        <div className="modal-body scrollable">
          <CaseDetail
            record={record}
            onEdit={onEdit}
            onDelete={onDelete}
            onRequestRelease={onRelease}
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

