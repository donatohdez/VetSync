import type { Pool } from "mysql2/promise";
import { rows, transaction } from "../../../shared/database.js";
import { AppError, notFound } from "../../../shared/errors.js";
import type {
  Appointment,
  AppointmentRepository,
} from "../domain/appointment.js";
export class MysqlAppointments implements AppointmentRepository {
  constructor(private readonly pool: Pool) {}
  async reserve(a: Appointment): Promise<void> {
    await transaction(this.pool, async (connection) => {
      // Serializa todas las reservas del mismo veterinario, incluso si no hay citas todavía.
      const vet = await rows(
        connection,
        "SELECT id FROM veterinarians WHERE id=? AND active=TRUE FOR UPDATE",
        [a.veterinarianId],
      );
      if (!vet.length) throw notFound("El veterinario activo");
      const pet = await rows(connection, "SELECT id FROM pets WHERE id=?", [
        a.petId,
      ]);
      if (!pet.length) throw notFound("La mascota");
      // READ COMMITTED: ve la reserva confirmada por la transacción que acaba de liberar el bloqueo.
      const conflicts = await rows(
        connection,
        "SELECT id FROM appointments WHERE veterinarian_id=? AND starts_at < ? AND ends_at > ? LIMIT 1",
        [a.veterinarianId, a.endsAt, a.startsAt],
      );
      if (conflicts.length)
        throw new AppError(
          "APPOINTMENT_CONFLICT",
          "El veterinario ya tiene una cita en ese intervalo.",
          409,
        );
      await connection.execute(
        "INSERT INTO appointments (id,pet_id,veterinarian_id,starts_at,ends_at,reason) VALUES (?,?,?,?,?,?)",
        [a.id, a.petId, a.veterinarianId, a.startsAt, a.endsAt, a.reason],
      );
    });
  }
  list(): Promise<Appointment[]> {
    return rows(
      this.pool,
      "SELECT id,pet_id AS petId,veterinarian_id AS veterinarianId,starts_at AS startsAt,ends_at AS endsAt,reason FROM appointments ORDER BY starts_at,id",
    );
  }
}
