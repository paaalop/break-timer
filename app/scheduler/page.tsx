'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Header from '@/components/layout/Header';
import WeekGrid from '@/components/scheduler/WeekGrid';
import BreakWarningBanner from '@/components/scheduler/BreakWarningBanner';
import ManualBreakModal from '@/components/scheduler/ManualBreakModal';
import { useScheduleStore } from '@/store/useScheduleStore';
import { useEmployeeStore } from '@/store/useEmployeeStore';
import { shiftWeek, formatWeekRange } from '@/lib/weekUtils';
import type { WorkSchedule } from '@/types';

export default function SchedulerPage() {
  const {
    selectedWeekStart,
    schedules,
    breakWarnings,
    isLoading,
    error,
    setWeekStart,
    fetchSchedules,
    autoFillWeekSchedules,
  } = useScheduleStore();
  const { employees, fetchEmployees } = useEmployeeStore();
  const captureRef = useRef<HTMLDivElement>(null);
  const [manualBreakTarget, setManualBreakTarget] = useState<WorkSchedule | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchSchedules(selectedWeekStart);
  }, [selectedWeekStart, fetchSchedules]);

  const handlePrevWeek = useCallback(() => {
    setWeekStart(shiftWeek(selectedWeekStart, -1));
  }, [selectedWeekStart, setWeekStart]);

  const handleNextWeek = useCallback(() => {
    setWeekStart(shiftWeek(selectedWeekStart, 1));
  }, [selectedWeekStart, setWeekStart]);

  const handleDownload = useCallback(async () => {
    if (!captureRef.current) return;
    try {
      // dynamic import (SSR 방지)
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: '#F9F8F6',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `schedule_${selectedWeekStart}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('이미지 다운로드 실패:', err);
    }
  }, [selectedWeekStart]);

  const handleBreakClick = useCallback((schedule: WorkSchedule) => {
    setManualBreakTarget(schedule);
  }, []);

  const handleCloseModal = useCallback(() => {
    setManualBreakTarget(null);
    // 모달 닫힌 후 스케줄 silent 재로드 (스크롤 유지)
    fetchSchedules(selectedWeekStart, true);
  }, [selectedWeekStart, fetchSchedules]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header />

      <main className="max-w-[1400px] mx-auto px-3 pt-3 pb-28 sm:px-8 md:px-10 sm:pt-4 sm:pb-24">
        {/* 페이지 헤더 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 }}>
            <div className="pl-2 sm:pl-0" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-neutral-dark)', margin: 0 }}>
                주간 근무표
              </h1>

              {/* 데스크톱 주 탐색 네비게이터 (md: 이상 표시) */}
              <div className="hidden md:flex items-center gap-1.5">
                <button
                  id="prev-week-btn"
                  onClick={handlePrevWeek}
                  style={navButtonStyle}
                  aria-label="이전 주"
                >
                  &lt; 이전주
                </button>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-neutral-dark)',
                    minWidth: 120,
                    textAlign: 'center',
                  }}
                >
                  {formatWeekRange(selectedWeekStart)}
                </span>
                <button
                  id="next-week-btn"
                  onClick={handleNextWeek}
                  style={navButtonStyle}
                  aria-label="다음 주"
                >
                  다음주 &gt;
                </button>
              </div>
            </div>

            {/* 우측: 이미지 저장 아이콘 버튼 + (데스크톱) 자동채우기 버튼 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* 데스크톱 전용 자동 채우기 버튼 */}
              <button
                id="autofill-schedule-btn"
                className="hidden md:block"
                onClick={() => autoFillWeekSchedules(selectedWeekStart, employees)}
                disabled={isLoading || employees.length === 0}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 6,
                  background: 'var(--color-primary)',
                  color: '#FFFFFF',
                  cursor: employees.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: employees.length === 0 ? 0.5 : 1,
                }}
                title="등록된 직원들의 근무 가능 요일과 기본 근무 타입으로 이번 주 스케줄을 자동 배치합니다"
              >
                자동 채우기
              </button>

              {/* 이미지 저장 아이콘 버튼 (공통) */}
              <button
                id="download-schedule-btn"
                onClick={handleDownload}
                title="이미지 저장"
                style={{
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  background: 'var(--color-surface)',
                  color: 'var(--color-neutral-dark)',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
                aria-label="이미지 저장"
              >
                📷
              </button>
            </div>
          </div>
        </div>

        {/* 에러 배너 */}
        {error && (
          <div
            style={{
              border: '1px solid #C0392B',
              background: '#FDF2F1',
              padding: '10px 16px',
              borderRadius: 8,
              fontSize: 13,
              color: '#C0392B',
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* 경고 배너 */}
        {breakWarnings.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <BreakWarningBanner warnings={breakWarnings} />
          </div>
        )}

        {/* 비어있는 주차 안내 카드 (Empty State) */}
        {!isLoading && schedules.length === 0 && (
          <div
            style={{
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              borderRadius: 12,
              padding: '28px 20px',
              marginBottom: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-neutral-dark)' }}>
              이번 주 등록된 스케줄이 없습니다
            </div>
            <div style={{ fontSize: 13, color: '#777', maxWidth: 480, lineHeight: 1.5 }}>
              등록된 직원 정보를 기반으로<br />이번 주 스케줄을 한 번에 채울 수 있습니다.
            </div>
            <button
              id="empty-autofill-btn"
              onClick={() => autoFillWeekSchedules(selectedWeekStart, employees)}
              disabled={isLoading || employees.length === 0}
              style={{
                marginTop: 6,
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                borderRadius: 8,
                background: 'var(--color-primary)',
                color: '#FFFFFF',
                cursor: employees.length === 0 ? 'not-allowed' : 'pointer',
                opacity: employees.length === 0 ? 0.5 : 1,
              }}
            >
              기본 근무표 한 번에 채우기
            </button>
          </div>
        )}

        {/* 주간 그리드 */}
        {isLoading && schedules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, fontSize: 14, color: '#999' }}>
            불러오는 중...
          </div>
        ) : (
          <WeekGrid
            ref={captureRef}
            weekStart={selectedWeekStart}
            schedules={schedules}
            employees={employees.filter((e) => !e.is_deleted)}
            onBreakClick={handleBreakClick}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
          />
        )}
      </main>

      {/* ── 모바일 하단 고정: 자동 채우기 버튼 ─────────────────────────────── */}
      <div
        className="block md:hidden"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          background: 'var(--color-bg)',
          borderTop: '1px solid var(--color-border)',
          zIndex: 100,
        }}
      >
        <button
          id="autofill-schedule-btn-mobile"
          onClick={() => autoFillWeekSchedules(selectedWeekStart, employees)}
          disabled={isLoading || employees.length === 0}
          style={{
            width: '100%',
            padding: '14px 0',
            fontSize: 14,
            fontWeight: 700,
            border: 'none',
            borderRadius: 10,
            background: employees.length === 0 ? '#C8C4BE' : 'var(--color-primary)',
            color: '#FFFFFF',
            cursor: employees.length === 0 ? 'not-allowed' : 'pointer',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
          title="등록된 직원들의 근무 가능 요일과 기본 근무 타입으로 이번 주 스케줄을 자동 배치합니다"
        >
          <span style={{ fontSize: 16 }}>⚡</span>
          자동 채우기
        </button>
      </div>

      {/* 수동 휴게 수정 모달 */}
      {manualBreakTarget && (
        <ManualBreakModal
          schedule={manualBreakTarget}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

const navButtonStyle: React.CSSProperties = {
  padding: '5px 10px',
  fontSize: 12,
  fontWeight: 500,
  border: '1px solid var(--color-border)',
  borderRadius: 4,
  background: 'var(--color-surface)',
  color: 'var(--color-neutral-dark)',
  cursor: 'pointer',
};
