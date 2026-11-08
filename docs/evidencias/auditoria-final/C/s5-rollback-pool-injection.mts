import { makePool, guard, rows, seed, cleanup, check, failCount, MysqlAppointments, slotAt, http, startServer, waitServer, stopServer, overlapCount } from "./lib.mts";
const pool = makePool();
await guard(pool);
const repo = new MysqlAppointments(pool);
const server = startServer(); console.log("servidor propio PID", server.pid);
const MIN = 60000;
const body = (pet: string, vet: string, s: Date, reason = "x") => ({ petId: pet, veterinarianId: vet, startsAt: s.toISOString(), endsAt: new Date(s.getTime() + 30 * MIN).toISOString(), reason });
const createdOwners: string[] = [], createdPets: string[] = [];
import { execFileSync } from "node:child_process";
// El usuario de la app no tiene privilegio PROCESS: consulta de SOLO LECTURA como root del contenedor local (docker compose exec).
const rootSql = (sql: string) => Number(execFileSync("docker", ["compose", "exec", "-T", "-e", "MYSQL_PWD=vetsync_root_local_only", "mysql", "mysql", "-uroot", "-N", "-B", "-e", sql], { cwd: "/Users/donato/Ago-Dic 2026/Fun de IA/VetSync" }).toString().trim());
const trx = async () => rootSql("SELECT COUNT(*) FROM information_schema.INNODB_TRX");
try {
  await waitServer();
  await cleanup(pool); await seed(pool);
  console.log("== Control negativo: check-then-insert SIN transacción/bloqueo (demuestra que la prueba detecta carreras)");
  {
    let dupRounds = 0;
    for (let r = 0; r < 20; r++) {
      const s = slotAt(300 + r, "12:00"), e = new Date(s.getTime() + 30 * MIN);
      await Promise.all(Array.from({ length: 10 }, async (_, i) => {
        const c = await rows<any>(pool, "SELECT id FROM appointments WHERE veterinarian_id='aud-vet-9' AND starts_at<? AND ends_at>? LIMIT 1", [e, s]);
        if (!c.length) await pool.execute("INSERT INTO appointments (id,pet_id,veterinarian_id,starts_at,ends_at,reason) VALUES (?,?,?,?,?,?)", [`aud-neg-${r}-${i}`, "aud-pet", "aud-vet-9", s, e, "neg"]);
      }));
      if ((await overlapCount(pool)) > 0) dupRounds++;
      await pool.execute("DELETE FROM appointments WHERE id LIKE 'aud-neg-%'");
    }
    check("control negativo: sin lock aparecen dobles reservas (la prueba sí detecta carreras)", dupRounds > 0, `rondas con doble reserva: ${dupRounds}/20`);
  }

  console.log("== Rollback / bloqueos");
  const s = slotAt(400, "12:00");
  let r = await http("POST", "/appointments", body("aud-no-pet", "aud-vet-1", s));
  check("mascota inexistente -> 404", r.status === 404, `${r.status}`);
  check("sin fila tras el fallo", Number((await rows<any>(pool, "SELECT COUNT(*) c FROM appointments WHERE veterinarian_id='aud-vet-1' AND starts_at=?", [s]))[0].c) === 0);
  check("sin transacciones InnoDB abiertas tras el fallo", (await trx()) === 0, String(await trx()));
  r = await http("POST", "/appointments", body("aud-pet", "aud-vet-1", s));
  check("reserva inmediata del mismo vet/horario tras el fallo -> 201 (no hay bloqueo colgado)", r.status === 201, `${r.status}`);
  // fallo DESPUÉS de obtener el bloqueo y pasar el conflicto: INSERT con reason demasiado largo
  const s2 = slotAt(401, "12:00");
  let code = "";
  try { await repo.reserve({ id: "aud-rb-1", petId: "aud-pet", veterinarianId: "aud-vet-1", startsAt: s2, endsAt: new Date(s2.getTime() + 30 * MIN), reason: "x".repeat(600) }); } catch (e: any) { code = e.code; }
  check("INSERT falla tras el bloqueo (ER_DATA_TOO_LONG) -> error propagado", code === "ER_DATA_TOO_LONG", code);
  check("sin fila ni trx abierta tras fallo del INSERT", Number((await rows<any>(pool, "SELECT COUNT(*) c FROM appointments WHERE id='aud-rb-1'"))[0].c) === 0 && (await trx()) === 0);
  const t0 = performance.now();
  await repo.reserve({ id: "aud-rb-2", petId: "aud-pet", veterinarianId: "aud-vet-1", startsAt: s2, endsAt: new Date(s2.getTime() + 30 * MIN), reason: "ok" });
  check("nueva reserva del mismo vet tras fallo no espera bloqueo", performance.now() - t0 < 1000, `${(performance.now() - t0).toFixed(0)} ms`);

  console.log("== Pool: muchas más solicitudes fallidas que connectionLimit=10");
  let non404 = 0, total = 0;
  for (let b = 0; b < 10; b++) {
    const res = await Promise.all(Array.from({ length: 50 }, () => http("POST", "/appointments", body("aud-no-pet", "aud-vet-2", slotAt(410 + b, "12:00")))));
    total += res.length; non404 += res.filter((x) => x.status !== 404).length;
  }
  check(`${total} solicitudes fallidas (en tandas de 50 concurrentes) -> todas 404`, non404 === 0, `distintas de 404: ${non404}`);
  const h = await http("GET", "/health"); check("servicio sigue respondiendo (/health)", h.status === 200);
  r = await http("POST", "/appointments", body("aud-pet", "aud-vet-2", slotAt(430, "12:00"))); check("reserva válida tras la avalancha -> 201", r.status === 201, `${r.status}`);
  // fallos tras bloqueo, concurrentes, vía repo
  const res = await Promise.allSettled(Array.from({ length: 60 }, (_, i) => repo.reserve({ id: `aud-rb-l${i}`, petId: "aud-pet", veterinarianId: "aud-vet-3", startsAt: slotAt(431, "12:00"), endsAt: new Date(slotAt(431, "12:00").getTime() + 30 * MIN), reason: "x".repeat(600) })));
  check("60 fallos de INSERT concurrentes (tras bloqueo) -> todos ER_DATA_TOO_LONG", res.every((x) => x.status === "rejected" && (x.reason as any).code === "ER_DATA_TOO_LONG"));
  r = await http("POST", "/appointments", body("aud-pet", "aud-vet-3", slotAt(431, "12:00"))); check("servicio sigue aceptando reservas del mismo vet", r.status === 201, `${r.status}`);
  const hs = await Promise.all(Array.from({ length: 30 }, () => http("GET", "/health")));
  check("30 /health concurrentes OK", hs.every((x) => x.status === 200));
  console.log("conexiones abiertas a vetsync_test (mi script + servidor, máx esperado ≤ 20):", rootSql("SELECT COUNT(*) FROM information_schema.PROCESSLIST WHERE DB='vetsync_test'"));
  check("sin trx abiertas al final", (await trx()) === 0);

  console.log("== Inyección: cargas hostiles por la API (valores parametrizados)");
  const payloads = ["O'Brien", "x'); DROP TABLE owners; --", "Robert'); DROP TABLE appointments;--", "<script>alert(1)</script>", "\" OR \"1\"=\"1", "a\\' OR 1=1 -- ", "%_ LIKE", "😀 ñ áéí"];
  const before = Number((await rows<any>(pool, "SELECT COUNT(*) c FROM information_schema.TABLES WHERE TABLE_SCHEMA='vetsync_test'"))[0].c);
  let okAll = true;
  for (const [i, p] of payloads.entries()) {
    const o = await http("POST", "/owners", { name: p, email: `aud-inj${i}@example.test`, phone: "555" });
    if (o.status !== 201) { okAll = false; console.log("  owner", i, o.status, o.json?.error); continue; }
    createdOwners.push(o.json.id);
    const pe = await http("POST", "/pets", { ownerId: o.json.id, name: p, species: p, breed: p });
    if (pe.status !== 201) { okAll = false; console.log("  pet", i, pe.status, pe.json?.error); continue; }
    createdPets.push(pe.json.id);
    const when = slotAt(500 + i, "12:00");
    const ap = await http("POST", "/appointments", body(pe.json.id, "aud-vet-4", when, p)); if (ap.status !== 201) { okAll = false; console.log("  cita", i, ap.status); }
    const mr = await http("POST", `/pets/${pe.json.id}/medical-records`, { veterinarianId: "aud-vet-4", recordedAt: new Date(Date.now() - 60000).toISOString(), clinicalNote: p });
    if (mr.status !== 201) { okAll = false; console.log("  nota", i, mr.status, mr.json?.error); }
    const back = await rows<any>(pool, "SELECT o.name oname, p.name pname, p.species ps, (SELECT reason FROM appointments WHERE pet_id=p.id) reason, (SELECT clinical_note FROM medical_records WHERE pet_id=p.id) note FROM pets p JOIN owners o ON o.id=p.owner_id WHERE p.id=?", [pe.json.id]);
    const b = back[0]; if (!b || b.oname !== p.trim() || b.pname !== p.trim() || b.reason !== p.trim() || b.note !== p.trim()) { okAll = false; console.log("  no coincide", i, JSON.stringify(b)); }
  }
  check("8 cargas hostiles guardadas y recuperadas literalmente (dueño, mascota, motivo, nota)", okAll);
  const after = Number((await rows<any>(pool, "SELECT COUNT(*) c FROM information_schema.TABLES WHERE TABLE_SCHEMA='vetsync_test'"))[0].c);
  check("ninguna tabla eliminada", before === after, `${before} -> ${after}`);
  const lst = await http("GET", "/owners"); check("GET /owners devuelve JSON con el texto sin interpretar", lst.status === 200 && lst.json.some((x: any) => x.name === "<script>alert(1)</script>"));
  const bad = await http("GET", `/appointments/availability?date=2027-01-01' OR '1'='1&veterinarianId=aud-vet-1`); check("parámetro de query hostil (date) -> 400", bad.status === 400, `${bad.status}`);
  const bad2 = await http("GET", `/appointments/availability?date=2027-01-01&veterinarianId=${encodeURIComponent("x' OR '1'='1")}`); check("veterinarianId hostil -> 404 (no inyecta)", bad2.status === 404, `${bad2.status}`);
  const bad3 = await http("GET", `/pets/${encodeURIComponent("x' OR '1'='1")}/medical-records`); check("petId hostil en ruta -> lista vacía o 404, sin 500", bad3.status !== 500, `${bad3.status}`);
} finally {
  await stopServer(server);
  await cleanup(pool, createdOwners, createdPets);
  const left = await rows<any>(pool, "SELECT (SELECT COUNT(*) FROM owners WHERE email LIKE 'aud-inj%') c");
  console.log("restos aud-inj tras limpieza:", left[0].c);
  await pool.end();
  console.log("servidor detenido, exitCode:", server.exitCode);
}
console.log(`FALLOS: ${failCount()}`);
process.exit(failCount() ? 1 : 0);
