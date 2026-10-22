import { describe, expect, it } from 'vitest';
import { getShiftDisplay, normalizeCustomLabel, SHIFT_TEXT_COLOR, CUSTOM_LABEL_MAX_LENGTH } from '@/lib/constants';

describe('getShiftDisplay', () => {
  it('라벨이 없으면 타입 기본 라벨과 색을 쓴다', () => {
    expect(getShiftDisplay('close', null)).toEqual({ label: '마감', color: SHIFT_TEXT_COLOR.close });
    expect(getShiftDisplay('close', '  ')).toEqual({ label: '마감', color: SHIFT_TEXT_COLOR.close });
  });

  it('템플릿 라벨과 일치하면 해당 타입 색을 쓴다', () => {
    expect(getShiftDisplay('part', '오픈')).toEqual({ label: '오픈', color: SHIFT_TEXT_COLOR.open });
  });

  it('일치하지 않으면 중립색을 쓴다', () => {
    expect(getShiftDisplay('close', '월차')).toEqual({ label: '월차', color: 'var(--color-text-muted)' });
  });
});

describe('normalizeCustomLabel', () => {
  it('템플릿 라벨이면 타입으로 전환하고 라벨을 비운다', () => {
    expect(normalizeCustomLabel(' 마감 ', 'part')).toEqual({ shift_type: 'close', custom_label: null });
  });

  it('그 외 텍스트는 기존 타입을 유지한다', () => {
    expect(normalizeCustomLabel('월차', 'open')).toEqual({ shift_type: 'open', custom_label: '월차' });
  });

  it('고정 파트는 일반 파트로 취급한다', () => {
    expect(normalizeCustomLabel('월차', 'part_open')).toEqual({ shift_type: 'part', custom_label: '월차' });
  });

  it('길이를 제한한다', () => {
    expect(normalizeCustomLabel('가'.repeat(20), 'open').custom_label).toHaveLength(CUSTOM_LABEL_MAX_LENGTH);
  });
});

