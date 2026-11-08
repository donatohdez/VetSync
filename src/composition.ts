import { ListAvailability } from "./modules/appointments/application/list-availability.js";
import type { Pool } from "mysql2/promise";
import type { Clock } from "./shared/clock.js";
import { createApp } from "./http/app.js";
import { MysqlOwners } from "./modules/owners/infrastructure/mysql-owners.js";
import { Owners } from "./modules/owners/application/owners.js";
import { MysqlPets } from "./modules/pets/infrastructure/mysql-pets.js";
import { Pets } from "./modules/pets/application/pets.js";
import { MysqlVeterinarians } from "./modules/veterinarians/infrastructure/mysql-veterinarians.js";
import { MysqlMedicalRecords } from "./modules/medical-records/infrastructure/mysql-medical-records.js";
import { MedicalRecords } from "./modules/medical-records/application/medical-records.js";
import { MysqlAppointments } from "./modules/appointments/infrastructure/mysql-appointments.js";
import { ScheduleAppointment } from "./modules/appointments/application/schedule-appointment.js";
import { MysqlReminders } from "./modules/notifications/infrastructure/mysql-reminders.js";
import { SendReminders } from "./modules/notifications/application/send-reminders.js";
export function composeServices(
  pool: Pool,
  clock: Clock,
  reminderHours: number,
  timeZone: string = "America/Hermosillo",
) {
  const pets = new MysqlPets(pool),
    veterinarians = new MysqlVeterinarians(pool),
    appointments = new MysqlAppointments(pool),
    reminders = new MysqlReminders(pool);
  return {
    owners: new Owners(new MysqlOwners(pool)),
    pets: new Pets(pets, clock, timeZone),
    veterinarians,
    appointments,
    reminders,
    medicalRecords: new MedicalRecords(
      new MysqlMedicalRecords(pool),
      {
        petExists: (id) => pets.exists(id),
        veterinarianExists: (id) => veterinarians.exists(id),
      },
      clock,
    ),
    schedule: new ScheduleAppointment(appointments, clock, timeZone),
    availability: new ListAvailability(
      appointments,
      veterinarians,
      clock,
      timeZone,
    ),
    sendReminders: new SendReminders(reminders, clock, reminderHours, timeZone),
    health: async () => {
      await pool.query("SELECT 1");
    },
  };
}
export function buildApplication(
  pool: Pool,
  clock: Clock,
  options: { timeZone: string; reminderHours: number },
) {
  return createApp(
    composeServices(pool, clock, options.reminderHours, options.timeZone),
    options,
  );
}
