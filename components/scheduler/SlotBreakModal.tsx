'use client';

import { useEffect, useId, useRef, useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet';
import Avatar from '@/components/ui/Avatar';
import { getBreakDurationMinutes, overlaps, toMinutes, toTimeStr } from '@/lib/autoBreakAlgo';
import { getSlotBreakUnavailableReason } from '@/lib/breakValidation';
import { ALL_ROLES, ROLE_LABELS, SHIFT_LABELS, SHIFT_TEXT_COLOR } from '@/lib/constants';
import { useScheduleStore } from '@/store/useScheduleStore';
import type { WorkSchedule } from '@/types';

interface SlotBreakModalProps {
  startMin: number;
  schedules: WorkSchedule[];
  onSaved: (schedule: WorkSchedule) => void;
  onClose: () => void;
}

export default function SlotBreakModal({ startMin, schedules, onSaved, onClose }: SlotBreakModalProps) {
  const titleId = useId();
  const { setManualBreak } = useScheduleStore();
  const [selectedIds, setSelectedIds] = useState<string[]>(() => schedules.filter((schedule) =>
    schedule.break_start_time && schedule.break_end_time && overlaps(startMin, startMin + 30,
      toMinutes(schedule.break_start_time), toMinutes(schedule.break_end_time))
  ).map((schedule) => schedule.id));
  const [appliedIds, setAppliedIds] = useState(() => new Set(selectedIds));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const selectableSchedules = schedules.filter((schedule) => appliedIds.has(schedule.id)
    || (!schedule.break_start_time && !schedule.break_end_time && !getSlotBreakUnavailableReason(schedule, startMin)));
  const selectedCount = selectableSchedules.filter((schedule) => selectedIds.includes(schedule.id)).length;
  const additions = selectableSchedules.filter((schedule) => selectedIds.includes(schedule.id) && !appliedIds.has(schedule.id));
  const removals = schedules.filter((schedule) => !selectedIds.includes(schedule.id) && appliedIds.has(schedule.id));
  const hasChanges = additions.length + removals.length > 0;
  const isAllSelected = selectableSchedules.length > 0 && selectableSchedules.every((schedule) => selectedIds.includes(schedule.id));

  const toggleSelect = (id: string) => {
    if (savingRef.current) return;
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const toggleAll = () => {
    if (savingRef.current) return;
    setSelectedIds(isAllSelected ? [] : selectableSchedules.map((schedule) => schedule.id));
  };
  const handleSubmit = async () => {
    if (savingRef.current) return;
    if (!hasChanges) {
      onClose();
      return;
    }
    savingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    let savedCount = 0;
    try {
      for (const schedule of [...removals, ...additions]) {
        const clear = !selectedIds.includes(schedule.id);
        const reason = !clear && getSlotBreakUnavailableReason(schedule, startMin);
        if (reason) throw new Error(`${schedule.employee?.name ?? '직원'} · ${reason}`);
        const start = clear ? null : toTimeStr(startMin);
        const end = clear ? null : toTimeStr(startMin + getBreakDurationMinutes(schedule));
        await setManualBreak(schedule.id, start, end, true);
        if (mountedRef.current) setAppliedIds((current) => {
          const next = new Set(current);
          if (clear) next.delete(schedule.id);
          else next.add(schedule.id);
          return next;
        });
        savedCount += 1;
        onSaved({ ...schedule, break_start_time: start, break_end_time: end, updated_at: new Date().toISOString() });
      }
      if (mountedRef.current) onClose();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : '휴게 저장 실패';
      if (mountedRef.current) setError(savedCount > 0 ? `${savedCount}명 변경이 저장되었습니다. ${message} · 확인을 눌러 나머지를 다시 저장하세요.` : message);
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setIsSubmitting(false);
    }
  };

  const close = () => { if (!savingRef.current) onClose(); };
  return (
    <BottomSheet onClose={close} titleId={titleId} maxWidth={480} maxHeight="88vh" padding="12px 20px 24px" gap={0} style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 4, flexShrink: 0 }}>
        <div>
          <h3 id={titleId} style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-neutral-dark)', margin: 0 }}>휴게자 선택</h3>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2, display: 'block' }}>{toTimeStr(startMin)} 시작 · 배정 가능 {selectableSchedules.length}명</span>
        </div>
        {selectableSchedules.length > 0 && <button type="button" onClick={toggleAll} disabled={isSubmitting}
          style={{ border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', cursor: isSubmitting ? 'not-allowed' : 'pointer', padding: '6px 4px' }}>{isAllSelected ? '선택 해제' : '전체 선택'}</button>}
      </div>
      <div role="region" aria-label="휴게자 목록" style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', gap: 0, margin: '0 -20px' }}>
        {selectableSchedules.length === 0 && <p className="ui-caption" style={{ padding: '32px 0', textAlign: 'center' }}>선택할 수 있는 직원이 없습니다.</p>}
        {selectableSchedules.map((schedule) => {
          const name = schedule.employee?.name ?? '알 수 없음';
          const reason = appliedIds.has(schedule.id) ? null : getSlotBreakUnavailableReason(schedule, startMin);
          const isSelected = selectedIds.includes(schedule.id);
          const reasonId = `${titleId}-${schedule.id}`;
          const roles = ALL_ROLES.filter((role) => schedule.employee?.available_roles.includes(role));
          return (
            <div key={schedule.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button type="button" role="checkbox" aria-checked={isSelected} aria-label={`${name} 휴게 선택`} aria-describedby={reason ? reasonId : undefined}
                  disabled={isSubmitting || Boolean(reason)}
                  onClick={() => toggleSelect(schedule.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, minWidth: 0, gap: 12, padding: '12px 20px', border: 'none', borderRadius: 0, background: isSelected ? 'var(--color-surface-subtle)' : 'transparent', textAlign: 'left', cursor: isSubmitting || reason ? 'not-allowed' : 'pointer', opacity: reason ? 0.55 : 1 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <Avatar name={name} size={36} initialsLength={2} />
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-neutral-dark)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{name}</span>
                        {roles.length > 0 && <span style={{ padding: '1px 6px', fontSize: 11, fontWeight: 600, borderRadius: 4, background: 'var(--color-muted-bg)', color: 'var(--color-text-subtle)', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{roles.map((role) => ROLE_LABELS[role]).join(' · ')}</span>}
                        {schedule.employee?.is_minor && <span style={{ padding: '1px 5px', fontSize: 10, fontWeight: 700, borderRadius: 4, background: 'var(--color-warning-surface)', color: 'var(--color-warning)', lineHeight: 1.3, whiteSpace: 'nowrap', flexShrink: 0 }}>미성년자</span>}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: SHIFT_TEXT_COLOR[schedule.shift_type] }}>{SHIFT_LABELS[schedule.shift_type]}</span>
                        <span className="ui-caption">{schedule.start_time.slice(0, 5)}~{schedule.end_time.slice(0, 5)}</span>
                      </span>
                    </span>
                  </span>
                  <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 6, border: isSelected ? 'none' : '1.5px solid var(--color-border-strong)', background: isSelected ? 'var(--color-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isSelected && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1.5 4.5L4.5 7.5L10.5 1.5" stroke="var(--color-on-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </span>
                </button>
              </div>
              {reason && <p id={reasonId} className="ui-caption" style={{ margin: '0 8px 10px 56px' }}>{reason}</p>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 14, flexShrink: 0 }}>
        {error && <div role="alert" className="ui-alert ui-alert--danger" style={{ marginBottom: 12 }}>{error}</div>}
        <button type="button" className="ui-button ui-button--primary" onClick={() => void handleSubmit()} disabled={isSubmitting || (!hasChanges && selectedCount === 0)} style={{ width: '100%', padding: '14px 0', fontSize: 14, fontWeight: 700, borderRadius: 8 }}>{isSubmitting ? '저장 중...' : '확인'}</button>
      </div>
    </BottomSheet>
  );
}
