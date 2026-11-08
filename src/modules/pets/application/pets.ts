import { randomUUID } from "node:crypto";
import { z } from "zod";
import { calendarDay, type Clock } from "../../../shared/clock.js";
import { AppError, notFound } from "../../../shared/errors.js";
import { parse, text, idSchema } from "../../../shared/validation.js";
import type { Pet, PetRepository } from "../domain/pet.js";
const schema = z
  .object({
    ownerId: idSchema,
    name: text(120),
    species: text(60),
    breed: text(100).nullable().optional(),
    birthDate: z.iso.date().nullable().optional(),
  })
  .strict();
// Cota técnica, no de negocio: la columna DATE de MySQL admite desde 1000-01-01.
const minBirthDate = "1000-01-01";
export class Pets {
  constructor(
    private readonly repository: PetRepository,
    private readonly clock: Clock,
    private readonly timeZone: string = "America/Hermosillo",
  ) {}
  async create(input: unknown): Promise<Pet> {
    const data = parse(schema, input);
    if (data.birthDate) {
      // Se compara con el día de calendario de la clínica, no con el día UTC.
      if (data.birthDate > calendarDay(this.clock.now(), this.timeZone))
        throw new AppError(
          "VALIDATION_ERROR",
          "La fecha de nacimiento no puede estar en el futuro.",
        );
      if (data.birthDate < minBirthDate)
        throw new AppError(
          "VALIDATION_ERROR",
          "La fecha de nacimiento no puede ser anterior al año 1000.",
        );
    }
    if (!(await this.repository.ownerExists(data.ownerId)))
      throw notFound("El dueño");
    const pet = {
      ...data,
      id: randomUUID(),
      breed: data.breed ?? null,
      birthDate: data.birthDate ?? null,
    };
    await this.repository.create(pet);
    return pet;
  }
  list(): Promise<Pet[]> {
    return this.repository.list();
  }
}
