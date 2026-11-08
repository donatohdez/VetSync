import type { Pool } from "mysql2/promise";
import { rows } from "../../../shared/database.js";
import type { Owner, OwnerRepository } from "../domain/owner.js";
export class MysqlOwners implements OwnerRepository {
  constructor(private readonly pool: Pool) {}
  async create(o: Owner): Promise<void> {
    await this.pool.execute(
      "INSERT INTO owners (id,name,email,phone) VALUES (?,?,?,?)",
      [o.id, o.name, o.email, o.phone],
    );
  }
  list(): Promise<Owner[]> {
    return rows(
      this.pool,
      "SELECT id,name,email,phone FROM owners ORDER BY name,id",
    );
  }
}
