'use client';

import type { CSSProperties, ReactNode } from 'react';
import Overlay from './Overlay';

export interface BottomSheetProps {
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number | string;
  maxHeight?: string;
  padding?: string;
  gap?: number;
  titleId?: string;
  zIndex?: number;
  className?: string;
  style?: CSSProperties;
}

export default function BottomSheet({
  onClose,
  children,
  maxWidth = 480,
  maxHeight = '92vh',
  padding = 'var(--space-3) var(--space-5) var(--space-9)',
  gap,
  titleId,
  zIndex = 300,
  className,
  style,
}: BottomSheetProps) {
  return (
    <Overlay
      onClose={onClose}
      titleId={titleId}
      variant="sheet"
      className={className}
      style={{ maxWidth, maxHeight, padding, gap, ...style }}
      zIndex={zIndex}
    >
      {children}
    </Overlay>
  );
}
