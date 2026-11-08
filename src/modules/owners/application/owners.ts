import { randomUUID } from "node:crypto";
import { z } from "zod";
import { parse, text } from "../../../shared/validation.js";
import type { Owner, OwnerRepository } from "../domain/owner.js";
const schema = z
  .object({
    name: text(120),
    email: z.email().max(254),
    phone: text(30).nullable().optional(),
  })
  .strict();
export class Owners {
  constructor(private readonly repository: OwnerRepository) {}
  async create(input: unknown): Promise<Owner> {
    const data = parse(schema, input);
    const owner = { ...data, id: randomUUID(), phone: data.phone ?? null };
    await this.repository.create(owner);
    return owner;
  }
  list(): Promise<Owner[]> {
    return this.repository.list();
  }
}
