import { AppError } from "../../../shared/errors.js";
export const clinicHours = {
  opensAt: "10:00",
  closesAt: "18:00",
  slotMinutes: 30,
} as const;
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
  const target = Date.UTC(year!, month! - 1, day!, hour!, minute!);
  let instant = target;
  for (let attempt = 0; attempt < 4; attempt++) {
    const local = parts(new Date(instant), timeZone);
    const delta =
      target -
      Date.UTC(
        local.year,
        local.month - 1,
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
  if (
    end.getTime() - start.getTime() !== clinicHours.slotMinutes * 60000 ||
    start.getUTCMilliseconds() !== 0 ||
    a.second !== 0 ||
    a.minute % 30 !== 0 ||
    a.hour < 10 ||
    a.hour >= 18 ||
    !sameDay ||
    b.hour * 60 + b.minute > 18 * 60
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Las citas duran 30 minutos y deben iniciar entre las 10:00 y las 17:30, en horas o medias horas de la clínica.",
    );
  }
}
