/**
 * weekUtils.ts — 주간 날짜 유틸리티
 */

/** Date 객체를 로컬 타임존 기준 'YYYY-MM-DD' 문자열로 변환 */
export function formatDateToYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 'YYYY-MM-DD' 문자열을 로컬 Date 객체로 안전하게 파싱 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** weekStart(YYYY-MM-DD)부터 월~일 7개 날짜 배열 반환 */
export function getWeekDates(weekStart: string): string[] {
  const dates: string[] = [];
  const start = parseDate(weekStart);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(formatDateToYYYYMMDD(d));
  }
  return dates;
}

/** 주어진 날짜가 속한 주의 월요일(YYYY-MM-DD) 반환 (월~일 기준) */
export function getWeekStartFromDate(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=일, 1=월, ..., 6=토
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return formatDateToYYYYMMDD(d);
}

/** 'YYYY-MM-DD' → '09/15 (월)' 형태 */
export function formatDayLabel(dateStr: string): string {
  const date = parseDate(dateStr);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const dayName = dayNames[date.getDay()];
  return `${mm}/${dd} (${dayName})`;
}

/** weekStart에서 +7일 또는 -7일 이동 */
export function shiftWeek(weekStart: string, direction: 1 | -1): string {
  const d = parseDate(weekStart);
  d.setDate(d.getDate() + direction * 7);
  return formatDateToYYYYMMDD(d);
}

/** YYYY.MM.DD~DD 형태의 주 표시 문자열 */
export function formatWeekRange(weekStart: string): string {
  const dates = getWeekDates(weekStart);
  const start = dates[0];
  const end = dates[dates.length - 1];
  const [sy, sm, sd] = start.split('-');
  const [, , ed] = end.split('-');
  return `${sy}.${sm}.${sd}~${ed}`;
}
