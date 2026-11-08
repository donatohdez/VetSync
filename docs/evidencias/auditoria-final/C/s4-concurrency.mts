import { makePool, guard, rows, seed, cleanup, check, failCount, MysqlAppointments, slotAt, http, startServer, waitServer, stopServer, overlapCount, stats } from "./lib.mts";
const pool = makePool();
await guard(pool);
const repo = new MysqlAppointments(pool);
const server = startServer(); console.log("servidor propio PID", server.pid);
const MIN = 60000;
let n = 0;
const mk = (vet: string, s: Date, e: Date) => ({ id: `aud-cc-${++n}-${Math.random().toString(36).slice(2, 8)}`, petId: "aud-pet", veterinarianId: vet, startsAt: s, endsAt: e, reason: "concurrencia" });
const body = (vet: string, s: Date) => ({ petId: "aud-pet", veterinarianId: vet, startsAt: s.toISOString(), endsAt: new Date(s.getTime() + 30 * MIN).toISOString(), reason: "concurrencia http" });
const settle = async (ps: Promise<unknown>[]) => Promise.allSettled(ps);
try {
  await waitServer();
  await cleanup(pool); await seed(pool);
  let day = 100;
  for (const N of [2, 5, 20]) {
    for (const mode of ["http", "repo"] as const) {
      const ROUNDS = 20; let bad = 0; const times: number[] = [];
      for (let r = 0; r < ROUNDS; r++) {
        const s = slotAt(day++, "12:00"); const vet = "aud-vet-6";
        const t0 = performance.now();
        let ok = 0, conflict = 0, other = 0;
        if (mode === "http") {
          const res = await Promise.all(Array.from({ length: N }, () => http("POST", "/appointments", body(vet, s))));
          for (const x of res) x.status === 201 ? ok++ : x.status === 409 ? conflict++ : other++;
        } else {
          const res = await settle(Array.from({ length: N }, () => repo.reserve(mk(vet, s, new Date(s.getTime() + 30 * MIN)))));
          for (const x of res) x.status === "fulfilled" ? ok++ : (x.reason as any).code === "APPOINTMENT_CONFLICT" ? conflict++ : other++;
        }
        times.push(performance.now() - t0);
        const cnt = Number((await rows<any>(pool, "SELECT COUNT(*) c FROM appointments WHERE veterinarian_id=? AND starts_at=?", [vet, s]))[0].c);
        if (!(ok === 1 && conflict === N - 1 && other === 0 && cnt === 1)) { bad++; console.log(`  ronda ${r} N=${N} ${mode}: ok=${ok} conflict=${conflict} other=${other} filas=${cnt}`); }
      }
      check(`${mode.toUpperCase()} N=${N}: ${ROUNDS} rondas, exactamente 1 reserva por ronda`, bad === 0, `rondas malas=${bad}; ms/ronda mediana=${stats(times).median.toFixed(0)} max=${stats(times).max.toFixed(0)}`);
    }
  }
  check("JOIN: sin solapes tras rondas mismo vet/horario", (await overlapCount(pool)) === 0);

  // vets distintos misma hora
  for (const mode of ["http", "repo"] as const) {
    let bad = 0;
    for (let r = 0; r < 20; r++) {
      const s = slotAt(day++, "13:00");
      const vets = Array.from({ length: 20 }, (_, i) => `aud-vet-${i + 1}`);
      let ok = 0;
      if (mode === "http") { const res = await Promise.all(vets.map((v) => http("POST", "/appointments", body(v, s)))); ok = res.filter((x) => x.status === 201).length; }
      else { const res = await settle(vets.map((v) => repo.reserve(mk(v, s, new Date(s.getTime() + 30 * MIN))))); ok = res.filter((x) => x.status === "fulfilled").length; }
      if (ok !== 20) { bad++; console.log(`  ronda ${r}: ok=${ok}/20`); }
    }
    check(`${mode.toUpperCase()}: 20 vets distintos a la misma hora x20 rondas -> 20/20 aceptadas`, bad === 0, `rondas malas=${bad}`);
  }

  // mezcla HTTP: bloques contiguos y repetidos, mismo vet; 3 solicitudes por cada uno de 4 bloques consecutivos
  {
    let bad = 0;
    for (let r = 0; r < 20; r++) {
      const base = slotAt(day++, "10:00"); const vet = "aud-vet-7";
      const reqs: Promise<any>[] = [];
      for (let b = 0; b < 4; b++) for (let k = 0; k < 3; k++) reqs.push(http("POST", "/appointments", body(vet, new Date(base.getTime() + b * 30 * MIN))));
      const res = await Promise.all(reqs);
      const ok = res.filter((x) => x.status === 201).length, c = res.filter((x) => x.status === 409).length;
      if (ok !== 4 || c !== 8) { bad++; console.log(`  ronda ${r}: ok=${ok} 409=${c}`); }
    }
    check("HTTP mezcla: 4 bloques contiguos x 3 solicitudes, x20 rondas -> 4 aceptadas, 8 conflictos", bad === 0, `rondas malas=${bad}`);
  }
  // mezcla repo: inicios desplazados cada 10 min (solape parcial) 20 solicitudes
  {
    let bad = 0, accSum = 0;
    for (let r = 0; r < 20; r++) {
      const base = slotAt(day++, "10:00"); const vet = "aud-vet-8";
      const res = await settle(Array.from({ length: 20 }, (_, i) => { const s = new Date(base.getTime() + (i % 10) * 10 * MIN); return repo.reserve(mk(vet, s, new Date(s.getTime() + 30 * MIN))); }));
      const other = res.filter((x) => x.status === "rejected" && (x.reason as any).code !== "APPOINTMENT_CONFLICT").length;
      const acc = res.filter((x) => x.status === "fulfilled").length; accSum += acc;
      const rowsDay = await rows<any>(pool, "SELECT starts_at s, ends_at e FROM appointments WHERE veterinarian_id=? AND starts_at>=? AND starts_at<?", [vet, base, new Date(base.getTime() + 24 * 3600000)]);
      let overlaps = 0; for (let i = 0; i < rowsDay.length; i++) for (let j = i + 1; j < rowsDay.length; j++) if (rowsDay[i].s < rowsDay[j].e && rowsDay[i].e > rowsDay[j].s) overlaps++;
      if (other || overlaps || acc < 1 || acc !== rowsDay.length) { bad++; console.log(`  ronda ${r}: acc=${acc} filas=${rowsDay.length} overlaps=${overlaps} otros=${other}`); }
    }
    check("REPO mezcla: 20 solicitudes con solapes parciales x20 rondas -> 0 solapes, sin errores inesperados", bad === 0, `aceptadas medias=${(accSum / 20).toFixed(1)}`);
  }
  check("JOIN global final: 0 solapes", (await overlapCount(pool)) === 0);
  const tot = await rows<any>(pool, "SELECT COUNT(*) c FROM appointments WHERE veterinarian_id LIKE 'aud-%'");
  console.log("citas aud- totales en la ejecución:", tot[0].c);
} finally {
  await stopServer(server);
  await cleanup(pool);
  await pool.end();
  console.log("servidor detenido, exitCode:", server.exitCode);
}
console.log(`FALLOS: ${failCount()}`);
process.exit(failCount() ? 1 : 0);
