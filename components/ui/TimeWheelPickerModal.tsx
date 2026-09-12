'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface TimeWheelPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string; // 'HH:mm', 예: '13:30'
  onConfirm: (time: string) => void;
  title?: string;
  minTime?: string; // 기본값: '10:30'
  maxTime?: string; // 기본값: '21:30'
  zIndex?: number; // 기본값: 500
}

const ITEM_HEIGHT = 44; // 각 항목 높이 (px)
const VISIBLE_COUNT = 5; // 화면에 보이는 항목 수
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT; // 220px
const PADDING_Y = (PICKER_HEIGHT - ITEM_HEIGHT) / 2; // 88px (중앙 정렬용 상하 패딩)

export default function TimeWheelPickerModal({
  isOpen,
  onClose,
  value,
  onConfirm,
  title = '시간을 선택해주세요',
  minTime = '10:30',
  maxTime = '21:30',
  zIndex = 500,
}: TimeWheelPickerModalProps) {
  const [mounted, setMounted] = useState(false);

  const [minH, minM] = useMemo(() => minTime.split(':').map(Number), [minTime]);
  const [maxH, maxM] = useMemo(() => maxTime.split(':').map(Number), [maxTime]);

  // 시(Hour) 목록: minH ~ maxH (예: 10 ~ 21)
  const hours = useMemo(
    () =>
      Array.from({ length: maxH - minH + 1 }, (_, i) =>
        String(minH + i).padStart(2, '0')
      ),
    [minH, maxH]
  );

  // 분(Minute) 목록: 30분 단위 ('00', '30')
  const minutes = useMemo(() => ['00', '30'], []);

  const [selectedHour, setSelectedHour] = useState<string>('14');
  const [selectedMin, setSelectedMin] = useState<string>('00');

  const selectedHourRef = useRef<string>('14');
  const selectedMinRef = useRef<string>('00');
  selectedHourRef.current = selectedHour;
  selectedMinRef.current = selectedMin;

  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 모달이 열릴 때만 초기 위치로 스크롤 동기화 (휠 조작 중 재실행 방지)
  useEffect(() => {
    if (!isOpen) return;

    let initH = (value || '14:00').split(':')[0] || '14';
    let initM = (value || '14:00').split(':')[1] || '00';
    if (!['00', '30'].includes(initM)) {
      initM = Number(initM) >= 15 && Number(initM) < 45 ? '30' : '00';
    }

    const numH = Number(initH);
    const numM = Number(initM);

    if (numH < minH || (numH === minH && numM < minM)) {
      initH = String(minH).padStart(2, '0');
      initM = String(minM).padStart(2, '0');
    } else if (numH > maxH || (numH === maxH && numM > maxM)) {
      initH = String(maxH).padStart(2, '0');
      initM = String(maxM).padStart(2, '0');
    }

    selectedHourRef.current = initH;
    selectedMinRef.current = initM;
    setSelectedHour(initH);
    setSelectedMin(initM);

    const timer = setTimeout(() => {
      const hIndex = hours.indexOf(initH);
      if (hIndex !== -1 && hourScrollRef.current) {
        hourScrollRef.current.scrollTop = hIndex * ITEM_HEIGHT;
      }
      const mIndex = minutes.indexOf(initM);
      if (mIndex !== -1 && minScrollRef.current) {
        minScrollRef.current.scrollTop = mIndex * ITEM_HEIGHT;
      }
    }, 50);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 시(Hour) 스크롤 핸들러
  const handleHourScroll = useCallback(() => {
    if (!hourScrollRef.current) return;
    const top = hourScrollRef.current.scrollTop;
    const index = Math.round(top / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(hours.length - 1, index));
    const newHour = hours[clampedIndex];

    if (newHour && newHour !== selectedHourRef.current) {
      selectedHourRef.current = newHour;
      setSelectedHour(newHour);
      // 10시인 경우 00분 미허용 -> 30분으로 자동 조정
      if (newHour === String(minH).padStart(2, '0') && minM === 30 && selectedMinRef.current === '00') {
        selectedMinRef.current = '30';
        setSelectedMin('30');
        if (minScrollRef.current) {
          minScrollRef.current.scrollTo({ top: 1 * ITEM_HEIGHT, behavior: 'smooth' });
        }
      }
    }
  }, [hours, minH, minM]);

  // 분(Minute) 스크롤 핸들러
  const handleMinScroll = useCallback(() => {
    if (!minScrollRef.current) return;
    const top = minScrollRef.current.scrollTop;
    const index = Math.round(top / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(minutes.length - 1, index));
    let newMin = minutes[clampedIndex];

    // 10시인 경우 00분 미허용 -> 30분으로 보정
    if (selectedHourRef.current === String(minH).padStart(2, '0') && minM === 30 && newMin === '00') {
      newMin = '30';
      if (minScrollRef.current) {
        minScrollRef.current.scrollTo({ top: 1 * ITEM_HEIGHT, behavior: 'smooth' });
      }
    }

    if (newMin && newMin !== selectedMinRef.current) {
      selectedMinRef.current = newMin;
      setSelectedMin(newMin);
    }
  }, [minutes, minH, minM]);

  const handleConfirm = () => {
    onConfirm(`${selectedHourRef.current}:${selectedMinRef.current}`);
    onClose();
  };

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.45)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--color-surface, #FFFFFF)',
          borderRadius: '18px 18px 0 0',
          padding: '12px 20px 32px',
          boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.18)',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 드래그 핸들 바 */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 12px' }}>
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: 'var(--color-border, #E5E0D8)',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 헤더: 타이틀 + 시계 아이콘 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 2,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--color-neutral-dark)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </h2>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#F5F0EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary, #4A3B32)',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>

          {/* 휠 다이얼 영역 */}
          <div
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              height: PICKER_HEIGHT,
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            {/* 중앙 하이라이트 선택 바 (가로 둥근 사각형) */}
            <div
              style={{
                position: 'absolute',
                top: PADDING_Y,
                left: 16,
                right: 16,
                height: ITEM_HEIGHT,
                background: '#F1F5F9',
                borderRadius: 10,
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />

            {/* 상하단 페이드아웃 그라데이션 오버레이 (3D 원통형 효과) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(to bottom, #FFFFFF 0%, rgba(255,255,255,0.7) 15%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.7) 85%, #FFFFFF 100%)',
                pointerEvents: 'none',
                zIndex: 3,
              }}
            />

            {/* 휠 컬럼 컨테이너 (시 + 분) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                maxWidth: 240,
                height: '100%',
                zIndex: 2,
              }}
            >
              {/* 1. 시(Hour) 휠 */}
              <div
                ref={hourScrollRef}
                onScroll={handleHourScroll}
                style={{
                  flex: 1,
                  height: '100%',
                  overflowY: 'auto',
                  scrollSnapType: 'y mandatory',
                  paddingTop: PADDING_Y,
                  paddingBottom: PADDING_Y,
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {hours.map((h) => {
                  const isSelected = h === selectedHour;
                  return (
                    <div
                      key={h}
                      onClick={() => {
                        selectedHourRef.current = h;
                        setSelectedHour(h);
                        const idx = hours.indexOf(h);
                        if (hourScrollRef.current) {
                          hourScrollRef.current.scrollTo({
                            top: idx * ITEM_HEIGHT,
                            behavior: 'smooth',
                          });
                        }
                      }}
                      style={{
                        height: ITEM_HEIGHT,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        scrollSnapAlign: 'center',
                        fontSize: isSelected ? 22 : 17,
                        fontWeight: isSelected ? 700 : 400,
                        color: isSelected ? '#0F172A' : '#94A3B8',
                        cursor: 'pointer',
                        transition: 'all 0.1s ease',
                        userSelect: 'none',
                      }}
                    >
                      {h}
                    </div>
                  );
                })}
              </div>

              {/* 시 : 분 구분 콜론 */}
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#64748B',
                  padding: '0 8px',
                  userSelect: 'none',
                  zIndex: 2,
                }}
              >
                :
              </div>

              {/* 2. 분(Minute) 휠 */}
              <div
                ref={minScrollRef}
                onScroll={handleMinScroll}
                style={{
                  flex: 1,
                  height: '100%',
                  overflowY: 'auto',
                  scrollSnapType: 'y mandatory',
                  paddingTop: PADDING_Y,
                  paddingBottom: PADDING_Y,
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {minutes.map((m) => {
                  const isSelected = m === selectedMin;
                  const isDisabled =
                    selectedHour === String(minH).padStart(2, '0') && minM === 30 && m === '00';

                  return (
                    <div
                      key={m}
                      onClick={() => {
                        if (isDisabled) return;
                        selectedMinRef.current = m;
                        setSelectedMin(m);
                        const idx = minutes.indexOf(m);
                        if (minScrollRef.current) {
                          minScrollRef.current.scrollTo({
                            top: idx * ITEM_HEIGHT,
                            behavior: 'smooth',
                          });
                        }
                      }}
                      style={{
                        height: ITEM_HEIGHT,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        scrollSnapAlign: 'center',
                        fontSize: isSelected ? 22 : 17,
                        fontWeight: isSelected ? 700 : 400,
                        color: isDisabled ? '#E2E8F0' : isSelected ? '#0F172A' : '#94A3B8',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        transition: 'all 0.1s ease',
                        userSelect: 'none',
                      }}
                    >
                      {m}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 하단 확인 버튼 (브라운 컬러) */}
          <button
            onClick={handleConfirm}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 12,
              background: 'var(--color-primary, #4A3B32)',
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(74, 59, 50, 0.25)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#382C25';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary, #4A3B32)';
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
