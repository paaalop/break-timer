'use client';

import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

const overlayStack: string[] = [];
let scrollLockCount = 0;
let previousBodyOverflow = '';

const subscribeToClient = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function isTopOverlay(id: string) {
  return overlayStack.at(-1) === id;
}

function lockBodyScroll() {
  if (scrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLockCount += 1;
}

function unlockBodyScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
  }
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface OverlayProps {
  open?: boolean;
  onClose: () => void;
  titleId?: string;
  children: ReactNode;
  variant: 'dialog' | 'sheet';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  style?: CSSProperties;
  backdropStyle?: CSSProperties;
  zIndex?: number;
}

export default function Overlay({
  open = true,
  onClose,
  titleId,
  children,
  variant,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
  style,
  backdropStyle,
  zIndex = 300,
}: OverlayProps) {
  const generatedId = useId();
  const overlayId = `overlay-${generatedId}`;
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const historyCleanupTimerRef = useRef<number | null>(null);
  const isClient = useSyncExternalStore(subscribeToClient, getClientSnapshot, getServerSnapshot);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    if (historyCleanupTimerRef.current !== null) {
      window.clearTimeout(historyCleanupTimerRef.current);
      historyCleanupTimerRef.current = null;
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousHistoryState = window.history.state;

    overlayStack.push(overlayId);
    lockBodyScroll();
    if (previousHistoryState?.__overlayId !== overlayId) {
      window.history.pushState({ ...previousHistoryState, __overlayId: overlayId }, '');
    }

    const focusTimer = window.setTimeout(() => {
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (firstFocusable ?? panelRef.current)?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopOverlay(overlayId)) return;

      if (event.key === 'Escape' && closeOnEscape && !event.isComposing) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const handlePopState = (event: PopStateEvent) => {
      if (isTopOverlay(overlayId) && event.state?.__overlayId !== overlayId) {
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);

      const index = overlayStack.lastIndexOf(overlayId);
      if (index >= 0) overlayStack.splice(index, 1);
      unlockBodyScroll();

      // React Strict Mode and Fast Refresh replay effects. Deferring history
      // cleanup lets the next setup cancel it instead of popping the newly
      // opened overlay's entry and immediately closing the sheet.
      historyCleanupTimerRef.current = window.setTimeout(() => {
        historyCleanupTimerRef.current = null;
        if (window.history.state?.__overlayId === overlayId) {
          window.history.back();
        }
      }, 0);
      previouslyFocused?.focus();
    };
  }, [closeOnEscape, open, overlayId]);

  if (!open || !isClient || typeof document === 'undefined') return null;

  const backdropClass = variant === 'sheet' ? 'ui-backdrop ui-backdrop--sheet' : 'ui-backdrop';
  const panelClass = variant === 'sheet' ? 'ui-bottom-sheet' : 'ui-dialog';

  return createPortal(
    <div
      className={backdropClass}
      style={{ ...backdropStyle, zIndex }}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget && isTopOverlay(overlayId)) {
          onClose();
        }
      }}
      data-overlay-variant={variant}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[panelClass, className].filter(Boolean).join(' ')}
        style={style}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
