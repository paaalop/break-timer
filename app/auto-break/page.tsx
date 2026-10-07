'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Header from '@/components/layout/Header';
import SlotBreakModal from '@/components/scheduler/SlotBreakModal';
import TimeWheelPickerModal from '@/components/ui/TimeWheelPickerModal';
import { useScheduleStore } from '@/store/useScheduleStore';
import { useEmployeeStore } from '@/store/useEmployeeStore';
import { getBreakTimeTable } from '@/lib/breakValidation';
import { toMinutes, toTimeStr } from '@/lib/autoBreakAlgo';
import { formatDateToYYYYMMDD, parseDate } from '@/lib/weekUtils';
import { ROLE_LABELS } from '@/lib/constants';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import type { WorkSchedule } from '@/types';

interface DayData {
  date: string;
  schedules: WorkSchedule[];
  error: string | null;
  startError?: string | null;
  resetError?: string | null;
  breakStartRef: string;
  legacyMinStaff: number;
}
interface SelectedSlot { date: string; startMin: number }

function normalizeBreakStart(time?: string): string {
  const minutes = time ? toMinutes(time) : NaN;
  return Number.isFinite(minutes) && minutes >= 0 && minutes < 1440
    ? toTimeStr(Math.floor(minutes / 30) * 30) : '14:00';
}

function formatShortDate(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}(${['일', '월', '화', '수', '목', '금', '토'][d.getDay()]})`;
}

export default function ManualBreakPage() {
  const [selectedDate, setSelectedDate] = useState(() => formatDateToYYYYMMDD(new Date()));
  const [day, setDay] = useState<DayData | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  const selectedDateRef = useRef(selectedDate);
  const savingStartRef = useRef<{ date: string; time: string } | null>(null);
  const [savingStart, setSavingStart] = useState(false);
  const resettingRef = useRef(false);
  const [resetting, setResetting] = useState(false);
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const { fetchDaySchedules, fetchDayBreakSetting, saveDayBreakSetting, setManualBreak } = useScheduleStore();
  const { fetchEmployees } = useEmployeeStore();

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { void fetchEmployees(); }, [fetchEmployees]);

  const loadDay = useCallback(async () => {
    if (resettingRef.current) return;
    const request = ++requestRef.current;
    try {
      const [schedules, setting] = await Promise.all([
        fetchDaySchedules(selectedDate, true), fetchDayBreakSetting(selectedDate),
      ]);
      if (request !== requestRef.current) return;
      setDay({ date: selectedDate, schedules, error: null,
        breakStartRef: savingStartRef.current?.date === selectedDate ? savingStartRef.current.time : normalizeBreakStart(setting?.break_start_ref),
        legacyMinStaff: setting?.min_total_staff ?? 4,
      });
    } catch (loadError) {
      if (request !== requestRef.current) return;
      setDay((current) => ({ date: selectedDate,
        schedules: current?.date === selectedDate ? current.schedules : [],
        breakStartRef: current?.date === selectedDate ? current.breakStartRef : '14:00',
        legacyMinStaff: current?.date === selectedDate ? current.legacyMinStaff : 4,
        error: loadError instanceof Error ? loadError.message : '일별 스케줄 조회 실패',
      }));
    }
  }, [selectedDate, fetchDaySchedules, fetchDayBreakSetting]);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
    void loadDay();
    return () => { requestRef.current += 1; };
  }, [loadDay, selectedDate]);
  useRefetchOnFocus(loadDay);

  const activeDay = day?.date === selectedDate ? day : null;
  const schedules = activeDay?.schedules;
  const timeTable = useMemo(() => getBreakTimeTable(schedules ?? [], activeDay?.breakStartRef), [schedules, activeDay?.breakStartRef]);

  const handleBreakStart = async (time: string) => {
    if (!activeDay || savingStartRef.current || resettingRef.current || time === activeDay.breakStartRef) return;
    const currentDay = activeDay;
    requestRef.current += 1;
    savingStartRef.current = { date: currentDay.date, time };
    setSavingStart(true);
    setSelectedSlot(null);
    setDay({ ...currentDay, breakStartRef: time, startError: null });
    try {
      await saveDayBreakSetting({ work_date: currentDay.date, min_total_staff: currentDay.legacyMinStaff, break_start_ref: time });
    } catch (saveError) {
      setDay((current) => current?.date === currentDay.date ? { ...current,
        breakStartRef: currentDay.breakStartRef,
        startError: saveError instanceof Error ? saveError.message : '휴게 시작시간 저장 실패',
      } : current);
    } finally {
      if (selectedDateRef.current === currentDay.date) requestRef.current += 1;
      savingStartRef.current = null;
      setSavingStart(false);
    }
  };

  const handleSelectDate = (date: string) => {
    if (resettingRef.current || date === selectedDateRef.current) return;
    requestRef.current += 1;
    selectedDateRef.current = date;
    setSelectedSlot(null);
    setSelectedDate(date);
    setShowTimePicker(false);
  };
  const handleShiftDay = (diff: number) => {
    const cur = parseDate(selectedDate);
    cur.setDate(cur.getDate() + diff);
    handleSelectDate(formatDateToYYYYMMDD(cur));
  };
  const handleSaved = (updated: WorkSchedule) => {
    if (selectedDateRef.current !== updated.work_date) return;
    requestRef.current += 1;
    setDay((current) => current?.date === updated.work_date
      ? { ...current, schedules: current.schedules.map((s) => s.id === updated.id ? {
        ...s, break_start_time: updated.break_start_time, break_end_time: updated.break_end_time, updated_at: updated.updated_at,
      } : s) } : current);
  };
  const isToday = selectedDate === formatDateToYYYYMMDD(new Date());
  const assignedSchedules = (schedules ?? []).filter((s) => s.break_start_time || s.break_end_time);
  const handleResetBreaks = async () => {
    if (!activeDay || resettingRef.current || savingStartRef.current || assignedSchedules.length === 0) return;
    const resetDate = activeDay.date;
    resettingRef.current = true;
    requestRef.current += 1;
    setResetting(true);
    setSelectedSlot(null);
    setShowTimePicker(false);
    setDay((current) => current?.date === resetDate ? { ...current, resetError: null } : current);
    let cleared = 0;
    try {
      for (const schedule of assignedSchedules) {
        await setManualBreak(schedule.id, null, null, true);
        cleared += 1;
        handleSaved({ ...schedule, break_start_time: null, break_end_time: null, updated_at: new Date().toISOString() });
      }
    } catch (resetError) {
      const message = resetError instanceof Error ? resetError.message : '휴게 초기화 실패';
      setDay((current) => current?.date === resetDate ? { ...current,
        resetError: cleared > 0 ? `${cleared}명 초기화 완료. ${message} · 초기화를 눌러 다시 시도하세요.` : message,
      } : current);
    } finally {
      requestRef.current += 1;
      resettingRef.current = false;
      setResetting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header />
      <main className="max-w-[1400px] mx-auto px-0 pt-3 pb-20 sm:px-8 md:px-10 sm:pt-4 sm:pb-24">
        <header className="ui-page-header break-page-header">
          <div className="break-date-navigation" style={{ position: 'relative' }}>
            <button type="button" className="ui-date-navigator__button" aria-label="이전 날" disabled={resetting} onClick={() => handleShiftDay(-1)}>‹</button>
            <h1 className="ui-page-title">
              <button type="button" className="ui-date-navigator__label" disabled={resetting} onClick={() => {
                const input = dateInputRef.current;
                if (input?.showPicker) input.showPicker(); else input?.focus();
              }}>{formatShortDate(selectedDate)}</button>
            </h1>
            <button type="button" className="ui-date-navigator__button" aria-label="다음 날" disabled={resetting} onClick={() => handleShiftDay(1)}>›</button>
            <input ref={dateInputRef} type="date" value={selectedDate} disabled={resetting}
              onChange={(event) => { if (event.target.value) handleSelectDate(event.target.value); }}
              aria-label="날짜 선택" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
          </div>
        </header>
        <section aria-label="휴게 배치 목록">
          <div className="break-list-toolbar px-6 sm:px-4">
          <div className="break-time-control">
            <label htmlFor="break-start-time" className="break-time-label">시작</label>
            <button id="break-start-time" type="button" className="break-time-trigger" aria-label="전체 휴게 시작시간" aria-haspopup="dialog"
              disabled={!activeDay || savingStart || resetting} onClick={() => setShowTimePicker(true)}>
              <span>{activeDay?.breakStartRef ?? '14:00'}</span>
              <svg aria-hidden="true" width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <button type="button" className="break-reset-trigger" disabled={!activeDay || savingStart || resetting || assignedSchedules.length === 0}
            onClick={() => void handleResetBreaks()}>{resetting ? '초기화 중…' : '초기화'}</button>
          </div>
        <div className="px-6 sm:px-4">
        {activeDay?.error && <div role="alert" className="ui-alert ui-alert--danger" style={{ marginBottom: 16 }}>{activeDay.error}</div>}
        {activeDay?.startError && <div role="alert" className="ui-alert ui-alert--danger" style={{ marginBottom: 16 }}>{activeDay.startError}</div>}
        {activeDay?.resetError && <div role="alert" className="ui-alert ui-alert--danger" style={{ marginBottom: 16 }}>{activeDay.resetError}</div>}
        </div>
        {!activeDay ? <p className="ui-caption px-6 sm:px-4">근무 스케줄을 불러오는 중...</p>
          : activeDay.schedules.length === 0 ? !activeDay.error && <p className="ui-caption px-6 sm:px-4">해당 날짜에 등록된 근무 스케줄이 없습니다.</p>
          : <>
            <section aria-label="시간대별 휴게 배치">
              <div>
                {timeTable.length === 0 && <p className="ui-caption px-6 sm:px-4">표시할 슬롯이 없습니다.</p>}
                {timeTable.map((slot) => {
                  const isCurrent = isToday && currentMinutes >= slot.startMin && currentMinutes < slot.endMin;
                  return <button key={slot.startMin} type="button" className="break-slot-row"
                    disabled={resetting}
                    aria-label={`${slot.timeStr} 휴게 배치`} onClick={() => setSelectedSlot({ date: selectedDate, startMin: slot.startMin })}
                    aria-current={isCurrent ? 'time' : undefined}>
                    <strong className="break-slot-row__time">{toTimeStr(slot.startMin)}</strong>
                    <span className="break-slot-row__content">
                      <span aria-label="휴게자" className={`break-slot-row__names${slot.onBreak.length === 0 ? ' break-slot-row__names--empty' : ''}`}>{slot.onBreak.map((s) => s.employee?.name ?? '알 수 없음').join(', ') || '—'}</span>
                      <span aria-label="근무자" className="break-slot-row__working">{slot.working.map((s) => s.employee?.name ?? '알 수 없음').join(', ') || '—'}</span>
                      {[...new Set(slot.warnings.map((warning) => warning.missingRoles.map((r) => ROLE_LABELS[r]).join('/')))].map((roles) => <span key={roles} className="break-slot-row__warning">{roles} 공백</span>)}
                    </span>
                    <span className="break-slot-row__chevron" aria-hidden="true">›</span>
                  </button>;
                })}
              </div>
            </section>
          </>}
        </section>
        {selectedSlot && selectedSlot.date === selectedDate && activeDay && <SlotBreakModal
          key={`${selectedSlot.date}-${selectedSlot.startMin}`} startMin={selectedSlot.startMin} schedules={activeDay.schedules}
          onSaved={handleSaved} onClose={() => setSelectedSlot((current) => current?.date === selectedSlot.date && current.startMin === selectedSlot.startMin ? null : current)} />}
        <TimeWheelPickerModal isOpen={showTimePicker && Boolean(activeDay)} onClose={() => setShowTimePicker(false)}
          title="휴게 시작시간" value={activeDay?.breakStartRef ?? '14:00'} minTime="00:00" maxTime="23:30"
          onConfirm={(time) => { setShowTimePicker(false); void handleBreakStart(time); }} />
      </main>
    </div>
  );
}
