export function formatTimeHHMM(time?: string | null): string {
  return time ? time.slice(0, 5) : '';
}
