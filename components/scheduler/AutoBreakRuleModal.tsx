'use client';

import { useId } from 'react';
import Dialog from '@/components/ui/Dialog';

interface AutoBreakRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
}
const RULES = [
  {
    title: '1. 근무조별 75% 분할',
    body: <>특정 근무조 전체가 자리를 비울 수 없도록,<br />최대 75%의 인원만 동시 휴게가 허용됩니다.</>,
    note: '오픈조가 앞시간을 독점하지 않아, 마감 매니저가 일찍 식사할 수 있습니다.',
  },
  {
    title: '2. 필수 직무 상시 상주',
    body: <>근무 중인 직원 중 매니저, 캐셔, 패스 직무가<br />각각 1명 이상 존재해야 합니다.</>,
  },
  {
    title: '3. 최소 인원 보장 & 근무타입별 휴게시간',
    body: (
      <>
        <span>• 설정된 최소 근무 인원 이상 항상 근무</span>
        <span>• 오픈/마감/오마: 연속 90분 휴게</span>
        <span>• 파트(4시간 이상): 30분 휴게</span>
        <span>• 미성년자: 연속 150분(2시간 30분) 휴게</span>
      </>
    ),
  },
  {
    title: '4. 전진 배치 & 매니저 직무 우선 탐색',
    body: (
      <>
        <span>• 가장 이른 시간의 슬롯부터 채워나갑니다.</span>
        <span>• 근무조 내에서 매니저가 먼저 슬롯을 선점하여 근무조 간의 교대를 원활하게 합니다.</span>
      </>
    ),
  },
] as const;

export default function AutoBreakRuleModal({ isOpen, onClose }: AutoBreakRuleModalProps) {
  const titleId = useId();

  return (
    <Dialog open={isOpen} onClose={onClose} titleId={titleId} maxWidth={500} zIndex={500}>
      <div style={{ padding: 'var(--space-5) var(--space-6) var(--space-2)' }}>
        <h2 id={titleId} className="ui-overlay-title">자동 배치 규칙</h2>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-2) var(--space-6) var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-7)',
        }}
      >
        {RULES.map((rule) => (
          <section key={rule.title}>
            <h3 className="ui-section-title">{rule.title}</h3>
            <div
              className="ui-body"
              style={{
                color: 'var(--color-text-subtle)',
                marginTop: 'var(--space-2)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-1)',
              }}
            >
              {rule.body}
            </div>
            {'note' in rule && rule.note ? (
              <p className="ui-caption" style={{ marginTop: 'var(--space-2)' }}>{rule.note}</p>
            ) : null}
          </section>
        ))}
      </div>
      <div style={{ padding: 'var(--space-2) var(--space-6) var(--space-5)' }}>
        <button type="button" className="ui-button ui-button--primary" style={{ width: '100%' }} onClick={onClose}>
          닫기
        </button>
      </div>
    </Dialog>
  );
}
