'use client';

import { useId, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import type { WorkSchedule } from '@/types';
import { useScheduleStore } from '@/store/useScheduleStore';

interface ManualBreakModalProps {
  schedule: WorkSchedule;
  onClose: () => void;
}

export default function ManualBreakModal({ schedule, onClose }: ManualBreakModalProps) {
  const titleId = useId();
  const { setManualBreak, error } = useScheduleStore();
  const [start, setStart] = useState((schedule.break_start_time ?? '14:00').slice(0, 5));
  const [end, setEnd] = useState((schedule.break_end_time ?? '15:00').slice(0, 5));
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSave = async () => {
    setLocalError(null);
    if (!start || !end) {
      setLocalError('시작 시간과 종료 시간을 입력하세요.');
      return;
    }
    if (start >= end) {
      setLocalError('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }

    setIsSaving(true);
    try {
      await setManualBreak(schedule.id, start, end);
      onClose();
    } catch (saveError) {
      setLocalError(saveError instanceof Error ? saveError.message : '저장 실패');
    } finally {
      setIsSaving(false);
    }
  };

  const displayError = localError ?? error;

  return (
    <Dialog open onClose={onClose} titleId={titleId} maxWidth={360}>
      <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div>
          <h2 id={titleId} className="ui-overlay-title">휴게 시간 수동 수정</h2>
          <p className="ui-caption" style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
            {schedule.employee?.name} — {schedule.work_date}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <label className="ui-label" htmlFor="manual-break-start">
            휴게 시작
            <input id="manual-break-start" type="time" value={start} onChange={(event) => setStart(event.target.value)} style={inputStyle} />
          </label>
          <label className="ui-label" htmlFor="manual-break-end">
            휴게 종료
            <input id="manual-break-end" type="time" value={end} onChange={(event) => setEnd(event.target.value)} style={inputStyle} />
          </label>
        </div>

        {displayError ? <div className="ui-alert ui-alert--danger">{displayError}</div> : null}

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button type="button" className="ui-button ui-button--primary" style={{ flex: 1 }} onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? '저장 중...' : '저장'}
          </button>
          <button type="button" className="ui-button ui-button--secondary" onClick={onClose} disabled={isSaving}>취소</button>
        </div>
      </div>
    </Dialog>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 'var(--space-1)',
  padding: 'var(--space-2) var(--space-3)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  color: 'var(--color-neutral-dark)',
  outline: 'none',
};
