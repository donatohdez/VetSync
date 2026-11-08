import type { Pool } from "mysql2/promise";
import { rows } from "../../../shared/database.js";
import type {
  Veterinarian,
  VeterinarianRepository,
} from "../domain/veterinarian.js";
export class MysqlVeterinarians implements VeterinarianRepository {
  constructor(private readonly pool: Pool) {}
  list(): Promise<Veterinarian[]> {
    return rows(
      this.pool,
      "SELECT id,name FROM veterinarians WHERE active=TRUE ORDER BY name,id",
    );
  }
  async exists(id: string): Promise<boolean> {
    return (
      (
        await rows(
          this.pool,
          "SELECT id FROM veterinarians WHERE id=? AND active=TRUE",
          [id],
        )
      ).length > 0
    );
  }
}
