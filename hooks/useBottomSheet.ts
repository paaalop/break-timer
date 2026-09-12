'use client';

import { useRef, useState, useEffect } from 'react';

interface UseBottomSheetOptions {
  /** 스와이프 다운으로 닫히는 픽셀 임계값 (기본: 130) */
  swipeThreshold?: number;
  /** history state key (각 시트마다 고유해야 함) */
  historyKey?: string;
}

interface UseBottomSheetReturn {
  dragY: number;
  dragging: boolean;
  touchHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

/**
 * 바텀시트 공통 로직:
 * - 스크롤 잠금 (document.body.style.overflow = 'hidden')
 * - 뒤로가기로 닫기 (history.pushState + popstate)
 * - 스와이프 다운으로 닫기 (touch drag)
 */
export function useBottomSheet(
  onClose: () => void,
  { swipeThreshold = 130, historyKey = 'bottomSheet' }: UseBottomSheetOptions = {}
): UseBottomSheetReturn {
  const dragStartY = useRef(0);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  // 스크롤 잠금 + 뒤로가기로 닫기
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const stateId = Date.now();
    window.history.pushState({ [historyKey]: stateId }, '');

    let active = false;
    const tid = setTimeout(() => { active = true; }, 150);

    const handlePop = (e: PopStateEvent) => {
      if (active && (!e.state || e.state[historyKey] !== stateId)) {
        onClose();
      }
    };
    window.addEventListener('popstate', handlePop);

    return () => {
      clearTimeout(tid);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('popstate', handlePop);
      if (window.history.state?.[historyKey] === stateId) {
        window.history.back();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    setDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) setDragY(delta);
  };

  const handleTouchEnd = () => {
    setDragging(false);
    if (dragY > swipeThreshold) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  return {
    dragY,
    dragging,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
