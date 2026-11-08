import { makePool, guard, rows, seed, cleanup, check, failCount, slotAt, http, startServer, waitServer, stopServer } from "./lib.mts";
const pool = makePool();
await guard(pool);
const owners: string[] = [], pets: string[] = [];
let server = startServer(); console.log("servidor 1 PID", server.pid);
try {
  await waitServer(); await cleanup(pool); await seed(pool);
  const o = await http("POST", "/owners", { name: "Aud Persistencia", email: "aud-persist@example.test", phone: "555" }); owners.push(o.json.id);
  const p = await http("POST", "/pets", { ownerId: o.json.id, name: "AudPersist", species: "Gato", breed: null, birthDate: "2020-01-02" }); pets.push(p.json.id);
  const s = slotAt(600, "11:00");
  const a = await http("POST", "/appointments", { petId: p.json.id, veterinarianId: "aud-vet-1", startsAt: s.toISOString(), endsAt: new Date(s.getTime() + 1800000).toISOString(), reason: "Persistencia" });
  const m = await http("POST", `/pets/${p.json.id}/medical-records`, { veterinarianId: "aud-vet-1", recordedAt: new Date(Date.now() - 60000).toISOString(), clinicalNote: "Nota persistente" });
  check("creación vía API (201 x4)", [o.status, p.status, a.status, m.status].every((x) => x === 201), [o.status, p.status, a.status, m.status].join(","));
  const pid1 = server.pid;
  await stopServer(server);
  check("servidor 1 detenido", server.exitCode !== null, `exitCode=${server.exitCode}`);
  server = startServer(); await waitServer(); console.log("servidor 2 PID", server.pid);
  check("PID distinto tras reiniciar", server.pid !== pid1);
  const lo = await http("GET", "/owners"), lp = await http("GET", "/pets"), la = await http("GET", "/appointments"), lm = await http("GET", `/pets/${p.json.id}/medical-records`);
  check("dueño persiste", lo.json.some((x: any) => x.id === o.json.id && x.name === "Aud Persistencia"));
  check("mascota persiste (con fecha de nacimiento intacta)", lp.json.some((x: any) => x.id === p.json.id && x.birthDate === "2020-01-02"));
  check("cita persiste con mismo intervalo", la.json.some((x: any) => x.id === a.json.id && new Date(x.startsAt).getTime() === s.getTime() && new Date(x.endsAt).getTime() === s.getTime() + 1800000));
  check("nota clínica persiste", lm.json.length === 1 && lm.json[0].clinicalNote === "Nota persistente");
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Hermosillo" }).format(s);
  const av = await http("GET", `/appointments/availability?date=${date}&veterinarianId=aud-vet-1`);
  check("tras reiniciar, 11:00 sigue ocupado", av.json.find((x: any) => x.time === "11:00").reason === "occupied");
  const dup = await http("POST", "/appointments", { petId: p.json.id, veterinarianId: "aud-vet-1", startsAt: s.toISOString(), endsAt: new Date(s.getTime() + 1800000).toISOString(), reason: "dup" });
  check("tras reiniciar, doble reserva -> 409", dup.status === 409);
} finally {
  await stopServer(server);
  await cleanup(pool, owners, pets);
  console.log("restos:", (await rows<any>(pool, "SELECT COUNT(*) c FROM owners WHERE email='aud-persist@example.test'"))[0].c, "| servidor detenido exitCode:", server.exitCode);
  await pool.end();
}
console.log(`FALLOS: ${failCount()}`);
process.exit(failCount() ? 1 : 0);
