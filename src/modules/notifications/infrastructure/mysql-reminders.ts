import type { Pool } from "mysql2/promise";
import { isDuplicate, rows } from "../../../shared/database.js";
import type {
  Reminder,
  ReminderCandidate,
  ReminderRepository,
} from "../domain/reminder.js";
export class MysqlReminders implements ReminderRepository {
  constructor(private readonly pool: Pool) {}
  findUpcoming(after: Date, through: Date): Promise<ReminderCandidate[]> {
    return rows(
      this.pool,
      `SELECT a.id AS appointmentId,o.email AS recipient,p.name AS petName,a.starts_at AS startsAt
  FROM appointments a JOIN pets p ON p.id=a.pet_id JOIN owners o ON o.id=p.owner_id
  WHERE a.starts_at>? AND a.starts_at<=? AND NOT EXISTS (SELECT 1 FROM notification_logs n WHERE n.appointment_id=a.id AND n.type='upcoming')
  ORDER BY a.starts_at,a.id`,
      [after, through],
    );
  }
  async recordOnce(r: Reminder): Promise<boolean> {
    try {
      await this.pool.execute(
        "INSERT INTO notification_logs (id,appointment_id,type,recipient,simulated_at,message) VALUES (?,?,?,?,?,?)",
        [r.id, r.appointmentId, r.type, r.recipient, r.simulatedAt, r.message],
      );
      return true;
    } catch (error) {
      if (isDuplicate(error)) return false;
      throw error;
    }
  }
  list(): Promise<Reminder[]> {
    return rows(
      this.pool,
      "SELECT id,appointment_id AS appointmentId,type,recipient,simulated_at AS simulatedAt,message FROM notification_logs ORDER BY simulated_at DESC,id",
    );
  }
}
