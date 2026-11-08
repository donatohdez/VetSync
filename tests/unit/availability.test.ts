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
const vetA = (startsAt: string, endsAt: string) => ({
  id: "x",
  petId: "p",
  veterinarianId: "vetA",
  startsAt: new Date(startsAt),
  endsAt: new Date(endsAt),
  reason: "Consulta",
});
const twoVets = { exists: async () => true };
it("el bloque que empieza exactamente en «ahora» es pasado y el siguiente está disponible (F-02)", async () => {
  // 17:30Z = 10:30 en Hermosillo, justo el inicio del segundo bloque.
  const exact = new ListAvailability(
    { reserve: async () => {}, list: async () => [] },
    twoVets,
    { now: () => new Date("2026-11-09T17:30:00Z") },
  );
  const slots = await exact.execute({
    date: "2026-11-09",
    veterinarianId: "vetA",
  });
  expect(slots[1]?.time).toBe("10:30");
  expect(slots[1]).toMatchObject({ available: false, reason: "past" });
  expect(slots[2]).toMatchObject({ available: true, reason: null });
});
it("la cita de un veterinario no bloquea a otro (F-02)", async () => {
  const shared = new ListAvailability(
    {
      reserve: async () => {},
      list: async () => [vetA("2026-11-09T18:00:00Z", "2026-11-09T18:30:00Z")],
    },
    twoVets,
    { now: () => new Date("2026-11-08T12:00:00Z") },
  );
  const forA = await shared.execute({
    date: "2026-11-09",
    veterinarianId: "vetA",
  });
  const forB = await shared.execute({
    date: "2026-11-09",
    veterinarianId: "vetB",
  });
  expect(forA[2]).toMatchObject({ time: "11:00", reason: "occupied" });
  expect(forB[2]).toMatchObject({
    time: "11:00",
    available: true,
    reason: null,
  });
  expect(forB.every((s) => s.available)).toBe(true);
});
it.each(["0001-01-01", "0099-12-31", "1000-01-01", "9999-12-31"])(
  "calcula los bloques del año pedido para %s, sin trasladarlos a 1900-1999 (F-18)",
  async (date) => {
    const slots = await service.execute({ date, veterinarianId: "vet" });
    expect(slots).toHaveLength(16);
    // Hermosillo está en UTC-7; sin el defecto, el año caería en 1900-1999.
    const [year, month, day] = date.split("-").map(Number);
    const target = new Date(0);
    target.setUTCFullYear(year!, month! - 1, day!);
    for (const slot of slots)
      expect(Math.abs(slot.startsAt.getTime() - target.getTime())).toBeLessThan(
        2 * 86400000,
      );
    const expectedReason = date === "9999-12-31" ? null : "past";
    expect(slots[0]?.reason).toBe(expectedReason);
  },
);
