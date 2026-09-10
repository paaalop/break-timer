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

      <main className="max-w-[1400px] mx-auto px-2 py-4 sm:px-6 sm:py-8">
        {/* 페이지 헤더: 모바일/데스크톱 최적화 반응형 레이아웃 */}
        <div style={{ marginBottom: 16 }}>
          {/* 모바일 화면 (< md): 2단 정돈 구조 */}
          {/* 모바일 화면 (< md): 1행 타이틀 + 우측 브라운 액션 버튼 */}
          <div className="flex items-center justify-between md:hidden">
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-neutral-dark)', margin: 0 }}>
              주간 근무표
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                id="autofill-schedule-btn-m"
                onClick={() => autoFillWeekSchedules(selectedWeekStart, employees)}
                disabled={isLoading || employees.length === 0}
                style={{
                  padding: '5px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 4,
                  background: 'var(--color-primary)',
                  color: '#FFFFFF',
                  cursor: employees.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: employees.length === 0 ? 0.5 : 1,
                }}
              >
                자동 채우기
              </button>
              <button
                id="download-schedule-btn-m"
                onClick={handleDownload}
                style={{
                  padding: '5px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 4,
                  background: 'var(--color-primary)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                이미지 저장
              </button>
            </div>
          </div>

          {/* 데스크톱 화면 (md: 이상): 1행 통합 레이아웃 */}
          <div className="hidden md:flex items-center justify-between">
            {/* 좌측: 타이틀 + 주 탐색 네비게이터 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-neutral-dark)', margin: 0 }}>
                주간 근무표
              </h1>

              {/* 주 탐색 네비게이터 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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

            {/* 우측 정렬 기능 버튼들 (브라운 배경) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* 기본 스케줄 자동 채우기 버튼 */}
              <button
                id="autofill-schedule-btn"
                onClick={() => autoFillWeekSchedules(selectedWeekStart, employees)}
                disabled={isLoading || employees.length === 0}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 4,
                  background: 'var(--color-primary)',
                  color: '#FFFFFF',
                  cursor: employees.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: employees.length === 0 ? 0.5 : 1,
                }}
                title="등록된 직원들의 근무 가능 요일과 기본 근무 타입으로 이번 주 스케줄을 자동 배치합니다"
              >
                자동 채우기
              </button>

              {/* 다운로드 버튼 */}
              <button
                id="download-schedule-btn"
                onClick={handleDownload}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 4,
                  background: 'var(--color-primary)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                이미지 저장
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
              borderRadius: 4,
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
              borderRadius: 4,
              padding: '24px 20px',
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
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                borderRadius: 4,
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

        {/* 주간 그리드: 초기 데이터가 없을 때만 전체 로딩 표시, 기존 데이터가 있으면 언마운트하지 않아 스크롤 유지 */}
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
