'use client';

import type { BreakWarning } from '@/types';
import { ROLE_LABELS } from '@/lib/constants';

interface BreakWarningBannerProps {
  warnings: BreakWarning[];
  message?: string;
  compact?: boolean;
}

export default function BreakWarningBanner({ warnings, message, compact = false }: BreakWarningBannerProps) {
  if (warnings.length === 0 && !message) return null;

  if (compact && message) {
    return (
      <div
        role="alert"
        className="ui-alert ui-alert--danger"
        style={{ padding: '4px 8px', fontSize: 11, lineHeight: '16px' }}
      >
        {message}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="ui-alert ui-alert--danger"
      style={{
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--color-danger)',
          marginBottom: 4,
        }}
      >
        휴게 배치 경고
      </p>
      {message && (
        <p style={{ fontSize: 13, color: 'var(--color-danger-strong)' }}>{message}</p>
      )}
      {warnings.map((w, i) => (
        <p key={i} style={{ fontSize: 13, color: 'var(--color-danger-strong)' }}>
          {w.time}에 {w.missing.map((r) => ROLE_LABELS[r] ?? r).join(', ')} 포지션 커버 불가
        </p>
      ))}
    </div>
  );
}
