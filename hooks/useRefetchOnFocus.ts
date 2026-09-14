'use client';

import { useEffect, useRef } from 'react';

/**
 * 브라우저 탭 활성화(visibilitychange) 또는 창 포커스(focus) 시
 * stale 데이터를 방지하기 위해 최신화 콜백을 실행하는 훅 (연속 호출 방지 쓰로틀링 포함)
 */
export function useRefetchOnFocus(onRefetch: () => void, throttleMs: number = 3000) {
  const lastRefetchTimeRef = useRef<number>(0);
  const callbackRef = useRef(onRefetch);

  useEffect(() => {
    callbackRef.current = onRefetch;
  }, [onRefetch]);

  useEffect(() => {
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastRefetchTimeRef.current < throttleMs) return;
      lastRefetchTimeRef.current = now;
      callbackRef.current();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [throttleMs]);
}
