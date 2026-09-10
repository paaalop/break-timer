'use client';

import type { BreakWarning } from '@/types';
import { ROLE_LABELS } from '@/lib/constants';

interface BreakWarningBannerProps {
  warnings: BreakWarning[];
}

export default function BreakWarningBanner({ warnings }: BreakWarningBannerProps) {
  if (warnings.length === 0) return null;

  return (
    <div
      role="alert"
      style={{
        border: '1px solid #C0392B',
        background: '#FDF2F1',
        padding: '12px 16px',
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#C0392B',
          marginBottom: 4,
        }}
      >
        휴게 배치 경고
      </p>
      {warnings.map((w, i) => (
        <p key={i} style={{ fontSize: 13, color: '#8B2B2B' }}>
          {w.time}에 {w.missing.map((r) => ROLE_LABELS[r] ?? r).join(', ')} 포지션 커버 불가
        </p>
      ))}
    </div>
  );
}
