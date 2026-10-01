'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import BottomSheet from './BottomSheet';

interface TimeWheelPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onConfirm: (time: string) => void;
  title?: string;
  minTime?: string;
  maxTime?: string;
  zIndex?: number;
}

const ITEM_HEIGHT = 44;
const VISIBLE_COUNT = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;
const PADDING_Y = (PICKER_HEIGHT - ITEM_HEIGHT) / 2;

function normalizeTime(value: string, minTime: string, maxTime: string) {
  const [minHour, minMinute] = minTime.split(':').map(Number);
  const [maxHour, maxMinute] = maxTime.split(':').map(Number);
  let [hour, minute] = (value || '14:00').split(':').map(Number);

  minute = minute >= 15 && minute < 45 ? 30 : 0;
  const total = hour * 60 + minute;
  const minTotal = minHour * 60 + minMinute;
  const maxTotal = maxHour * 60 + maxMinute;
  const clamped = Math.max(minTotal, Math.min(maxTotal, total));
  hour = Math.floor(clamped / 60);
  minute = clamped % 60;

  return [String(hour).padStart(2, '0'), String(minute).padStart(2, '0')] as const;
}

function TimeWheelPicker({
  onClose,
  value,
  onConfirm,
  title = '시간을 선택해주세요',
  minTime = '10:30',
  maxTime = '21:30',
  zIndex = 500,
}: Omit<TimeWheelPickerModalProps, 'isOpen'>) {
  const titleId = useId();
  const [minHour, minMinute] = useMemo(() => minTime.split(':').map(Number), [minTime]);
  const [maxHour] = useMemo(() => maxTime.split(':').map(Number), [maxTime]);
  const initial = useMemo(() => normalizeTime(value, minTime, maxTime), [value, minTime, maxTime]);
  const [selectedHour, setSelectedHour] = useState(initial[0]);
  const [selectedMinute, setSelectedMinute] = useState(initial[1]);
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);

  const hours = useMemo(
    () => Array.from({ length: maxHour - minHour + 1 }, (_, index) => String(minHour + index).padStart(2, '0')),
    [maxHour, minHour],
  );
  const minutes = useMemo(() => ['00', '30'], []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hourIndex = hours.indexOf(initial[0]);
      const minuteIndex = minutes.indexOf(initial[1]);
      if (hourScrollRef.current && hourIndex >= 0) hourScrollRef.current.scrollTop = hourIndex * ITEM_HEIGHT;
      if (minuteScrollRef.current && minuteIndex >= 0) minuteScrollRef.current.scrollTop = minuteIndex * ITEM_HEIGHT;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hours, initial, minutes]);

  const isMinuteDisabled = useCallback(
    (hour: string, minute: string) => hour === String(minHour).padStart(2, '0') && minMinute === 30 && minute === '00',
    [minHour, minMinute],
  );

  const selectHour = useCallback((hour: string) => {
    setSelectedHour(hour);
    if (isMinuteDisabled(hour, selectedMinute)) {
      setSelectedMinute('30');
      minuteScrollRef.current?.scrollTo({ top: ITEM_HEIGHT, behavior: 'smooth' });
    }
  }, [isMinuteDisabled, selectedMinute]);

  const handleHourScroll = useCallback(() => {
    if (!hourScrollRef.current) return;
    const index = Math.max(0, Math.min(hours.length - 1, Math.round(hourScrollRef.current.scrollTop / ITEM_HEIGHT)));
    const hour = hours[index];
    if (hour && hour !== selectedHour) selectHour(hour);
  }, [hours, selectHour, selectedHour]);

  const handleMinuteScroll = useCallback(() => {
    if (!minuteScrollRef.current) return;
    const index = Math.max(0, Math.min(minutes.length - 1, Math.round(minuteScrollRef.current.scrollTop / ITEM_HEIGHT)));
    const minute = minutes[index];
    if (!minute || isMinuteDisabled(selectedHour, minute)) {
      minuteScrollRef.current.scrollTo({ top: ITEM_HEIGHT, behavior: 'smooth' });
      setSelectedMinute('30');
      return;
    }
    setSelectedMinute(minute);
  }, [isMinuteDisabled, minutes, selectedHour]);

  return (
    <BottomSheet
      onClose={onClose}
      titleId={titleId}
      maxWidth={440}
      padding="var(--space-4) var(--space-5) var(--space-8)"
      gap={20}
      zIndex={zIndex}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 id={titleId} className="ui-overlay-title">{title}</h2>
        <span
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-round)',
            background: 'var(--color-muted-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary)',
          }}
        >
          ◷
        </span>
      </div>

      <div style={{ position: 'relative', height: PICKER_HEIGHT, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: PADDING_Y,
            left: 16,
            right: 16,
            height: ITEM_HEIGHT,
            background: 'var(--color-muted-bg)',
            borderRadius: 'var(--radius-xl)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ display: 'flex', width: '100%', maxWidth: 240, height: '100%', margin: '0 auto', zIndex: 1 }}>
          <div ref={hourScrollRef} onScroll={handleHourScroll} style={wheelStyle} aria-label="시">
            {hours.map((hour) => (
              <button
                type="button"
                key={hour}
                onClick={() => {
                  selectHour(hour);
                  hourScrollRef.current?.scrollTo({ top: hours.indexOf(hour) * ITEM_HEIGHT, behavior: 'smooth' });
                }}
                style={wheelItemStyle(hour === selectedHour)}
              >
                {hour}
              </button>
            ))}
          </div>
          <div style={{ alignSelf: 'center', color: 'var(--color-text-muted)', fontSize: 20, fontWeight: 700 }}>:</div>
          <div ref={minuteScrollRef} onScroll={handleMinuteScroll} style={wheelStyle} aria-label="분">
            {minutes.map((minute) => {
              const disabled = isMinuteDisabled(selectedHour, minute);
              return (
                <button
                  type="button"
                  key={minute}
                  disabled={disabled}
                  onClick={() => {
                    setSelectedMinute(minute);
                    minuteScrollRef.current?.scrollTo({ top: minutes.indexOf(minute) * ITEM_HEIGHT, behavior: 'smooth' });
                  }}
                  style={wheelItemStyle(minute === selectedMinute, disabled)}
                >
                  {minute}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="ui-button ui-button--primary"
        style={{ width: '100%', minHeight: 48 }}
        onClick={() => {
          onConfirm(`${selectedHour}:${selectedMinute}`);
          onClose();
        }}
      >
        확인
      </button>
    </BottomSheet>
  );
}

const wheelStyle: React.CSSProperties = {
  flex: 1,
  height: '100%',
  overflowY: 'auto',
  scrollSnapType: 'y mandatory',
  paddingTop: PADDING_Y,
  paddingBottom: PADDING_Y,
  scrollbarWidth: 'none',
};

function wheelItemStyle(selected: boolean, disabled = false): React.CSSProperties {
  return {
    width: '100%',
    height: ITEM_HEIGHT,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    scrollSnapAlign: 'center',
    background: 'transparent',
    border: 0,
    color: disabled ? 'var(--color-disabled)' : selected ? 'var(--color-neutral-dark)' : 'var(--color-text-muted)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: selected ? 22 : 17,
    fontWeight: selected ? 700 : 400,
  };
}

export default function TimeWheelPickerModal(props: TimeWheelPickerModalProps) {
  const { isOpen, title = '시간을 선택해주세요', minTime = '10:30', maxTime = '21:30', zIndex = 500, ...rest } = props;
  if (!isOpen) return null;
  return (
    <TimeWheelPicker
      key={`${props.value}-${minTime}-${maxTime}`}
      {...rest}
      title={title}
      minTime={minTime}
      maxTime={maxTime}
      zIndex={zIndex}
    />
  );
}
