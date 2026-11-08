import { AppError } from "../../../shared/errors.js";
export const clinicHours = {
  opensAt: "10:00",
  closesAt: "18:00",
  slotMinutes: 30,
} as const;
const toMinutes = (clock: string): number => {
  const [hour, minute] = clock.split(":").map(Number);
  return hour! * 60 + minute!;
};
/** Ventana de reservas en minutos del día, derivada de `clinicHours` (única fuente). */
export const bookingWindow = () => ({
  opens: toMinutes(clinicHours.opensAt),
  closes: toMinutes(clinicHours.closesAt),
  slot: clinicHours.slotMinutes,
});
export const formatClock = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
// Date.UTC trata los años 0-99 como 1900-1999; setUTCFullYear no.
function utcMillis(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  return date.getTime();
}
function parts(date: Date, timeZone: string) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}
export function clinicInstant(
  date: string,
  time: string,
  timeZone: string,
): Date {
  const [year, month, day] = date.split("-").map(Number),
    [hour, minute] = time.split(":").map(Number);
  const target = utcMillis(year!, month!, day!, hour!, minute!);
  let instant = target;
  for (let attempt = 0; attempt < 4; attempt++) {
    const local = parts(new Date(instant), timeZone);
    const delta =
      target -
      utcMillis(
        local.year,
        local.month,
        local.day,
        local.hour,
        local.minute,
        local.second,
      );
    if (delta === 0) return new Date(instant);
    instant += delta;
  }
  throw new AppError(
    "VALIDATION_ERROR",
    "Ese horario no existe en la zona de la clínica.",
  );
}
export function assertClinicHours(
  start: Date,
  end: Date,
  timeZone: string,
): void {
  const a = parts(start, timeZone),
    b = parts(end, timeZone);
  const sameDay = a.year === b.year && a.month === b.month && a.day === b.day;
  const { opens, closes, slot } = bookingWindow();
  const startMinute = a.hour * 60 + a.minute;
  if (
    end.getTime() - start.getTime() !== slot * 60000 ||
    start.getUTCMilliseconds() !== 0 ||
    a.second !== 0 ||
    (startMinute - opens) % slot !== 0 ||
    startMinute < opens ||
    startMinute + slot > closes ||
    !sameDay
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Las citas duran ${slot} minutos y deben iniciar entre las ${clinicHours.opensAt} y las ${formatClock(closes - slot)}, en bloques de la clínica.`,
    );
  }
}
