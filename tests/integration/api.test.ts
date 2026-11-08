import { beforeAll, beforeEach, afterAll, it, expect, vi } from "vitest";
import request from "supertest";
import { config } from "../../src/shared/config.js";
import { database, rows } from "../../src/shared/database.js";
import { buildApplication, composeServices } from "../../src/composition.js";
const pool = database({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: "vetsync_test",
});
const now = new Date("2026-11-08T15:00:00Z");
const app = buildApplication(
  pool,
  { now: () => now },
  { timeZone: "America/Hermosillo", reminderHours: 24 },
);
const ownerId = "11111111-1111-4111-8111-111111111111";
const petId = "22222222-2222-4222-8222-222222222222";
const vetId = "33333333-3333-4333-8333-333333333333";
const secondVet = "44444444-4444-4444-8444-444444444444";
const missingId = "99999999-9999-4999-8999-999999999999";
const appointment = {
  petId,
  veterinarianId: vetId,
  startsAt: "2026-11-09T10:00:00Z",
  endsAt: "2026-11-09T10:30:00Z",
  reason: "Revisión",
};
beforeAll(async () => {
  const names = await rows<{ name: string }>(pool, "SELECT DATABASE() AS name");
  if (names[0]?.name !== "vetsync_test")
    throw new Error("Base de pruebas incorrecta");
});
beforeEach(async () => {
  for (const table of [
    "notification_logs",
    "medical_records",
    "appointments",
    "pets",
    "veterinarians",
    "owners",
  ])
    await pool.query(`DELETE FROM ${table}`);
  await pool.execute("INSERT INTO owners (id,name,email) VALUES (?,?,?)", [
    ownerId,
    "Dueña de prueba",
    "duena@example.test",
  ]);
  await pool.execute(
    "INSERT INTO pets (id,owner_id,name,species) VALUES (?,?,?,?)",
    [petId, ownerId, "Luna", "Perro"],
  );
  await pool.execute("INSERT INTO veterinarians (id,name) VALUES (?,?),(?,?)", [
    vetId,
    "Dra. Elena",
    secondVet,
    "Dr. Mateo",
  ]);
});
afterAll(async () => {
  await pool.end();
});
it("crea dueños y mascotas, valida asociaciones y consulta listas", async () => {
  const owner = await request(app)
    .post("/api/owners")
    .send({
      name: "Ana Demo",
      email: "ana@example.test",
      phone: "662 000 0000",
    })
    .expect(201);
  const pet = await request(app)
    .post("/api/pets")
    .send({
      ownerId: owner.body.id,
      name: "Milo",
      species: "Gato",
      breed: "Criollo",
      birthDate: "2024-05-10",
    })
    .expect(201);
  expect(pet.body.ownerId).toBe(owner.body.id);
  expect((await request(app).get("/api/owners").expect(200)).body).toHaveLength(
    2,
  );
  expect((await request(app).get("/api/pets").expect(200)).body).toHaveLength(
    2,
  );
  expect(
    (await request(app).get("/api/veterinarians").expect(200)).body,
  ).toHaveLength(2);
  await request(app)
    .post("/api/pets")
    .send({ ownerId: missingId, name: "Nube", species: "Gato" })
    .expect(404);
});
it("rechaza entradas malformadas sin persistir", async () => {
  await request(app)
    .post("/api/owners")
    .send({ name: "", email: "mal" })
    .expect(400);
  await request(app)
    .post("/api/pets")
    .send({ ownerId, name: "Luna", species: "Perro", birthDate: "2026-02-30" })
    .expect(400);
  await request(app)
    .post("/api/pets")
    .send({ ownerId, name: "Luna", species: "Perro", birthDate: "2099-01-01" })
    .expect(400);
  await request(app)
    .post("/api/appointments")
    .send({ ...appointment, startsAt: "2026-11-09T10:00:00" })
    .expect(400);
  expect(await rows(pool, "SELECT * FROM owners")).toHaveLength(1);
});
it("agrega historial y lo aísla por mascota, con orden cronológico", async () => {
  const newer = await request(app)
    .post(`/api/pets/${petId}/medical-records`)
    .send({
      veterinarianId: vetId,
      recordedAt: "2026-11-08T14:00:00Z",
      clinicalNote: "Revisión general sin novedades.",
    })
    .expect(201);
  await request(app)
    .post(`/api/pets/${petId}/medical-records`)
    .send({
      veterinarianId: vetId,
      recordedAt: "2026-11-01T14:00:00Z",
      clinicalNote: "Vacunación.",
    })
    .expect(201);
  const result = await request(app)
    .get(`/api/pets/${petId}/medical-records`)
    .expect(200);
  expect(result.body).toHaveLength(2);
  expect(result.body[0].id).toBe(newer.body.id);
  const other = await request(app)
    .post("/api/pets")
    .send({ ownerId, name: "Milo", species: "Gato" })
    .expect(201);
  expect(
    (
      await request(app)
        .get(`/api/pets/${other.body.id}/medical-records`)
        .expect(200)
    ).body,
  ).toEqual([]);
  await request(app).get(`/api/pets/${missingId}/medical-records`).expect(404);
  await request(app)
    .post(`/api/pets/${petId}/medical-records`)
    .send({
      veterinarianId: missingId,
      recordedAt: now.toISOString(),
      clinicalNote: "Nota",
    })
    .expect(404);
  await request(app)
    .post(`/api/pets/${petId}/medical-records`)
    .send({
      veterinarianId: vetId,
      recordedAt: "2026-11-10T14:00:00Z",
      clinicalNote: "Nota futura",
    })
    .expect(400);
});
it("reserva, rechaza conflicto y permite otro veterinario/citas contiguas", async () => {
  await request(app).post("/api/appointments").send(appointment).expect(201);
  const conflict = await request(app)
    .post("/api/appointments")
    .send({ ...appointment, startsAt: "2026-11-09T10:15:00Z" })
    .expect(409);
  expect(conflict.body.error.code).toBe("APPOINTMENT_CONFLICT");
  await request(app)
    .post("/api/appointments")
    .send({ ...appointment, veterinarianId: secondVet })
    .expect(201);
  await request(app)
    .post("/api/appointments")
    .send({
      ...appointment,
      startsAt: appointment.endsAt,
      endsAt: "2026-11-09T11:00:00Z",
    })
    .expect(201);
  expect(
    (await request(app).get("/api/appointments").expect(200)).body,
  ).toHaveLength(3);
});
it("rechaza mascota/veterinario inexistentes o inactivo sin crear citas", async () => {
  await request(app)
    .post("/api/appointments")
    .send({ ...appointment, petId: missingId })
    .expect(404);
  await request(app)
    .post("/api/appointments")
    .send({ ...appointment, veterinarianId: missingId })
    .expect(404);
  await pool.execute("UPDATE veterinarians SET active=FALSE WHERE id=?", [
    vetId,
  ]);
  await request(app).post("/api/appointments").send(appointment).expect(404);
  expect(await rows(pool, "SELECT * FROM appointments")).toHaveLength(0);
});
it("dos solicitudes concurrentes incompatibles: una confirma y otra recibe 409", async () => {
  const responses = await Promise.all([
    request(app).post("/api/appointments").send(appointment),
    request(app).post("/api/appointments").send(appointment),
  ]);
  expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
  expect(await rows(pool, "SELECT * FROM appointments")).toHaveLength(1);
});
it("simula recordatorios próximos y no duplica con dos ejecuciones concurrentes", async () => {
  const a = await request(app)
    .post("/api/appointments")
    .send(appointment)
    .expect(201);
  const responses = await Promise.all([
    request(app).post("/api/notifications/run").send({}),
    request(app).post("/api/notifications/run").send({}),
  ]);
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  expect(responses.reduce((n, r) => n + r.body.sent, 0)).toBe(1);
  const list = await request(app).get("/api/notifications").expect(200);
  expect(list.body).toHaveLength(1);
  expect(list.body[0].appointmentId).toBe(a.body.id);
  expect(list.body[0].recipient).toBe("duena@example.test");
  expect(
    (await request(app).post("/api/notifications/run").send({}).expect(200))
      .body.sent,
  ).toBe(0);
});
it("usa parámetros SQL incluso si el texto contiene instrucciones SQL", async () => {
  const name = "Demo'); DROP TABLE pets; --";
  await request(app)
    .post("/api/owners")
    .send({ name, email: "sql@example.test" })
    .expect(201);
  expect(
    (await request(app).get("/api/owners").expect(200)).body.some(
      (o: { name: string }) => o.name === name,
    ),
  ).toBe(true);
  expect(await rows(pool, "SELECT * FROM pets")).toHaveLength(1);
});
it("configuración, salud, 404 y JSON malformado tienen respuestas controladas", async () => {
  expect(
    (await request(app).get("/api/config").expect(200)).body.timeZone,
  ).toBe("America/Hermosillo");
  await request(app).get("/api/health").expect(200);
  const missing = await request(app).get("/api/unknown").expect(404);
  expect(missing.body.error.code).toBe("NOT_FOUND");
  await request(app)
    .post("/api/owners")
    .set("Content-Type", "application/json")
    .send("{bad")
    .expect(400);
});
it("rechaza escrituras sin JSON y cargas demasiado grandes", async () => {
  await request(app)
    .post("/api/notifications/run")
    .set("Content-Type", "text/plain")
    .send("run")
    .expect(415);
  const tooLarge = await request(app)
    .post("/api/owners")
    .send({ name: "x".repeat(40000), email: "x@example.test" })
    .expect(413);
  expect(tooLarge.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  await request(app)
    .post("/api/owners")
    .send(["datos incorrectos"])
    .expect(400);
});

it("sirve la interfaz compilada sin exponer archivos TypeScript", async () => {
  const home = await request(app).get("/").expect(200);
  expect(home.text).toContain("Clínica VetSync");
  await request(app).get("/app.js").expect(200);
  await request(app).get("/app.ts").expect(404);
  await request(app).get("/.env").expect(404);
});
it("oculta detalles internos cuando una dependencia falla", async () => {
  const { createApp } = await import("../../src/http/app.js");
  const services = composeServices(pool, { now: () => now }, 24);
  services.health = async () => {
    throw new Error("detalle privado de conexión");
  };
  const failing = createApp(services, {
    timeZone: "America/Hermosillo",
    reminderHours: 24,
  });
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const response = await request(failing).get("/api/health").expect(500);
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
    expect(response.text).not.toContain("detalle privado");
  } finally {
    log.mockRestore();
  }
});
