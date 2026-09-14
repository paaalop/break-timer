'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Header from '@/components/layout/Header';
import WeekGrid from '@/components/scheduler/WeekGrid';
import ExportScheduleGrid from '@/components/scheduler/ExportScheduleGrid';
import BreakWarningBanner from '@/components/scheduler/BreakWarningBanner';
import ManualBreakModal from '@/components/scheduler/ManualBreakModal';
import { useScheduleStore } from '@/store/useScheduleStore';
import { useEmployeeStore } from '@/store/useEmployeeStore';
import { shiftWeek, formatWeekRange } from '@/lib/weekUtils';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
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
  const exportRef = useRef<HTMLDivElement>(null);
  const [manualBreakTarget, setManualBreakTarget] = useState<WorkSchedule | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchSchedules(selectedWeekStart);
  }, [selectedWeekStart, fetchSchedules]);

  // 탭 복귀 / 창 포커스 시 조용히 최신 DB 상태로 동기화 (stale data 방지)
  useRefetchOnFocus(
    useCallback(() => {
      fetchSchedules(selectedWeekStart, true);
    }, [selectedWeekStart, fetchSchedules])
  );

  const handlePrevWeek = useCallback(() => {
    setWeekStart(shiftWeek(selectedWeekStart, -1));
  }, [selectedWeekStart, setWeekStart]);

  const handleNextWeek = useCallback(() => {
    setWeekStart(shiftWeek(selectedWeekStart, 1));
  }, [selectedWeekStart, setWeekStart]);

  const handleDownload = useCallback(async () => {
    const targetElement = exportRef.current || captureRef.current;
    if (!targetElement) return;
    try {
      // 폰트 완전 로딩 보장
      if (typeof document !== 'undefined' && document.fonts) {
        await document.fonts.ready;
      }
      // dynamic import (SSR 방지 및 네이티브 SVG 렌더러 기반 캡처)
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(targetElement, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
        skipFonts: true,
        width: targetElement.offsetWidth,
        height: targetElement.offsetHeight,
      });
      const link = document.createElement('a');
      link.download = `schedule_${selectedWeekStart}.png`;
      link.href = dataUrl;
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
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <Header />

      <main className="max-w-[1400px] mx-auto px-0 pt-3 pb-20 sm:px-8 md:px-10 sm:pt-4 sm:pb-24">
        {/* 페이지 헤더 */}
        <div className="px-6 sm:px-4" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, lineHeight: '28px', color: 'var(--color-neutral-dark)', margin: 0 }}>
                주간 근무표
              </h1>

              {/* 이미지 추출 버튼 (제목 우측, 연한 배경 텍스트) */}
              <button
                id="download-schedule-btn"
                onClick={handleDownload}
                title="주간 근무표 이미지 저장"
                style={{
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 6,
                  background: 'var(--color-muted-bg)',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  letterSpacing: '-0.02em',
                }}
                className="hover:bg-[var(--color-muted-bg-hover)] transition-colors"
              >
                이미지 추출
              </button>

              {/* 데스크톱 주 탐색 네비게이터 (md: 이상 표시) */}
              <div className="hidden md:flex items-center gap-1.5 ml-1">
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

            {/* 우측: (데스크톱) 자동채우기 버튼 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* 데스크톱 전용 자동 채우기 버튼 */}
              <button
                id="autofill-schedule-btn"
                className="hidden md:block"
                onClick={() => autoFillWeekSchedules(selectedWeekStart, employees)}
                disabled={!mounted || isLoading || employees.length === 0}
                suppressHydrationWarning
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
            </div>
          </div>
        </div>

        {/* 에러 배너 */}
        {error && (
          <div
            className="mx-4 sm:mx-0"
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
          <div className="mx-4 sm:mx-0" style={{ marginBottom: 16 }}>
            <BreakWarningBanner warnings={breakWarnings} />
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
            emptyState={
              !isLoading && schedules.length === 0 ? (
                <div
                  className="mx-4 sm:mx-0"
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
              ) : null
            }
          />
        )}
      </main>

      {/* 수동 휴게 수정 모달 */}
      {manualBreakTarget && (
        <ManualBreakModal
          schedule={manualBreakTarget}
          onClose={handleCloseModal}
        />
      )}

      {/* ── 이미지 추출 전용 2행 4열 그리드 (화면 바깥 렌더링) ── */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          zIndex: -9999,
          pointerEvents: 'none',
        }}
      >
        <ExportScheduleGrid
          ref={exportRef}
          weekStart={selectedWeekStart}
          schedules={schedules}
          employees={employees}
        />
      </div>
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
