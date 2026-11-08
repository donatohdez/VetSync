import { randomUUID } from "node:crypto";
import { z } from "zod";
import type {
  AppointmentRepository,
  Appointment,
} from "../domain/appointment.js";
import type { Clock } from "../../../shared/clock.js";
import { AppError } from "../../../shared/errors.js";
import {
  idSchema,
  instantSchema,
  parse,
  text,
} from "../../../shared/validation.js";
const schema = z
  .object({
    petId: idSchema,
    veterinarianId: idSchema,
    startsAt: instantSchema,
    endsAt: instantSchema,
    reason: text(500),
  })
  .strict();
export class ScheduleAppointment {
  constructor(
    private readonly repository: AppointmentRepository,
    private readonly clock: Clock,
  ) {}
  async execute(input: unknown): Promise<Appointment> {
    const data = parse(schema, input);
    const startsAt = new Date(data.startsAt),
      endsAt = new Date(data.endsAt);
    if (startsAt <= this.clock.now())
      throw new AppError(
        "VALIDATION_ERROR",
        "La cita debe comenzar en el futuro.",
      );
    if (endsAt <= startsAt)
      throw new AppError(
        "VALIDATION_ERROR",
        "El fin debe ser posterior al inicio.",
      );
    const appointment: Appointment = {
      ...data,
      id: randomUUID(),
      startsAt,
      endsAt,
    };
    await this.repository.reserve(appointment);
    return appointment;
  }
}
