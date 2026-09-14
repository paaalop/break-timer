'use client';

import { useEffect } from 'react';

interface AutoBreakRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AutoBreakRuleModal({ isOpen, onClose }: AutoBreakRuleModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 500,
          maxHeight: '60vh',
          background: 'var(--color-surface)',
          borderRadius: 14,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--color-border)',
          letterSpacing: '-0.02em',
          overflow: 'hidden',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div
          style={{
            padding: '20px 24px 8px',
            flexShrink: 0,
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-neutral-dark)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
            자동 배치 규칙
          </h2>
        </div>

        {/* 규칙 본문 리스트 (원래 스타일 그대로 유지 + 스크롤) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 24px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
            textAlign: 'left',
          }}
        >
          {/* 1. 조 분할 75% */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-neutral-dark)', margin: 0, letterSpacing: '-0.02em' }}>
              1. 근무조별 75% 분할
            </h3>
            <p style={{ fontSize: 15, fontWeight: 400, color: '#334155', margin: '8px 0 0', lineHeight: 1.55, letterSpacing: '-0.02em' }}>
              특정 근무조 전체가 자리를 비울 수 없도록,<br />최대 75%의 인원만 동시 휴게가 허용됩니다.
            </p>
            <p style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-neutral-dark)', margin: '10px 0 0', lineHeight: 1.5, letterSpacing: '-0.02em' }}>
              💡 오픈조가 앞시간을 독점하지 않아, 마감 매니저가 일찍 식사할 수 있습니다.
            </p>
          </div>

          {/* 2. 필수 직무 상시 상주 */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-neutral-dark)', margin: 0, letterSpacing: '-0.02em' }}>
              2. 필수 직무 상시 상주
            </h3>
            <p style={{ fontSize: 15, fontWeight: 400, color: '#334155', margin: '8px 0 0', lineHeight: 1.55, letterSpacing: '-0.02em' }}>
              근무 중인 직원 중 매니저, 캐셔, 패스 직무가<br />각각 1명 이상 존재해야 합니다.
            </p>
          </div>

          {/* 3. 최소 인원 보장 & 근무타입별 휴게시간 */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-neutral-dark)', margin: 0, letterSpacing: '-0.02em' }}>
              3. 최소 인원 보장 & 근무타입별 휴게시간
            </h3>
            <p style={{ fontSize: 15, fontWeight: 400, color: '#334155', margin: '8px 0 0', lineHeight: 1.55, letterSpacing: '-0.02em' }}>
              • 설정된 최소 근무 인원 이상 항상 근무
            </p>
            <p style={{ fontSize: 15, fontWeight: 400, color: '#334155', margin: '8px 0 0', lineHeight: 1.55, letterSpacing: '-0.02em' }}>
              • 오픈/마감/오마: 연속 90분 휴게
            </p>
            <p style={{ fontSize: 15, fontWeight: 400, color: '#334155', margin: '8px 0 0', lineHeight: 1.55, letterSpacing: '-0.02em' }}>
              • 파트(4시간 이상): 30분 휴게
            </p>
            <p style={{ fontSize: 15, fontWeight: 400, color: '#334155', margin: '8px 0 0', lineHeight: 1.55, letterSpacing: '-0.02em' }}>
              • 미성년자: 연속 150분(2시간 30분) 휴게
            </p>
          </div>

          {/* 4. 전진 배치 & 매니저 우선 탐색 */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-neutral-dark)', margin: 0, letterSpacing: '-0.02em' }}>
              4. 전진 배치 & 매니저 직무 우선 탐색
            </h3>
            <div style={{ fontSize: 15, fontWeight: 400, color: '#334155', margin: '8px 0 0', lineHeight: 1.55, letterSpacing: '-0.02em', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ margin: 0 }}>
                • 가장 이른 시간의 슬롯부터 채워나갑니다.
              </p>
              <p style={{ margin: 0 }}>
                • 근무조 내에서 매니저가 먼저 슬롯을 선점하여 근무조 간의 교대를 원활하게 합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 닫기 버튼 */}
        <div style={{ padding: '8px 24px 20px', flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '10px 0',
              fontSize: 13,
              fontWeight: 700,
              background: 'var(--color-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
