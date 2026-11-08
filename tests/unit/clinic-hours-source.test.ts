import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { createApp, type Services } from "../../src/http/app.js";
import { clinicHours } from "../../src/modules/appointments/domain/clinic-hours.js";
import { ListAvailability } from "../../src/modules/appointments/application/list-availability.js";
import { ScheduleAppointment } from "../../src/modules/appointments/application/schedule-appointment.js";

// Una sola definición de horario (clinicHours) alimenta disponibilidad,
// validación de citas y /api/config (F-19/F-21). Se modifica en la prueba
// y se restaura para comprobar que las tres partes la siguen.
const mutable = clinicHours as {
  opensAt: string;
  closesAt: string;
  slotMinutes: number;
};
const original = { ...clinicHours };
afterEach(() => Object.assign(mutable, original));

const clock = { now: () => new Date("2026-01-01T00:00:00Z") };
const repository = { reserve: async () => {}, list: async () => [] };

describe("fuente única del horario de la clínica", () => {
  it("/api/config publica exactamente opensAt, closesAt y slotMinutes", async () => {
    const app = createApp({} as Services, {
      timeZone: "America/Hermosillo",
      reminderHours: 24,
    });
    const body = (await request(app).get("/api/config").expect(200)).body;
    expect(body.bookingHours).toEqual({
      opensAt: "10:00",
      closesAt: "18:00",
      slotMinutes: 30,
    });
    expect(body.bookingHours).toEqual(clinicHours);
  });
  it("disponibilidad, validación de citas y /config siguen la misma definición", async () => {
    Object.assign(mutable, {
      opensAt: "09:00",
      closesAt: "12:00",
      slotMinutes: 60,
    });
    const slots = await new ListAvailability(
      repository,
      { exists: async () => true },
      clock,
    ).execute({ date: "2026-11-09", veterinarianId: "v" });
    expect(slots.map((s) => s.time)).toEqual(["09:00", "10:00", "11:00"]);
    const schedule = new ScheduleAppointment(repository, clock);
    const input = {
      petId: "p",
      veterinarianId: "v",
      reason: "Control",
    };
    await schedule.execute({
      ...input,
      startsAt: "2026-11-09T09:00:00-07:00",
      endsAt: "2026-11-09T10:00:00-07:00",
    });
    await schedule.execute({
      ...input,
      startsAt: "2026-11-09T11:00:00-07:00",
      endsAt: "2026-11-09T12:00:00-07:00",
    });
    await expect(
      schedule.execute({
        ...input,
        startsAt: "2026-11-09T12:00:00-07:00",
        endsAt: "2026-11-09T13:00:00-07:00",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      schedule.execute({
        ...input,
        startsAt: "2026-11-09T08:00:00-07:00",
        endsAt: "2026-11-09T09:00:00-07:00",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const app = createApp({} as Services, {
      timeZone: "America/Hermosillo",
      reminderHours: 24,
    });
    const body = (await request(app).get("/api/config")).body;
    expect(body.bookingHours).toEqual({
      opensAt: "09:00",
      closesAt: "12:00",
      slotMinutes: 60,
    });
  });
});
