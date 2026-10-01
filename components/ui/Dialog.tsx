'use client';

import type { CSSProperties, ReactNode } from 'react';
import Overlay from './Overlay';

export interface DialogProps {
  open?: boolean;
  onClose: () => void;
  titleId?: string;
  children: ReactNode;
  maxWidth?: number | string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  style?: CSSProperties;
  zIndex?: number;
}

export default function Dialog({
  open = true,
  onClose,
  titleId,
  children,
  maxWidth = 440,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
  style,
  zIndex,
}: DialogProps) {
  return (
    <Overlay
      open={open}
      onClose={onClose}
      titleId={titleId}
      variant="dialog"
      closeOnBackdrop={closeOnBackdrop}
      closeOnEscape={closeOnEscape}
      className={className}
      style={{ maxWidth, ...style }}
      zIndex={zIndex}
    >
      {children}
    </Overlay>
  );
}

