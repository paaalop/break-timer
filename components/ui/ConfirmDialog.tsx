'use client';

import { useId, type ReactNode } from 'react';
import Dialog from './Dialog';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  pending?: boolean;
  zIndex?: number;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onClose,
  confirmLabel = '확인',
  cancelLabel = '취소',
  danger = false,
  pending = false,
  zIndex = 500,
}: ConfirmDialogProps) {
  const titleId = useId();

  return (
    <Dialog open={open} onClose={onClose} titleId={titleId} maxWidth={360} zIndex={zIndex}>
      <div className="ui-confirm-dialog">
        <h2 id={titleId} className="ui-section-title">{title}</h2>
        <div className="ui-body">{description}</div>
        <div className="ui-confirm-dialog__actions">
          <button type="button" className="ui-button ui-button--secondary" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`ui-button ${danger ? 'ui-button--danger' : 'ui-button--primary'}`}
            onClick={() => void onConfirm()}
            disabled={pending}
          >
            {pending ? '처리 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

