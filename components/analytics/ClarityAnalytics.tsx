'use client';

import { useEffect } from 'react';
import Clarity from '@microsoft/clarity';

// 💡 실제 발급받으신 Clarity 프로젝트 ID를 여기에 입력하세요.
const CLARITY_PROJECT_ID = 'yi7hnrbui6';

export default function ClarityAnalytics() {
  useEffect(() => {
    // 1. 브라우저 환경이고
    // 2. ID가 비어있지 않거나 기본값이 아니며
    // 3. (선택사항) 배포(production) 환경일 때만 실행
    if (
      typeof window !== 'undefined' &&
      CLARITY_PROJECT_ID &&
      process.env.NODE_ENV === 'production'
    ) {
      Clarity.init(CLARITY_PROJECT_ID);
    }
  }, []);

  return null;
}
