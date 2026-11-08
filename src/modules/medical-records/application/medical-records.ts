import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Clock } from "../../../shared/clock.js";
import { AppError, notFound } from "../../../shared/errors.js";
import {
  parse,
  idSchema,
  instantSchema,
  text,
} from "../../../shared/validation.js";
import type {
  MedicalRecord,
  MedicalRecordRepository,
  ClinicalReferences,
} from "../domain/medical-record.js";
const schema = z
  .object({
    veterinarianId: idSchema,
    recordedAt: instantSchema,
    clinicalNote: text(5000),
  })
  .strict();
export class MedicalRecords {
  constructor(
    private readonly repository: MedicalRecordRepository,
    private readonly references: ClinicalReferences,
    private readonly clock: Clock,
  ) {}
  private async requirePet(petId: string): Promise<void> {
    if (!(await this.references.petExists(parse(idSchema, petId))))
      throw notFound("La mascota");
  }
  async create(petId: string, input: unknown): Promise<MedicalRecord> {
    const data = parse(schema, input);
    const recordedAt = new Date(data.recordedAt);
    if (recordedAt > this.clock.now())
      throw new AppError(
        "VALIDATION_ERROR",
        "El historial no puede tener una fecha futura.",
      );
    await this.requirePet(petId);
    if (!(await this.references.veterinarianExists(data.veterinarianId)))
      throw notFound("El veterinario");
    const record = { ...data, id: randomUUID(), petId, recordedAt };
    await this.repository.create(record);
    return record;
  }
  async list(petId: string): Promise<MedicalRecord[]> {
    await this.requirePet(petId);
    return this.repository.list(petId);
  }
}
