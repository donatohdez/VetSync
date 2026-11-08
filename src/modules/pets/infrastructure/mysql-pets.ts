import type { Pool } from "mysql2/promise";
import { rows } from "../../../shared/database.js";
import type { Pet, PetRepository } from "../domain/pet.js";
export class MysqlPets implements PetRepository {
  constructor(private readonly pool: Pool) {}
  async create(p: Pet): Promise<void> {
    await this.pool.execute(
      "INSERT INTO pets (id,owner_id,name,species,breed,birth_date) VALUES (?,?,?,?,?,?)",
      [p.id, p.ownerId, p.name, p.species, p.breed, p.birthDate],
    );
  }
  list(): Promise<Pet[]> {
    return rows(
      this.pool,
      "SELECT id,owner_id AS ownerId,name,species,breed,DATE_FORMAT(birth_date,'%Y-%m-%d') AS birthDate FROM pets ORDER BY name,id",
    );
  }
  async exists(id: string): Promise<boolean> {
    return (
      (await rows(this.pool, "SELECT id FROM pets WHERE id=?", [id])).length > 0
    );
  }
  async ownerExists(id: string): Promise<boolean> {
    return (
      (await rows(this.pool, "SELECT id FROM owners WHERE id=?", [id])).length >
      0
    );
  }
}
