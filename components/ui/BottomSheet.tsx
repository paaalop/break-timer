'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBottomSheet } from '@/hooks/useBottomSheet';

interface BottomSheetProps {
  onClose: () => void;
  children: React.ReactNode;
  /** 최대 너비 (기본: 480) */
  maxWidth?: number;
  /** 최대 높이 (기본: '92vh') */
  maxHeight?: string;
  /** 스와이프 다운 닫힘 임계값 px (기본: 130) */
  swipeThreshold?: number;
  /** 시트 내부 패딩 (기본: '10px 20px 36px') */
  padding?: string;
  /** history state key — 여러 시트가 동시에 열릴 때 충돌 방지용 */
  historyKey?: string;
  /** 시트 내부 flex gap (기본: undefined, 시트가 직접 레이아웃 관리) */
  gap?: number;
  /** 스와이프 다운 닫기 비활성화 (내부 휠/스크롤 요소 충돌 방지) */
  disableSwipe?: boolean;
  /** z-index (기본: 300) */
  zIndex?: number;
}

/**
 * 공통 바텀시트 컴포넌트.
 * - 백드롭 딤 처리 (dragY에 따라 투명도 자연스럽게 감소)
 * - 스와이프 다운 닫기
 * - 스크롤 잠금
 * - 뒤로가기로 닫기
 * - 드래그 핸들 포함
 *
 * children으로 시트별 고유 콘텐츠만 전달하면 됩니다.
 */
export default function BottomSheet({
  onClose,
  children,
  maxWidth = 480,
  maxHeight = '92vh',
  swipeThreshold = 130,
  padding = '10px 20px 36px',
  historyKey = 'bottomSheet',
  gap,
  disableSwipe = false,
  zIndex = 300,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { dragY, dragging, touchHandlers } = useBottomSheet(onClose, {
    swipeThreshold,
    historyKey,
  });

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: `rgba(0,0,0,${Math.max(0, 0.4 - dragY / 600)})`,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth,
          maxHeight,
          overflowY: dragging ? 'hidden' : 'auto',
          background: 'var(--color-surface)',
          borderRadius: '18px 18px 0 0',
          padding,
          display: 'flex',
          flexDirection: 'column',
          ...(gap !== undefined ? { gap } : {}),
          boxSizing: 'border-box',
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
        }}
        onClick={(e) => e.stopPropagation()}
        {...(disableSwipe ? {} : touchHandlers)}
      >
        {/* 드래그 핸들 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 2,
            paddingBottom: 2,
            cursor: 'grab',
            flexShrink: 0,
          }}
          {...(disableSwipe ? touchHandlers : {})}
        >
          <div
            style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-border)' }}
          />
        </div>

        {children}
      </div>
    </div>,
    document.body
  );
}
