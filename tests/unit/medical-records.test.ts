import { describe, it, expect } from "vitest";
import { MedicalRecords } from "../../src/modules/medical-records/application/medical-records.js";
import type {
  MedicalRecord,
  MedicalRecordRepository,
} from "../../src/modules/medical-records/domain/medical-record.js";

const petId = "22222222-2222-4222-8222-222222222222";
class MemoryRecords implements MedicalRecordRepository {
  records: MedicalRecord[] = [];
  async create(r: MedicalRecord): Promise<void> {
    this.records.push(r);
  }
  async list(id: string): Promise<MedicalRecord[]> {
    return this.records.filter((r) => r.petId === id);
  }
}
const repo = new MemoryRecords();
const service = new MedicalRecords(
  repo,
  {
    petExists: async (id) => id === petId,
    veterinarianExists: async () => true,
  },
  { now: () => new Date("2026-11-08T19:00:00Z") },
);
const input = {
  veterinarianId: "vet",
  recordedAt: "2026-11-08T14:00:00Z",
  clinicalNote: "Control.",
};

describe("identificador de mascota normalizado (F-07)", () => {
  it("guarda y consulta con el identificador recortado", async () => {
    const created = await service.create(`  ${petId} `, input);
    expect(created.petId).toBe(petId);
    expect(repo.records[0]?.petId).toBe(petId);
    expect(await service.list(` ${petId}  `)).toHaveLength(1);
  });
  it("sigue rechazando identificadores vacíos o inexistentes", async () => {
    await expect(service.list("   ")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    await expect(service.list("otra")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
