import { makePool, guard, rows, seed, cleanup, check, failCount, http, startServer, waitServer, stopServer, stats, slotAt } from "./lib.mts";
const pool = makePool();
await guard(pool);
const server = startServer(); console.log("servidor propio PID", server.pid);
const MIN = 1800000;
let total = 0;
async function grow(to: number) {
  const base = new Date("2028-01-03T17:00:00Z").getTime();
  while (total < to) {
    const vals: any[] = [], ph: string[] = [];
    for (let i = 0; i < 1000 && total < to; i++, total++) {
      const vet = (total % 30) + 1, idx = Math.floor(total / 30), day = Math.floor(idx / 16), slot = idx % 16;
      const s = new Date(base + day * 86400000 + slot * MIN);
      ph.push("(?,?,?,?,?,?)"); vals.push(`aud-p-${total}`, "aud-pet", `aud-vet-${vet}`, s, new Date(s.getTime() + MIN), "perf");
    }
    await pool.query("INSERT INTO appointments (id,pet_id,veterinarian_id,starts_at,ends_at,reason) VALUES " + ph.join(","), vals);
  }
}
const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Hermosillo" }).format(slotAt(10, "12:00", "2027-03-01"));
async function measure(label: string) {
  const av: number[] = [];
  await http("GET", `/appointments/availability?date=${dateStr}&veterinarianId=aud-vet-1`); // calentamiento
  for (let i = 0; i < 20; i++) { const t = performance.now(); const r = await http("GET", `/appointments/availability?date=${dateStr}&veterinarianId=aud-vet-1`); av.push(performance.now() - t); if (r.status !== 200) throw new Error("availability " + r.status); }
  const post: number[] = [];
  for (let i = 0; i < 20; i++) { const s = slotAt(700 + i, "12:00", "2027-03-01"); const t = performance.now(); const r = await http("POST", "/appointments", { petId: "aud-pet", veterinarianId: "aud-vet-1", startsAt: s.toISOString(), endsAt: new Date(s.getTime() + MIN).toISOString(), reason: "perf" }); post.push(performance.now() - t); if (r.status !== 201) throw new Error("post " + r.status); }
  await pool.execute("DELETE FROM appointments WHERE reason='perf-post' OR (veterinarian_id='aud-vet-1' AND starts_at>=? AND reason='perf' AND id NOT LIKE 'aud-p-%')", [slotAt(700, "00:00", "2027-03-01")]);
  const t = performance.now(); const l = await fetch("http://127.0.0.1:3012/api/appointments"); const body = await l.text(); const tl = performance.now() - t;
  const a = stats(av), p = stats(post);
  console.log(`${label.padEnd(28)} filas=${String(total).padStart(6)} | availability n=20 mediana=${a.median.toFixed(1)} ms p95=${a.p95.toFixed(1)} ms max=${a.max.toFixed(1)} | POST n=20 mediana=${p.median.toFixed(1)} p95=${p.p95.toFixed(1)} | GET /appointments ${tl.toFixed(0)} ms, ${(body.length / 1024).toFixed(0)} KiB`);
  return a;
}
try {
  await waitServer(); await cleanup(pool); await seed(pool);
  const base = Number((await rows<any>(pool, "SELECT COUNT(*) c FROM appointments"))[0].c);
  console.log("filas preexistentes (no aud-) en la tabla:", base);
  await grow(0); await measure("pocas citas (0 aud-)");
  await grow(5000); await pool.query("ANALYZE TABLE appointments"); await measure("5.000 citas");
  await grow(50000); await pool.query("ANALYZE TABLE appointments"); const a50 = await measure("50.000 citas");
  console.log("== EXPLAIN (con 50.000 filas)");
  const ex1 = await rows<any>(pool, "EXPLAIN SELECT id,pet_id AS petId,veterinarian_id AS veterinarianId,starts_at AS startsAt,ends_at AS endsAt,reason FROM appointments ORDER BY starts_at,id");
  console.log("disponibilidad/list():", JSON.stringify(ex1.map((r) => ({ type: r.type, key: r.key, rows: r.rows, Extra: r.Extra }))));
  const ex2 = await rows<any>(pool, "EXPLAIN SELECT id FROM appointments WHERE veterinarian_id=? AND starts_at < ? AND ends_at > ? LIMIT 1", ["aud-vet-1", new Date("2028-02-01T18:00:00Z"), new Date("2028-02-01T17:30:00Z")]);
  console.log("conflicto (reserve):", JSON.stringify(ex2.map((r) => ({ type: r.type, key: r.key, rows: r.rows, Extra: r.Extra }))));
  const ex3 = await rows<any>(pool, "EXPLAIN SELECT a.id,o.email,p.name,a.starts_at FROM appointments a JOIN pets p ON p.id=a.pet_id JOIN owners o ON o.id=p.owner_id WHERE a.starts_at>? AND a.starts_at<=? AND NOT EXISTS (SELECT 1 FROM notification_logs n WHERE n.appointment_id=a.id AND n.type='upcoming') ORDER BY a.starts_at,a.id", [new Date("2030-01-01T00:00:00Z"), new Date("2030-01-02T00:00:00Z")]);
  console.log("recordatorios findUpcoming:", JSON.stringify(ex3.map((r) => ({ table: r.table, type: r.type, key: r.key, rows: r.rows }))));
  // EXPLAIN ANALYZE para la consulta de conflicto
  const [ea] = await pool.query("EXPLAIN ANALYZE SELECT id FROM appointments WHERE veterinarian_id='aud-vet-1' AND starts_at < '2028-02-01 18:00:00' AND ends_at > '2028-02-01 17:30:00' LIMIT 1") as any;
  console.log("EXPLAIN ANALYZE conflicto:", String(Object.values(ea[0])[0]).split("\n").slice(0, 3).join(" | "));
  const cnt = await rows<any>(pool, "SELECT COUNT(*) c FROM appointments WHERE id LIKE 'aud-p-%'");
  check("citas de prueba insertadas", Number(cnt[0].c) === 50000, String(cnt[0].c));
  check("REFERENCIA (no umbral de producto): availability a 50.000 filas medida y reportada", a50.median > 0, `${a50.median.toFixed(1)} ms`);
} finally {
  await stopServer(server);
  await cleanup(pool);
  console.log("restos aud-:", JSON.stringify(await rows<any>(pool, "SELECT COUNT(*) c FROM appointments WHERE id LIKE 'aud-%' OR pet_id LIKE 'aud-%'")), "servidor exitCode:", server.exitCode);
  await pool.end();
}
console.log(`FALLOS: ${failCount()}`);
process.exit(failCount() ? 1 : 0);
