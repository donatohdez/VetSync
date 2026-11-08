import { it, expect } from "vitest";
import { ListAvailability } from "../../src/modules/appointments/application/list-availability.js";
import type { AppointmentRepository } from "../../src/modules/appointments/domain/appointment.js";
const repository: AppointmentRepository = {
  reserve: async () => {},
  list: async () => [
    {
      id: "a",
      petId: "p",
      veterinarianId: "vet",
      startsAt: new Date("2026-11-09T17:30:00Z"),
      endsAt: new Date("2026-11-09T18:00:00Z"),
      reason: "Consulta",
    },
  ],
};
const clock = { now: () => new Date("2026-11-09T17:15:00Z") };
const service = new ListAvailability(
  repository,
  { exists: async (id) => id === "vet" },
  clock,
);
it("ofrece 16 intervalos de media hora entre las 10:00 y las 17:30", async () => {
  const slots = await service.execute({
    date: "2026-11-09",
    veterinarianId: "vet",
  });
  expect(slots).toHaveLength(16);
  expect(slots[0]?.time).toBe("10:00");
  expect(slots.at(-1)?.time).toBe("17:30");
  expect(slots.at(-1)?.endsAt.toISOString()).toBe("2026-11-10T01:00:00.000Z");
  expect(slots.map((s) => s.time)).not.toContain("18:00");
  expect(slots[0]).toMatchObject({ available: false, reason: "past" });
  expect(slots[1]).toMatchObject({ available: false, reason: "occupied" });
  expect(slots[2]).toMatchObject({ available: true, reason: null });
});
it("calcula los intervalos en la zona de la clínica y no en la del dispositivo", async () => {
  const tokyo = new ListAvailability(
    repository,
    { exists: async () => true },
    { now: () => new Date("2026-11-08T12:00:00Z") },
    "Asia/Tokyo",
  );
  const slots = await tokyo.execute({
    date: "2026-11-09",
    veterinarianId: "vet",
  });
  expect(slots[0]?.startsAt.toISOString()).toBe("2026-11-09T01:00:00.000Z");
});
it("un día pasado tiene todos sus intervalos no disponibles", async () => {
  const slots = await service.execute({
    date: "2026-11-08",
    veterinarianId: "vet",
  });
  expect(slots.every((s) => !s.available && s.reason === "past")).toBe(true);
});
it.each(["2026-02-30", "bad", "2026-11-09T10:00:00Z"])(
  "rechaza fecha inválida %s",
  async (date) => {
    await expect(
      service.execute({ date, veterinarianId: "vet" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  },
);
it("rechaza un veterinario inexistente o inactivo", async () => {
  await expect(
    service.execute({ date: "2026-11-09", veterinarianId: "missing" }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});
