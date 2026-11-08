import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Clock } from "../../../shared/clock.js";
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
export class Pets {
  constructor(
    private readonly repository: PetRepository,
    private readonly clock: Clock,
  ) {}
  async create(input: unknown): Promise<Pet> {
    const data = parse(schema, input);
    if (
      data.birthDate &&
      data.birthDate > this.clock.now().toISOString().slice(0, 10)
    )
      throw new AppError(
        "VALIDATION_ERROR",
        "La fecha de nacimiento no puede estar en el futuro.",
      );
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
