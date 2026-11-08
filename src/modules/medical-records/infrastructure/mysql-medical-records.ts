import type { Pool } from "mysql2/promise";
import { rows } from "../../../shared/database.js";
import type {
  MedicalRecord,
  MedicalRecordRepository,
} from "../domain/medical-record.js";
export class MysqlMedicalRecords implements MedicalRecordRepository {
  constructor(private readonly pool: Pool) {}
  async create(r: MedicalRecord): Promise<void> {
    await this.pool.execute(
      "INSERT INTO medical_records (id,pet_id,veterinarian_id,recorded_at,clinical_note) VALUES (?,?,?,?,?)",
      [r.id, r.petId, r.veterinarianId, r.recordedAt, r.clinicalNote],
    );
  }
  list(petId: string): Promise<MedicalRecord[]> {
    return rows(
      this.pool,
      "SELECT id,pet_id AS petId,veterinarian_id AS veterinarianId,recorded_at AS recordedAt,clinical_note AS clinicalNote FROM medical_records WHERE pet_id=? ORDER BY recorded_at DESC,id",
      [petId],
    );
  }
}
