'use client';

import { useState, useEffect } from 'react';
import type { Employee, Role, ShiftType, DayOfWeek, CreateEmployeeInput } from '@/types';
import { ROLE_OPTIONS, DAY_OPTIONS, SHIFT_OPTIONS } from '@/lib/constants';

interface EmployeeFormProps {
  employee?: Employee | null;
  onSave: (data: CreateEmployeeInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

function ToggleButton<T extends string | number>({
  value,
  label,
  selected,
  onToggle,
}: {
  value: T;
  label: string;
  selected: boolean;
  onToggle: (v: T) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(value)}
      style={{
        padding: '5px 12px',
        fontSize: 13,
        fontWeight: 500,
        border: '1px solid var(--color-border)',
        borderRadius: 4,
        background: selected ? 'var(--color-primary)' : 'var(--color-surface)',
        color: selected ? '#FFFFFF' : 'var(--color-neutral-dark)',
        cursor: 'pointer',
        transition: 'background 0.12s, color 0.12s',
      }}
    >
      {label}
    </button>
  );
}

export default function EmployeeForm({ employee, onSave, onCancel, isLoading }: EmployeeFormProps) {
  const [name, setName] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [days, setDays] = useState<DayOfWeek[]>([]);
  const [shifts, setShifts] = useState<ShiftType[]>(['open']);
  const [isMinor, setIsMinor] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employee) {
      setName(employee.name);
      setRoles([...employee.available_roles]);
      setDays([...employee.available_days]);
      setShifts(employee.default_shift_types.length ? [employee.default_shift_types[0]] : ['open']);
      setIsMinor(employee.is_minor ?? false);
    } else {
      setName('');
      setRoles([]);
      setDays([]);
      setShifts(['open']);
      setIsMinor(false);
    }
    setError(null);
  }, [employee]);

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('이름을 입력하세요.');
      return;
    }
    if (days.length === 0) {
      setError('근무 가능 요일을 1개 이상 선택하세요.');
      return;
    }
    if (shifts.length === 0) {
      setError('기본 근무 타입을 1개 이상 선택하세요.');
      return;
    }

    try {
      await onSave({
        name: name.trim(),
        available_roles: roles,
        available_days: days,
        default_shift_types: shifts,
        is_minor: isMinor,
      });
      if (!employee) {
        setName('');
        setRoles([]);
        setDays([]);
        setShifts([]);
        setIsMinor(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패');
    }
  };

  const fieldLabel: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-primary)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label htmlFor="emp-name" style={fieldLabel}>이름</label>
        <input
          id="emp-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="직원 이름"
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: 14,
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            background: 'var(--color-surface)',
            color: 'var(--color-neutral-dark)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ ...fieldLabel, marginBottom: 0 }}>가능 직무</span>
          <button
            type="button"
            onClick={() => setIsMinor(!isMinor)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 8px',
              borderRadius: 16,
              border: isMinor ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: isMinor ? 'var(--color-primary)' : 'transparent',
              color: isMinor ? '#FFFFFF' : 'var(--color-neutral-dark)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            미성년자 {isMinor ? 'ON' : 'OFF'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ROLE_OPTIONS.map((opt) => (
            <ToggleButton
              key={opt.value}
              value={opt.value}
              label={opt.label}
              selected={roles.includes(opt.value)}
              onToggle={(v) => setRoles(toggle(roles, v))}
            />
          ))}
        </div>
        {isMinor && (
          <p style={{ fontSize: 11, color: 'var(--color-primary)', margin: '6px 0 0', fontWeight: 500 }}>
            * 미성년자는 휴게시간이 2시간 30분(150분)으로 계산됩니다.
          </p>
        )}
      </div>

      <div>
        <span style={fieldLabel}>근무 가능 요일</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {DAY_OPTIONS.map((opt) => (
            <ToggleButton
              key={opt.value}
              value={opt.value}
              label={opt.label}
              selected={days.includes(opt.value)}
              onToggle={(v) => setDays(toggle(days, v))}
            />
          ))}
        </div>
      </div>

      <div>
        <span style={fieldLabel}>근무 타입</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SHIFT_OPTIONS.map((opt) => (
            <ToggleButton
              key={opt.value}
              value={opt.value}
              label={opt.label}
              selected={shifts[0] === opt.value}
              onToggle={(v) => setShifts([v])}
            />
          ))}
        </div>
      </div>

      {error && (
        <p
          style={{
            fontSize: 13,
            color: '#C0392B',
            border: '1px solid #C0392B',
            padding: '8px 12px',
            borderRadius: 4,
          }}
        >
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '9px 0',
            fontSize: 14,
            fontWeight: 600,
            background: 'var(--color-primary)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 4,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? '저장 중...' : employee ? '수정 저장' : '직원 추가'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '9px 16px',
            fontSize: 14,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-neutral-dark)',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          취소
        </button>
      </div>
    </form>
  );
}
