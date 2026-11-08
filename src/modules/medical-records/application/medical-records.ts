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
  // El identificador de la ruta se normaliza (recorte de espacios) igual que
  // el resto de los IDs y ese valor es el que se valida y se persiste.
  private async requirePet(rawPetId: string): Promise<string> {
    const petId = parse(idSchema, rawPetId);
    if (!(await this.references.petExists(petId))) throw notFound("La mascota");
    return petId;
  }
  async create(rawPetId: string, input: unknown): Promise<MedicalRecord> {
    const data = parse(schema, input);
    const recordedAt = new Date(data.recordedAt);
    if (recordedAt > this.clock.now())
      throw new AppError(
        "VALIDATION_ERROR",
        "El historial no puede tener una fecha futura.",
      );
    const petId = await this.requirePet(rawPetId);
    if (!(await this.references.veterinarianExists(data.veterinarianId)))
      throw notFound("El veterinario");
    const record = { ...data, id: randomUUID(), petId, recordedAt };
    await this.repository.create(record);
    return record;
  }
  async list(rawPetId: string): Promise<MedicalRecord[]> {
    const petId = await this.requirePet(rawPetId);
    return this.repository.list(petId);
  }
}
