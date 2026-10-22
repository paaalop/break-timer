'use client';

import { useState } from 'react';
import type { Employee, Role, DayOfWeek, ShiftType, CreateEmployeeInput } from '@/types';
import { ROLE_OPTIONS, ROLE_LABELS, DAY_LABELS } from '@/lib/constants';
import ShiftTypePicker from '@/components/ui/ShiftTypePicker';
import Input from '@/components/ui/Input';
import BottomSheet from '@/components/ui/BottomSheet';
import Dialog from '@/components/ui/Dialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

// DAY_OPTIONS 순서 그대로 (월~일)
const DAY_TOGGLE_ORDER: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

const ROLE_ORDER: Record<string, number> = Object.fromEntries(
  ROLE_OPTIONS.map((opt, i) => [opt.value, i])
);

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getSortedRoles(roles: Role[]): Role[] {
  return [...roles]
    .filter((r) => r in ROLE_LABELS)
    .sort((a, b) => (ROLE_ORDER[a] ?? 99) - (ROLE_ORDER[b] ?? 99));
}

export interface EmployeeFormModalProps {
  mode: 'edit' | 'add';
  /** sheet: 모바일 바텀시트, dialog: PC 중앙 모달 */
  presentation: 'sheet' | 'dialog';
  emp?: Employee;
  onClose: () => void;
  onSave: (data: CreateEmployeeInput) => Promise<void>;
  onDelete?: () => void;
}

// ─── 직원 정보 모달 (수정 및 신규 등록 공용) ────────────────────────────────────
export default function EmployeeFormModal({
  mode,
  presentation,
  emp,
  onClose,
  onSave,
  onDelete,
}: EmployeeFormModalProps) {
  const isEdit = mode === 'edit';
  const isDialog = presentation === 'dialog';
  const [name, setName] = useState(emp?.name ?? '');
  const [roles, setRoles] = useState<Set<Role>>(() => {
    if (emp) {
      const valid = emp.available_roles.filter((r): r is Role => r in ROLE_LABELS);
      return new Set(valid);
    }
    return new Set<Role>();
  });
  const [days, setDays] = useState<Set<DayOfWeek>>(new Set(emp ? emp.available_days : []));
  const [shiftType, setShiftType] = useState<ShiftType>(emp?.default_shift_types[0] ?? 'open');
  const [isMinor, setIsMinor] = useState<boolean>(emp?.is_minor ?? false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [dayError, setDayError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── 폼 핸들러 ──────────────────────────────────────────────────────────────
  const toggleRole = (r: Role) => {
    setRoles((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      if (next.size > 0) setRoleError(null);
      return next;
    });
  };

  const toggleDay = (d: DayOfWeek) => {
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      if (next.size > 0) setDayError(null);
      return next;
    });
  };

  const handleSave = async () => {
    let hasError = false;
    setNameError(null);
    setRoleError(null);
    setDayError(null);
    setGeneralError(null);

    if (!name.trim()) {
      setNameError('이름을 입력해 주세요.');
      hasError = true;
    }
    if (days.size === 0) {
      setDayError('근무 요일을 1개 이상 선택해 주세요.');
      hasError = true;
    }
    if (hasError) return;

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        available_roles: getSortedRoles([...roles]),
        available_days: [...days] as DayOfWeek[],
        default_shift_types: [shiftType],
        is_minor: isMinor,
      });
      onClose();
    } catch (err: unknown) {
      setGeneralError(getErrorMessage(err, isEdit ? '수정 실패' : '등록 실패'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmDialog(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    marginBottom: 8,
    letterSpacing: '-0.02em',
  };

  const title = isEdit ? '직원 정보 수정' : '신규 직원 추가';

  const fields = (
    <>
      {/* 이름 입력 */}
      <div>
        <label style={labelStyle}>이름</label>
        <Input
          variant="underline"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim()) setNameError(null);
          }}
          placeholder="이름 입력"
          style={{ padding: '8px', fontSize: 20, fontWeight: 700 }}
          autoFocus={isDialog}
        />
        {nameError && (
          <p className="ui-caption" style={{ color: 'var(--color-danger)', margin: '6px 0 0', fontWeight: 500 }}>
            {nameError}
          </p>
        )}
      </div>

      {/* 직무 (다중 선택) 및 미성년자 토글 */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>직무</label>
          <button
            type="button"
            onClick={() => setIsMinor((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '4px 8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: 'transparent',
              border: 'none',
            }}
            title="미성년자 여부 (총 근무시간 - 7시간 휴게 적용)"
            aria-pressed={isMinor}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: isMinor ? 700 : 400,
                color: isMinor ? 'var(--color-primary)' : 'var(--color-text-muted)',
                letterSpacing: '-0.02em',
              }}
            >
              미성년자
            </span>
            <div
              style={{
                width: 28,
                height: 16,
                borderRadius: 8,
                background: isMinor ? 'var(--color-primary)' : 'var(--color-border-strong)',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
                boxSizing: 'border-box',
                transition: 'background-color 0.18s ease',
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: 'var(--color-surface)',
                  transform: isMinor ? 'translateX(12px)' : 'translateX(0px)',
                  transition: 'transform 0.18s ease',
                }}
              />
            </div>
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%', boxSizing: 'border-box' }}>
          {ROLE_OPTIONS.map((opt) => {
            const active = roles.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleRole(opt.value)}
                aria-pressed={active}
                style={{
                  border: 'none',
                  borderRadius: 8,
                  padding: '11px 0',
                  fontSize: 13,
                  fontWeight: active ? 700 : 400,
                  background: active ? 'transparent' : 'var(--color-muted-bg)',
                  color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.02em',
                  outline: active ? '2px solid var(--color-primary)' : 'none',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {isMinor && (
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '6px 0 0', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
            미성년자: 총 근무시간에서 7시간을 뺀 시간(최소 30분)이 휴게시간으로 자동 적용됩니다.
          </p>
        )}
        {roleError && (
          <p className="ui-caption" style={{ color: 'var(--color-danger)', margin: '6px 0 0', fontWeight: 500 }}>
            {roleError}
          </p>
        )}
      </div>

      {/* 근무 요일 (다중 선택: 원형 버튼) */}
      <div>
        <label style={labelStyle}>근무 요일</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {DAY_TOGGLE_ORDER.map((d) => {
            const active = days.has(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                aria-pressed={active}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: active ? 700 : 400,
                  border: 'none',
                  background: active ? 'transparent' : 'var(--color-muted-bg)',
                  color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.15s ease',
                  outline: active ? '2px solid var(--color-primary)' : 'none',
                }}
              >
                {DAY_LABELS[d]}
              </button>
            );
          })}
        </div>
        {dayError && (
          <p className="ui-caption" style={{ color: 'var(--color-danger)', margin: '6px 0 0', fontWeight: 500 }}>
            {dayError}
          </p>
        )}
      </div>

      {/* 근무 타입 */}
      <div>
        <label style={labelStyle}>근무 타입</label>
        <ShiftTypePicker value={shiftType} onChange={setShiftType} showFixedTime disabled={isSaving} />
      </div>

      {generalError && (
        <p className="ui-caption" style={{ color: 'var(--color-danger)', fontWeight: 500 }}>{generalError}</p>
      )}
    </>
  );

  const confirmDialog = (
    <ConfirmDialog
      open={showDeleteConfirmDialog}
      title="직원을 삭제하시겠습니까?"
      description="기존에 배정된 스케줄 기록은 유지됩니다."
      confirmLabel="삭제"
      danger
      pending={isDeleting}
      zIndex={600}
      onClose={() => setShowDeleteConfirmDialog(false)}
      onConfirm={handleConfirmDelete}
    />
  );

  if (isDialog) {
    return (
      <>
        <Dialog onClose={onClose} maxWidth={560}>
          <div className="emp-modal">
            <div className="emp-modal__header">
              <h2 className="ui-overlay-title">{title}</h2>
              <button type="button" className="emp-modal__close" onClick={onClose} aria-label="닫기">✕</button>
            </div>
            <div className="emp-modal__body">{fields}</div>
            <div className="emp-modal__footer">
              {isEdit && onDelete ? (
                <button
                  type="button"
                  className="ui-button ui-button--secondary emp-modal__delete"
                  onClick={() => setShowDeleteConfirmDialog(true)}
                  disabled={isSaving || isDeleting}
                >
                  삭제
                </button>
              ) : <span />}
              <div className="emp-modal__footer-actions">
                <button type="button" className="ui-button ui-button--primary" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? '저장 중...' : (isEdit ? '저장' : '등록')}
                </button>
              </div>
            </div>
          </div>
        </Dialog>
        {confirmDialog}
      </>
    );
  }

  return (
    <>
      <BottomSheet onClose={onClose} maxWidth={480} maxHeight="92vh" padding="10px 20px 36px" gap={20}>
        {/* 헤더: 제목 + (수정 모드일 때만 우상단 직원 삭제) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, minHeight: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-neutral-dark)', margin: 0, lineHeight: 1 }}>
            {title}
          </h2>
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirmDialog(true)}
              disabled={isSaving || isDeleting}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
                color: 'var(--color-danger)',
                fontSize: 13,
                fontWeight: 600,
                opacity: isSaving || isDeleting ? 0.4 : 1,
                letterSpacing: '-0.02em',
              }}
            >
              직원 삭제
            </button>
          )}
        </div>

        {fields}

        {/* 저장 버튼 */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          style={{
            width: '100%',
            padding: '14px 0',
            fontSize: 14,
            fontWeight: 700,
            border: 'none',
            borderRadius: 8,
            background: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.6 : 1,
            marginTop: 6,
            transition: 'opacity 0.15s',
          }}
        >
          {isSaving ? (isEdit ? '저장 중...' : '등록 중...') : (isEdit ? '변경사항 저장' : '직원 등록')}
        </button>
      </BottomSheet>
      {confirmDialog}
    </>
  );
}

