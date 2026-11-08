import { makePool, guard, rows, seed, cleanup, check, failCount, composeServices, buildApplication, startServer, waitServer, stopServer, sleep, http } from "./lib.mts";
import type { AddressInfo } from "node:net";
import { root } from "./lib.mts";
const pool = makePool();
await guard(pool);
const NOW = new Date("2030-01-01T12:00:00.000Z");
const clock = { now: () => NOW };
const svc = composeServices(pool, clock, 24, "America/Hermosillo");
const ins = (id: string, pet: string, vet: string, s: Date) => pool.execute("INSERT INTO appointments (id,pet_id,veterinarian_id,starts_at,ends_at,reason) VALUES (?,?,?,?,?,?)", [id, pet, vet, s, new Date(s.getTime() + 1800000), "rem"]);
const at = (ms: number) => new Date(NOW.getTime() + ms);
const logsOf = (like: string) => rows<any>(pool, "SELECT * FROM notification_logs WHERE appointment_id LIKE ? ORDER BY appointment_id", [like]);
let server: ReturnType<typeof startServer> | undefined;
try {
  await cleanup(pool); await seed(pool);
  await pool.execute("INSERT INTO owners (id,name,email) VALUES ('aud-owner-b','Aud Dueño B','aud-b@example.test')");
  await pool.execute("INSERT INTO pets (id,owner_id,name,species) VALUES ('aud-pet-b','aud-owner-b','Pelusa','Gato')");
  console.log("== Ventana exacta: ahora < inicio <= ahora + 24 h  (reloj controlado 2030-01-01T12:00:00Z)");
  const SEC = 1000, H24 = 24 * 3600 * 1000;
  const cases: [string, string, number, boolean][] = [
    ["aud-w-menos1s", "aud-pet", -SEC, false], ["aud-w-cero", "aud-pet", 0, false], ["aud-w-mas1s", "aud-pet", SEC, true],
    ["aud-w-mas1ms", "aud-pet-b", 1, true],
    ["aud-w-ventana", "aud-pet-b", H24, true], ["aud-w-ventana-1ms", "aud-pet", H24 - 1, true], ["aud-w-ventana+1ms", "aud-pet", H24 + 1, false],
    ["aud-w-ayer", "aud-pet", -H24, false], ["aud-w-pasada-1h", "aud-pet", -3600000, false], ["aud-w-mañana+2d", "aud-pet", 2 * H24, false],
  ];
  // citas del mismo vet no se solapan: un vet distinto por caso
  for (const [i, [id, pet, off]] of cases.entries()) await ins(id, pet, `aud-vet-${i + 1}`, at(off));
  const r1 = await svc.sendReminders.execute();
  const expected = cases.filter((c) => c[3]).length;
  check(`primera ejecución envía exactamente ${expected}`, r1.sent === expected, `sent=${r1.sent}`);
  const l1 = await logsOf("aud-w-%");
  for (const [id, , , inc] of cases) check(`${id}: ${inc ? "incluida" : "excluida"}`, l1.some((x) => x.appointment_id === id) === inc);
  const byPet = (id: string) => l1.find((x) => x.appointment_id === id);
  check("destinatario correcto (aud-owner)", byPet("aud-w-mas1s")?.recipient === "aud-owner@example.test");
  check("destinatario correcto (aud-owner-b)", byPet("aud-w-ventana")?.recipient === "aud-b@example.test");
  check("mensaje menciona la mascota correcta", /Pelusa/.test(byPet("aud-w-ventana")?.message) && /AudPet/.test(byPet("aud-w-mas1s")?.message));
  check("tipo 'upcoming' y simulated_at = reloj inyectado", l1.every((x) => x.type === "upcoming" && new Date(x.simulated_at).getTime() === NOW.getTime()));
  console.log("  mensaje real (ventana exacta):", byPet("aud-w-ventana")?.message);
  console.log("  inicio UTC de esa cita:", at(H24).toISOString(), "-> 12:00Z-7h = 05:00 + 24h en Hermosillo");
  check("hora en zona de clínica (05:00 del 02/01/2030, UTC-7), no en UTC (12:00)", /02\/01\/2030,? 05:00/.test(byPet("aud-w-ventana")?.message), "");
  check("mensaje indica zona America/Hermosillo y que es simulado", /America\/Hermosillo/.test(byPet("aud-w-ventana")?.message) && /simulado/.test(byPet("aud-w-ventana")?.message));
  const r2 = await svc.sendReminders.execute();
  check("segunda ejecución: 0 enviados", r2.sent === 0, `sent=${r2.sent}`);
  const r3 = await svc.sendReminders.execute();
  check("tercera ejecución: 0 y total de logs sin cambios", r3.sent === 0 && (await logsOf("aud-w-%")).length === expected);
  // límite exacto: avanzar el reloj 1 ms sin duplicar
  const svc2 = composeServices(pool, { now: () => at(1) }, 24, "America/Hermosillo");
  const r4 = await svc2.sendReminders.execute();
  check("reloj +1ms: cita 'aud-w-ventana+1ms' entra ahora; 'aud-w-mas1ms' (starts=now+1ms) sale y no se reenvía", r4.sent === 1 && (await logsOf("aud-w-ventana+1ms")).length === 1 && (await logsOf("aud-w-mas1ms")).length === 1, `sent=${r4.sent}`);

  console.log("== Ejecuciones concurrentes (20 rondas x 5 ejecuciones simultáneas, 6 citas nuevas por ronda)");
  let bad = 0;
  for (let r = 0; r < 20; r++) {
    for (let k = 0; k < 6; k++) await ins(`aud-c-${r}-${k}`, "aud-pet", `aud-vet-${10 + k}`, at(2 * 3600000 + r * 7200000 + k * 1800000 + 30 * 60000)).catch(() => 0);
  }
  // todas las citas de las rondas caen dentro de las próximas 24h+ => se reparten: usar ventana grande mediante servicio con 168h
  await pool.execute("DELETE FROM appointments WHERE id='aud-w-mañana+2d'"); // caso de control ya verificado; dentro de 168 h contaminaría el conteo
  const wide = composeServices(pool, clock, 168, "America/Hermosillo");
  const total = Number((await rows<any>(pool, "SELECT COUNT(*) c FROM appointments WHERE id LIKE 'aud-c-%'"))[0].c);
  const res = await Promise.all(Array.from({ length: 5 }, () => wide.sendReminders.execute()));
  const sum = res.reduce((a, x) => a + x.sent, 0);
  const lg = await logsOf("aud-c-%");
  const dup = Number((await rows<any>(pool, "SELECT COUNT(*) c FROM (SELECT appointment_id,type FROM notification_logs GROUP BY 1,2 HAVING COUNT(*)>1) t"))[0].c);
  check(`5 ejecuciones simultáneas: suma enviados == citas (${total}) y logs == citas, sin duplicados`, sum === total && lg.length === total && dup === 0, `suma=${sum} logs=${lg.length} dup=${dup}`);
  // rondas repetidas: nuevas citas + 5 ejecuciones concurrentes, 20 veces
  for (let r = 0; r < 20; r++) {
    const ids = Array.from({ length: 4 }, (_, k) => `aud-r-${r}-${k}`);
    for (const [k, id] of ids.entries()) await ins(id, "aud-pet", `aud-vet-${20 + k}`, at(3600000 * 3 + r * 7200000 + k * 1800000));
    const rr = await Promise.all(Array.from({ length: 5 }, () => wide.sendReminders.execute()));
    const s = rr.reduce((a, x) => a + x.sent, 0);
    const n = Number((await rows<any>(pool, "SELECT COUNT(*) c FROM notification_logs WHERE appointment_id LIKE ?", [`aud-r-${r}-%`]))[0].c);
    if (s !== 4 || n !== 4) { bad++; console.log(`  ronda ${r}: sent=${s} logs=${n}`); }
  }
  check("20 rondas (4 citas nuevas + 5 ejecuciones simultáneas): 4 enviados y 4 logs por ronda", bad === 0, `rondas malas=${bad}`);
  check("sin duplicados globales (cita,tipo)", Number((await rows<any>(pool, "SELECT COUNT(*) c FROM (SELECT appointment_id,type FROM notification_logs GROUP BY 1,2 HAVING COUNT(*)>1) t"))[0].c) === 0);

  console.log("== Fallo de persistencia (error de BD real distinto de ER_DUP_ENTRY)");
  const { SendReminders } = await import(`${root}/src/modules/notifications/application/send-reminders.ts`);
  const { MysqlReminders } = await import(`${root}/src/modules/notifications/infrastructure/mysql-reminders.ts`);
  for (const k of [1, 2, 3]) await ins(`aud-f-${k}`, "aud-pet", `aud-vet-${k}`, at(3600000 * 5 + k * 1800000));
  const real = new MysqlReminders(pool);
  // Carrera simulada: la cita aud-f-2 desaparece entre la lectura y el INSERT => violación REAL de FK (ER_NO_REFERENCED_ROW_2), no un duplicado.
  const racing = {
    findUpcoming: async (a: Date, t: Date) => { const c = await real.findUpcoming(a, t); await pool.execute("DELETE FROM appointments WHERE id='aud-f-2'"); return c; },
    recordOnce: (r: any) => real.recordOnce(r),
    list: () => real.list(),
  };
  const failing = new SendReminders(racing, clock, 8, "America/Hermosillo");
  let err: any = null; let out: any = null;
  try { out = await failing.execute(); } catch (e) { err = e; }
  check("execute() rechaza (no devuelve un conteo 'sent') ante fallo de BD", err !== null && out === null, `${err?.code ?? err?.message}`);
  check("el error es FK (ER_NO_REFERENCED_ROW_2), no ER_DUP_ENTRY, y se propaga", err?.code === "ER_NO_REFERENCED_ROW_2", `${err?.code}`);
  let f = await logsOf("aud-f-%");
  check("la cita que falló NO tiene registro", !f.some((x) => x.appointment_id === "aud-f-2"));
  console.log("  registros tras el fallo:", f.map((x) => x.appointment_id).join(",") || "(ninguno)", "(f-1 se registró antes del fallo; f-3 no se procesó: hay envío parcial, reejecutable sin duplicar)");
  const rec = await new SendReminders(real, clock, 8, "America/Hermosillo").execute();
  f = await logsOf("aud-f-%");
  check("reejecución: completa solo lo pendiente (f-3), sin duplicar f-1", rec.sent === 1 && f.length === 2 && f.some((x) => x.appointment_id === "aud-f-3"), `sent=${rec.sent} logs=${f.length}`);
  // Fallo de infraestructura (pool cerrado) vía HTTP real en proceso
  const deadPool = makePool(); await deadPool.end();
  const app = buildApplication(deadPool, clock, { timeZone: "America/Hermosillo", reminderHours: 24 });
  const srv = app.listen(0, "127.0.0.1"); await new Promise((r) => srv.once("listening", r));
  const port = (srv.address() as AddressInfo).port;
  const errSpy = console.error; console.error = () => {};
  const resp = await fetch(`http://127.0.0.1:${port}/api/notifications/run`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  console.error = errSpy;
  const txt = await resp.text(); await new Promise((r) => srv.close(r));
  check("POST /api/notifications/run con BD caída -> 500 INTERNAL_ERROR sin detalles internos", resp.status === 500 && /INTERNAL_ERROR/.test(txt) && !/pool|closed|mysql|ECONN/i.test(txt), `${resp.status} ${txt}`);

  console.log("== Sin ejecución automática (servidor real, reloj del sistema)");
  const soon = new Date(Date.now() + 2 * 3600000); soon.setUTCSeconds(0, 0);
  await ins("aud-auto-1", "aud-pet", "aud-vet-30", soon);
  server = startServer(); await waitServer(); await sleep(5000);
  const auto = await logsOf("aud-auto-%");
  check("5 s después de arrancar el servidor, una cita dentro de las próximas 24 h NO generó recordatorio automático", auto.length === 0);
  const manual = await http("POST", "/notifications/run", {});
  check("ejecución manual vía HTTP la procesa (>=1)", manual.status === 200 && manual.json.sent >= 1, JSON.stringify(manual.json));
  const l = await http("GET", "/notifications");
  check("GET /notifications muestra el registro persistido", l.status === 200 && l.json.some((x: any) => x.appointmentId === "aud-auto-1"));
} finally {
  if (server) await stopServer(server);
  await cleanup(pool);
  console.log("restos:", JSON.stringify(await rows<any>(pool, "SELECT (SELECT COUNT(*) FROM appointments WHERE id LIKE 'aud-%') a,(SELECT COUNT(*) FROM notification_logs WHERE appointment_id LIKE 'aud-%') n")));
  await pool.end();
}
console.log(`FALLOS: ${failCount()}`);
process.exit(failCount() ? 1 : 0);
