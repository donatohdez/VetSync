import { makePool, guard, rows, seed, cleanup, check, failCount, MysqlAppointments, slotAt, http, startServer, waitServer, stopServer, overlapCount } from "./lib.mts";
const pool = makePool();
await guard(pool);
const repo = new MysqlAppointments(pool);
const server = startServer(); console.log("servidor propio PID", server.pid);
try {
  await waitServer();
  await cleanup(pool); await seed(pool);
  let n = 0;
  const mk = (vet: string, s: Date, e: Date) => ({ id: `aud-ap-${++n}`, petId: "aud-pet", veterinarianId: vet, startsAt: s, endsAt: e, reason: "matriz" });
  const ms = (d: Date, off: number) => new Date(d.getTime() + off);
  const MIN = 60000;
  console.log("== Matriz de solapamientos: repositorio MysqlAppointments (SQL real), base 12:00-12:30 vet-1");
  type Case = [string, number, number, boolean, string?];
  // [nombre, offset inicio ms desde 12:00, offset fin ms desde 12:00, esperadoAceptado, vet]
  const cases: Case[] = [
    ["idéntica 12:00-12:30", 0, 30 * MIN, false],
    ["contenida 12:05-12:25", 5 * MIN, 25 * MIN, false],
    ["envolvente 11:30-13:00", -30 * MIN, 60 * MIN, false],
    ["parcial inicio 11:45-12:15", -15 * MIN, 15 * MIN, false],
    ["parcial fin 12:15-12:45", 15 * MIN, 45 * MIN, false],
    ["contigua antes 11:30-12:00", -30 * MIN, 0, true],
    ["contigua después 12:30-13:00", 30 * MIN, 60 * MIN, true],
    ["1 ms de solape al inicio (11:30:00.001-12:00:00.001)", -30 * MIN + 1, 1, false],
    ["1 ms de solape al final (12:29:59.999-12:59:59.999)", 30 * MIN - 1, 60 * MIN - 1, false],
    ["1 ms antes sin solape (11:29:59.999-11:59:59.999)", -30 * MIN - 1, -1, true],
    ["1 ms después sin solape (12:30:00.001-13:00:00.001)", 30 * MIN + 1, 60 * MIN + 1, true],
    ["mismo horario, vet distinto", 0, 30 * MIN, true, "aud-vet-2"],
  ];
  for (const [i, [name, a, b, accept, vet]] of cases.entries()) {
    const day = i; // día distinto por caso => aislamiento
    const base = slotAt(day, "12:00");
    await repo.reserve(mk("aud-vet-1", base, ms(base, 30 * MIN)));
    let accepted = true, code = "";
    try { await repo.reserve(mk(vet ?? "aud-vet-1", ms(base, a), ms(base, b))); } catch (e: any) { accepted = false; code = e.code ?? e.message; }
    check(`repo: ${name} -> ${accepted ? "aceptada" : "rechazada " + code}`, accepted === accept && (accept || code === "APPOINTMENT_CONFLICT"));
  }
  check("JOIN: sin solapes en BD tras la matriz (excluye casos 1ms que sí deben rechazarse)", (await overlapCount(pool)) === 0);
  // intervalo cero/negativo directo al repo
  {
    const base = slotAt(20, "12:00");
    let code = "";
    try { await repo.reserve(mk("aud-vet-1", base, base)); } catch (e: any) { code = e.code ?? e.message; }
    check("repo: fin == inicio (sin validación de dominio) lo frena el CHECK", code === "ER_CHECK_CONSTRAINT_VIOLATED", code);
  }
  console.log("== Endpoint HTTP: validaciones de horario ANTES del SQL (rechazo por dominio, no por detección SQL)");
  const post = (s: Date, e: Date, vet = "aud-vet-3") => http("POST", "/appointments", { petId: "aud-pet", veterinarianId: vet, startsAt: s.toISOString(), endsAt: e.toISOString(), reason: "http" });
  const d = (k: number) => slotAt(30 + k, "12:00");
  const t0 = d(0);
  let r = await post(t0, ms(t0, 30 * MIN)); check("HTTP: cita válida 201", r.status === 201, String(r.status));
  r = await post(t0, ms(t0, 30 * MIN)); check("HTTP: misma cita -> 409 APPOINTMENT_CONFLICT", r.status === 409 && r.json.error.code === "APPOINTMENT_CONFLICT", `${r.status}`);
  r = await post(ms(t0, 15 * MIN), ms(t0, 45 * MIN)); check("HTTP: inicio 12:15 (no múltiplo de 30) -> 400 por dominio", r.status === 400, `${r.status} ${r.json?.error?.code}`);
  r = await post(ms(t0, 1), ms(t0, 30 * MIN + 1)); check("HTTP: +1 ms -> 400 (milisegundos)", r.status === 400, `${r.status}`);
  r = await post(t0, ms(t0, 60 * MIN)); check("HTTP: duración 60 min -> 400", r.status === 400, `${r.status}`);
  r = await post(t0, ms(t0, 15 * MIN)); check("HTTP: duración 15 min -> 400", r.status === 400, `${r.status}`);
  r = await post(ms(t0, 30 * MIN), t0); check("HTTP: fin<inicio -> 400", r.status === 400, `${r.status}`);
  r = await post(slotAt(31, "09:30"), slotAt(31, "10:00")); check("HTTP: 09:30 -> 400", r.status === 400, `${r.status}`);
  r = await post(slotAt(31, "17:30"), slotAt(31, "18:00")); check("HTTP: 17:30-18:00 (último bloque) -> 201", r.status === 201, `${r.status}`);
  r = await post(slotAt(31, "18:00"), slotAt(31, "18:30")); check("HTTP: 18:00 -> 400", r.status === 400, `${r.status}`);
  r = await post(slotAt(31, "10:00"), slotAt(31, "10:30")); check("HTTP: 10:00-10:30 (primer bloque) -> 201", r.status === 201, `${r.status}`);
  r = await post(ms(t0, -30 * MIN), t0); check("HTTP: contigua antes 11:30-12:00 mismo vet -> 201", r.status === 201, `${r.status}`);
  r = await post(ms(t0, 30 * MIN), ms(t0, 60 * MIN)); check("HTTP: contigua después 12:30-13:00 -> 201", r.status === 201, `${r.status}`);
  r = await post(t0, ms(t0, 30 * MIN), "aud-vet-4"); check("HTTP: mismo horario, otro vet -> 201", r.status === 201, `${r.status}`);
  r = await post(new Date("2020-01-01T18:00:00Z"), new Date("2020-01-01T18:30:00Z")); check("HTTP: pasado -> 400", r.status === 400, `${r.status}`);
  r = await post(t0, ms(t0, 30 * MIN), "aud-no-vet"); check("HTTP: vet inexistente -> 404", r.status === 404, `${r.status}`);
  console.log("== Disponibilidad previa no impide el 409");
  const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Hermosillo" }).format(slotAt(40, "12:00"));
  const av1 = await http("GET", `/appointments/availability?date=${dateStr}&veterinarianId=aud-vet-5`);
  const slot12 = av1.json.find((s: any) => s.time === "12:00");
  check("disponibilidad: 12:00 libre antes", slot12.available === true);
  const t1 = slotAt(40, "12:00");
  const first = await post(t1, ms(t1, 30 * MIN), "aud-vet-5");
  check("otra reserva toma el hueco (201)", first.status === 201);
  const second = await post(t1, ms(t1, 30 * MIN), "aud-vet-5"); // el cliente aún cree que estaba libre
  check("POST con disponibilidad obsoleta -> 409", second.status === 409 && second.json.error.code === "APPOINTMENT_CONFLICT");
  const av2 = await http("GET", `/appointments/availability?date=${dateStr}&veterinarianId=aud-vet-5`);
  check("disponibilidad: 12:00 ahora occupied", av2.json.find((s: any) => s.time === "12:00").reason === "occupied");
  check("disponibilidad devuelve 16 bloques", av2.json.length === 16, String(av2.json.length));
  check("JOIN final: sin solapes", (await overlapCount(pool)) === 0);
} finally {
  await stopServer(server);
  const r = await rows<any>(pool, "SELECT COUNT(*) c FROM appointments WHERE veterinarian_id LIKE 'aud-%'");
  await cleanup(pool);
  console.log("citas aud- creadas (borradas):", r[0].c, "| servidor detenido, exitCode:", server.exitCode);
  await pool.end();
}
console.log(`FALLOS: ${failCount()}`);
process.exit(failCount() ? 1 : 0);
