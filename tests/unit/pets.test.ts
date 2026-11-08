import { describe, it, expect } from "vitest";
import { Pets } from "../../src/modules/pets/application/pets.js";
import type { Pet, PetRepository } from "../../src/modules/pets/domain/pet.js";

class MemoryPets implements PetRepository {
  pets: Pet[] = [];
  async create(pet: Pet): Promise<void> {
    this.pets.push(pet);
  }
  async list(): Promise<Pet[]> {
    return this.pets;
  }
  async exists(id: string): Promise<boolean> {
    return this.pets.some((p) => p.id === id);
  }
  async ownerExists(): Promise<boolean> {
    return true;
  }
}
const base = { ownerId: "owner", name: "Luna", species: "Perro" };
const build = (iso: string, timeZone?: string) => {
  const repo = new MemoryPets();
  const service =
    timeZone === undefined
      ? new Pets(repo, { now: () => new Date(iso) })
      : new Pets(repo, { now: () => new Date(iso) }, timeZone);
  return { repo, service };
};

describe("fecha de nacimiento frente al día de la clínica (F-18)", () => {
  // 06:30Z del día 9 en UTC es 23:30 del día 8 en Hermosillo (UTC-7).
  const lateUtc = "2026-11-09T06:30:00Z";
  it("rechaza «mañana» de la clínica aunque en UTC ya sea ese día", async () => {
    const { service, repo } = build(lateUtc, "America/Hermosillo");
    await expect(
      service.create({ ...base, birthDate: "2026-11-09" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(repo.pets).toHaveLength(0);
  });
  it("acepta el día de hoy de la clínica", async () => {
    const { service } = build(lateUtc, "America/Hermosillo");
    const pet = await service.create({ ...base, birthDate: "2026-11-08" });
    expect(pet.birthDate).toBe("2026-11-08");
  });
  it("usa por defecto America/Hermosillo", async () => {
    const { service } = build(lateUtc);
    await expect(
      service.create({ ...base, birthDate: "2026-11-09" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await service.create({ ...base, birthDate: "2026-11-08" });
  });
  it("en una zona adelantada, el día de hoy local ya es el siguiente en UTC", async () => {
    // 23:30Z del día 8 en UTC es 08:30 del día 9 en Tokio.
    const { service } = build("2026-11-08T23:30:00Z", "Asia/Tokyo");
    await service.create({ ...base, birthDate: "2026-11-09" });
    await expect(
      service.create({ ...base, birthDate: "2026-11-10" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("en una zona atrasada, hoy local es el día anterior en UTC", async () => {
    // 03:00Z del día 9 es 20:00 del día 8 en Los Ángeles... (UTC-8 en nov.)
    const { service } = build("2026-11-09T03:00:00Z", "America/Los_Angeles");
    await expect(
      service.create({ ...base, birthDate: "2026-11-09" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await service.create({ ...base, birthDate: "2026-11-08" });
  });
  it("cota inferior técnica: DATE de MySQL admite desde 1000-01-01", async () => {
    const { service } = build(lateUtc);
    await service.create({ ...base, birthDate: "1000-01-01" });
    await expect(
      service.create({ ...base, birthDate: "0999-12-31" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      service.create({ ...base, birthDate: "0001-01-01" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("sigue permitiendo mascota sin fecha de nacimiento", async () => {
    const { service } = build(lateUtc);
    expect((await service.create(base)).birthDate).toBeNull();
  });
});
