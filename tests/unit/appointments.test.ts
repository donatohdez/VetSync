import { describe, it, expect, beforeEach } from "vitest";
import { ScheduleAppointment } from "../../src/modules/appointments/application/schedule-appointment.js";
import type {
  Appointment,
  AppointmentRepository,
  ScheduleInput,
} from "../../src/modules/appointments/domain/appointment.js";
import { AppError, notFound } from "../../src/shared/errors.js";
const now = new Date("2026-11-08T15:00:00Z");
class MemoryAppointments implements AppointmentRepository {
  appointments: Appointment[] = [];
  async reserve(a: Appointment): Promise<void> {
    if (a.petId === "missing") throw notFound("La mascota");
    if (a.veterinarianId === "missing") throw notFound("El veterinario");
    if (
      this.appointments.some(
        (b) =>
          b.veterinarianId === a.veterinarianId &&
          b.startsAt < a.endsAt &&
          b.endsAt > a.startsAt,
      )
    ) {
      throw new AppError(
        "APPOINTMENT_CONFLICT",
        "El veterinario está ocupado.",
        409,
      );
    }
    this.appointments.push(a);
  }
  async list(): Promise<Appointment[]> {
    return this.appointments;
  }
}
let repo: MemoryAppointments;
let service: ScheduleAppointment;
const base: ScheduleInput = {
  petId: "pet",
  veterinarianId: "vet",
  startsAt: "2026-11-09T10:00:00-07:00",
  endsAt: "2026-11-09T10:30:00-07:00",
  reason: "Revisión general",
};
beforeEach(() => {
  repo = new MemoryAppointments();
  service = new ScheduleAppointment(repo, { now: () => now });
});
describe("Agendar cita", () => {
  it("guarda una cita válida como instante UTC", async () => {
    const a = await service.execute(base);
    expect(a.startsAt.toISOString()).toBe("2026-11-09T17:00:00.000Z");
    expect(await repo.list()).toHaveLength(1);
    expect(a.id).toBeTruthy();
  });
  it.each([
    ["10:00", "10:30"],
    ["09:45", "10:15"],
    ["10:15", "10:45"],
    ["10:05", "10:20"],
    ["09:30", "11:00"],
  ])("rechaza solapamiento %s-%s", async (s, e) => {
    await service.execute(base);
    await expect(
      service.execute({
        ...base,
        startsAt: `2026-11-09T${s}:00-07:00`,
        endsAt: `2026-11-09T${e}:00-07:00`,
      }),
    ).rejects.toMatchObject({ code: "APPOINTMENT_CONFLICT" });
    expect(repo.appointments).toHaveLength(1);
  });
  it.each([
    ["09:30", "10:00"],
    ["10:30", "11:00"],
  ])("permite citas contiguas %s-%s", async (s, e) => {
    await service.execute(base);
    await service.execute({
      ...base,
      startsAt: `2026-11-09T${s}:00-07:00`,
      endsAt: `2026-11-09T${e}:00-07:00`,
    });
    expect(repo.appointments).toHaveLength(2);
  });
  it("permite el mismo horario con otro veterinario", async () => {
    await service.execute(base);
    await service.execute({ ...base, veterinarianId: "vet2" });
    expect(repo.appointments).toHaveLength(2);
  });
  it.each([
    { startsAt: "2026-11-07T10:00:00Z" },
    { startsAt: "2026-11-08T15:00:00Z" },
    { endsAt: base.startsAt },
    { endsAt: "2026-11-09T09:30:00-07:00" },
    { startsAt: "2026-11-09T10:00:00" },
    { startsAt: "no-fecha" },
    { startsAt: "2026-02-30T10:00:00Z" },
    { reason: " " },
    { petId: "" },
  ])("rechaza entrada inválida %j antes de persistir", async (change) => {
    await expect(service.execute({ ...base, ...change })).rejects.toMatchObject(
      { code: "VALIDATION_ERROR" },
    );
    expect(repo.appointments).toHaveLength(0);
  });
  it.each([{ petId: "missing" }, { veterinarianId: "missing" }])(
    "rechaza referencia inexistente %j",
    async (change) => {
      await expect(
        service.execute({ ...base, ...change }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    },
  );
});
