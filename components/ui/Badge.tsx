import React from 'react';

export default function Badge({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 4px',
        fontSize: 11,
        lineHeight: 1.2,
        border: '1px solid var(--color-border)',
        borderRadius: 2,
        background: 'var(--color-bg)',
        color: 'var(--color-neutral-dark)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
