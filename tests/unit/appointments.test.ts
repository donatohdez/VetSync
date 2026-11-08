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
  startsAt: "2026-11-09T11:00:00-07:00",
  endsAt: "2026-11-09T11:30:00-07:00",
  reason: "Revisión general",
};
beforeEach(() => {
  repo = new MemoryAppointments();
  service = new ScheduleAppointment(repo, { now: () => now });
});
describe("Agendar cita", () => {
  it("guarda una cita válida como instante UTC", async () => {
    const a = await service.execute(base);
    expect(a.startsAt.toISOString()).toBe("2026-11-09T18:00:00.000Z");
    expect(await repo.list()).toHaveLength(1);
    expect(a.id).toBeTruthy();
  });
  it.each([
    ["11:00", "11:30"],
    ["10:45", "11:15"],
    ["11:15", "11:45"],
    ["11:05", "11:20"],
    ["10:30", "12:00"],
  ])("rechaza solapamiento %s-%s", async (s, e) => {
    await service.execute(base);
    await expect(
      service.execute({
        ...base,
        startsAt: `2026-11-09T${s}:00-07:00`,
        endsAt: `2026-11-09T${e}:00-07:00`,
      }),
    ).rejects.toMatchObject({
      code: s === "11:00" ? "APPOINTMENT_CONFLICT" : "VALIDATION_ERROR",
    });
    expect(repo.appointments).toHaveLength(1);
  });
  it.each([
    ["10:30", "11:00"],
    ["11:30", "12:00"],
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
it.each([
  ["09:30:00", "10:00:00"],
  ["18:00:00", "18:30:00"],
  ["17:45:00", "18:15:00"],
  ["10:15:00", "10:45:00"],
  ["10:00:00", "11:00:00"],
  ["10:00:01", "10:30:01"],
  ["10:00:00.001", "10:30:00.001"],
])("horario de clínica: rechaza %s-%s", async (start, end) => {
  await expect(
    service.execute({
      ...base,
      startsAt: `2026-11-09T${start}-07:00`,
      endsAt: `2026-11-09T${end}-07:00`,
    }),
  ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  expect(repo.appointments).toHaveLength(0);
});
it("la última cita empieza a las 17:30 y termina al cierre de las 18:00", async () => {
  const result = await service.execute({
    ...base,
    startsAt: "2026-11-09T17:30:00-07:00",
    endsAt: "2026-11-09T18:00:00-07:00",
  });
  expect(result.endsAt.getTime() - result.startsAt.getTime()).toBe(1800000);
});
