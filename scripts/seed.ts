import { clinicInstant } from "../src/modules/appointments/domain/clinic-hours.js";
import { config } from "../src/shared/config.js";
import { database } from "../src/shared/database.js";
function nextClinicSlot(after: Date): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: config.CLINIC_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(after)
      .map((p) => [p.type, p.value]),
  );
  const day = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`);
  for (let offset = 0; offset < 7; offset++) {
    for (let minute = 600; minute < 1080; minute += 30) {
      const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
      const candidate = clinicInstant(
        day.toISOString().slice(0, 10),
        time,
        config.CLINIC_TIMEZONE,
      );
      if (candidate >= after) return candidate;
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }
  throw new Error(
    "No se pudo generar una cita de demostración dentro del horario de clínica.",
  );
}
const pool = database({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
});
try {
  for (const [id, name] of [
    ["vet-elena", "Dra. Elena Ruiz"],
    ["vet-mateo", "Dr. Mateo Vega"],
    ["vet-sofia", "Dra. Sofía Torres"],
  ] as const)
    await pool.execute(
      "INSERT IGNORE INTO veterinarians (id,name) VALUES (?,?)",
      [id, name],
    );
  for (const [id, name, email, phone] of [
    ["owner-ana", "Ana Martínez", "ana@example.test", "662 000 0101"],
    ["owner-diego", "Diego López", "diego@example.test", "662 000 0102"],
    ["owner-lucia", "Lucía Ramos", "lucia@example.test", "662 000 0103"],
  ] as const)
    await pool.execute(
      "INSERT IGNORE INTO owners (id,name,email,phone) VALUES (?,?,?,?)",
      [id, name, email, phone],
    );
  for (const [id, ownerId, name, species, breed] of [
    ["pet-luna", "owner-ana", "Luna", "Perro", "Golden retriever"],
    ["pet-milo", "owner-diego", "Milo", "Gato", "Doméstico"],
    ["pet-nala", "owner-lucia", "Nala", "Perro", "Mestizo"],
    ["pet-oliver", "owner-ana", "Oliver", "Gato", "Siamés"],
  ] as const)
    await pool.execute(
      "INSERT IGNORE INTO pets (id,owner_id,name,species,breed) VALUES (?,?,?,?,?)",
      [id, ownerId, name, species, breed],
    );
  const now = new Date();
  // Horarios relativos solo en la primera carga; INSERT IGNORE conserva los datos existentes.
  for (const [i, petId, vetId, hours, reason] of [
    [1, "pet-luna", "vet-elena", 2, "Consulta de seguimiento"],
    [2, "pet-milo", "vet-mateo", 4, "Revisión general"],
    [3, "pet-nala", "vet-sofia", 20, "Control de vacunación"],
    [4, "pet-oliver", "vet-elena", 28, "Consulta preventiva"],
  ] as const) {
    const startsAt = nextClinicSlot(new Date(now.getTime() + hours * 3600000));
    await pool.execute(
      "INSERT IGNORE INTO appointments (id,pet_id,veterinarian_id,starts_at,ends_at,reason) VALUES (?,?,?,?,?,?)",
      [
        `seed-appointment-${i}`,
        petId,
        vetId,
        startsAt,
        new Date(startsAt.getTime() + 1800000),
        reason,
      ],
    );
  }
  await pool.execute(
    "INSERT IGNORE INTO medical_records (id,pet_id,veterinarian_id,recorded_at,clinical_note) VALUES (?,?,?,?,?)",
    [
      "seed-record-1",
      "pet-luna",
      "vet-elena",
      new Date(now.getTime() - 86400000),
      "Paciente activa, buen apetito. Se recomienda continuar con el seguimiento preventivo.",
    ],
  );
  console.log(
    "Datos ficticios de demostración disponibles. Las citas iniciales son relativas a esta primera carga.",
  );
} finally {
  await pool.end();
}
