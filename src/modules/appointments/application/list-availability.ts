import { z } from "zod";
import type { AppointmentRepository } from "../domain/appointment.js";
import { clinicInstant, clinicHours } from "../domain/clinic-hours.js";
import type { Clock } from "../../../shared/clock.js";
import { notFound } from "../../../shared/errors.js";
import { idSchema, parse } from "../../../shared/validation.js";
export interface AppointmentSlot {
  time: string;
  startsAt: Date;
  endsAt: Date;
  available: boolean;
  reason: "past" | "occupied" | null;
}
const schema = z
  .object({ date: z.iso.date(), veterinarianId: idSchema })
  .strict();
export class ListAvailability {
  constructor(
    private readonly repository: AppointmentRepository,
    private readonly veterinarians: { exists(id: string): Promise<boolean> },
    private readonly clock: Clock,
    private readonly timeZone = "America/Hermosillo",
  ) {}
  async execute(input: unknown): Promise<AppointmentSlot[]> {
    const { date, veterinarianId } = parse(schema, input);
    if (!(await this.veterinarians.exists(veterinarianId)))
      throw notFound("El veterinario activo");
    const appointments = await this.repository.list(),
      now = this.clock.now();
    const slots: AppointmentSlot[] = [];
    for (
      let minute = 10 * 60;
      minute < 18 * 60;
      minute += clinicHours.slotMinutes
    ) {
      const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
      const startsAt = clinicInstant(date, time, this.timeZone),
        endsAt = new Date(startsAt.getTime() + clinicHours.slotMinutes * 60000);
      const reason =
        startsAt <= now
          ? "past"
          : appointments.some(
                (a) =>
                  a.veterinarianId === veterinarianId &&
                  a.startsAt < endsAt &&
                  a.endsAt > startsAt,
              )
            ? "occupied"
            : null;
      slots.push({
        time,
        startsAt,
        endsAt,
        available: reason === null,
        reason,
      });
    }
    return slots;
  }
}
