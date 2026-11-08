export interface Clock {
  now(): Date;
}
export const systemClock: Clock = { now: () => new Date() };

/** Día de calendario (AAAA-MM-DD) de un instante en la zona horaria indicada. */
export function calendarDay(instant: Date, timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  return `${String(parts.year).padStart(4, "0")}-${parts.month}-${parts.day}`;
}
