'use client';

import type { ShiftType } from '@/types';
import { isPartShift, isFixedPartShift, PART_SHIFT_OPTIONS, SHIFT_OPTIONS, SHIFT_DEFAULTS } from '@/lib/constants';

interface ShiftTypePickerProps {
  value: ShiftType;
  onChange: (value: ShiftType) => void;
  compact?: boolean;
  disabled?: boolean;
  showFixedTime?: boolean;
}

export default function ShiftTypePicker({ value, onChange, compact = false, disabled = false, showFixedTime = false }: ShiftTypePickerProps) {
  const isPart = isPartShift(value);
  const renderOptions = (options: { value: ShiftType; label: string }[], secondary = false) => (
    <div role="group" aria-label={secondary ? '파트 유형' : '근무 타입'} style={{
      display: 'grid', gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      width: '100%', padding: 3, borderRadius: 8, gap: 3, boxSizing: 'border-box',
      background: secondary ? 'var(--color-surface-subtle)' : 'var(--color-muted-bg)',
    }}>
      {options.map((option) => {
        const active = secondary ? value === option.value : (option.value === 'part' ? isPart : value === option.value);
        return <button key={option.value} type="button" aria-pressed={active} disabled={disabled}
          onClick={() => onChange(!secondary && option.value === 'part' && isPart ? value : option.value)}
          style={{
            minWidth: 0, borderRadius: 6, padding: compact ? '6px 0' : secondary ? '8px 0' : '10px 0',
            fontSize: compact ? 11 : secondary ? 12 : 13, fontWeight: active ? 700 : 500,
            background: active ? 'var(--color-surface)' : 'transparent',
            color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
            cursor: disabled ? 'default' : 'pointer', textAlign: 'center', whiteSpace: compact ? 'normal' : 'nowrap',
            letterSpacing: '-0.02em', transition: 'all 0.15s ease', opacity: disabled ? 0.6 : 1,
            border: active ? '1px solid var(--color-border)' : '1px solid transparent',
          }}>{option.label}</button>;
      })}
    </div>
  );

  return <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 12 }}>
    {renderOptions(SHIFT_OPTIONS)}
    {isPart && <div>
      <div style={{ fontSize: compact ? 10 : 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>파트 유형</div>
      {renderOptions(PART_SHIFT_OPTIONS, true)}
    </div>}
    {showFixedTime && isFixedPartShift(value) && <div style={{ fontSize: compact ? 11 : 13, color: 'var(--color-text-subtle)', fontVariantNumeric: 'tabular-nums' }}>
      근무 시간 {SHIFT_DEFAULTS[value].start} ~ {SHIFT_DEFAULTS[value].end}
    </div>}
  </div>;
}
