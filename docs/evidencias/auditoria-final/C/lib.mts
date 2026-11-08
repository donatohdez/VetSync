import { spawn, type ChildProcess } from "node:child_process";
import type { Pool } from "mysql2/promise";
const R = "/Users/donato/Ago-Dic 2026/Fun de IA/VetSync";
const { config } = await import(`${R}/src/shared/config.ts`);
const { database, rows } = await import(`${R}/src/shared/database.ts`);
export { rows };
export const root = R;
export const clinicInstant = (await import(`${R}/src/modules/appointments/domain/clinic-hours.ts`)).clinicInstant as (d: string, t: string, tz: string) => Date;
export const { buildApplication, composeServices } = await import(`${R}/src/composition.ts`);
export const { MysqlAppointments } = await import(`${R}/src/modules/appointments/infrastructure/mysql-appointments.ts`);
export function makePool(): Pool {
  return database({ host: config.DB_HOST, port: config.DB_PORT, user: config.DB_USER, password: config.DB_PASSWORD, database: "vetsync_test" });
}
export async function guard(pool: Pool) {
  const r = await rows<{ n: string }>(pool, "SELECT DATABASE() AS n");
  if (r[0]?.n !== "vetsync_test") throw new Error("ABORT: base distinta de vetsync_test");
}
export async function seed(pool: Pool, p = "aud-") {
  await guard(pool);
  await pool.execute("INSERT IGNORE INTO owners (id,name,email) VALUES (?,?,?)", [`${p}owner`, "Aud Dueño", "aud-owner@example.test"]);
  await pool.execute("INSERT IGNORE INTO pets (id,owner_id,name,species) VALUES (?,?,?,?)", [`${p}pet`, `${p}owner`, "AudPet", "Perro"]);
  for (let i = 1; i <= 30; i++)
    await pool.execute("INSERT IGNORE INTO veterinarians (id,name) VALUES (?,?)", [`${p}vet-${i}`, `Aud Vet ${i}`]);
}
export async function cleanup(pool: Pool, extraOwners: string[] = [], extraPets: string[] = []) {
  await guard(pool);
  const like = "aud-%";
  const ap = "(SELECT id FROM appointments WHERE pet_id LIKE ? OR veterinarian_id LIKE ?)";
  await pool.execute(`DELETE FROM notification_logs WHERE appointment_id IN ${ap}`, [like, like]);
  await pool.execute("DELETE FROM notification_logs WHERE id LIKE ?", [like]);
  await pool.execute("DELETE FROM medical_records WHERE pet_id LIKE ? OR veterinarian_id LIKE ?", [like, like]);
  await pool.execute("DELETE FROM appointments WHERE pet_id LIKE ? OR veterinarian_id LIKE ? OR id LIKE ?", [like, like, like]);
  for (const pid of extraPets) {
    await pool.execute("DELETE FROM notification_logs WHERE appointment_id IN (SELECT id FROM appointments WHERE pet_id=?)", [pid]);
    await pool.execute("DELETE FROM medical_records WHERE pet_id=?", [pid]);
    await pool.execute("DELETE FROM appointments WHERE pet_id=?", [pid]);
    await pool.execute("DELETE FROM pets WHERE id=?", [pid]);
  }
  await pool.execute("DELETE FROM pets WHERE id LIKE ? OR owner_id LIKE ?", [like, like]);
  await pool.execute("DELETE FROM veterinarians WHERE id LIKE ?", [like]);
  for (const o of extraOwners) await pool.execute("DELETE FROM owners WHERE id=?", [o]);
  await pool.execute("DELETE FROM owners WHERE id LIKE ?", [like]);
}
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export function startServer(port = 3012): ChildProcess {
  const child = spawn("node", ["dist/server.js"], {
    cwd: R,
    env: { ...process.env, PORT: String(port), DB_NAME: "vetsync_test", HOST: "127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", () => {});
  child.stderr?.on("data", (d) => process.stderr.write(`[server] ${d}`));
  return child;
}
export async function waitServer(port = 3012) {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/api/health`); if (r.ok) return; } catch { /* aún no */ }
    await sleep(200);
  }
  throw new Error("servidor no arrancó");
}
export async function stopServer(child: ChildProcess) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  for (let i = 0; i < 50 && child.exitCode === null; i++) await sleep(100);
  if (child.exitCode === null) child.kill("SIGKILL");
}
export const BASE = "http://127.0.0.1:3012/api";
export async function http(method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  let json: unknown = null;
  try { json = await res.json(); } catch { /* sin cuerpo */ }
  return { status: res.status, json: json as any };
}
let fails = 0;
export function check(name: string, ok: boolean, detail = "") {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -> " + detail : ""}`);
}
export const failCount = () => fails;
/** Instante de la clínica (Hermosillo) para día base + offset y hora HH:MM. */
export function slotAt(dayOffset: number, time: string, base = "2027-06-01"): Date {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return clinicInstant(d.toISOString().slice(0, 10), time, "America/Hermosillo");
}
export const TIMES = Array.from({ length: 16 }, (_, i) => `${String(10 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
export const overlapCount = (pool: Pool) => rows<{ c: number }>(pool,
  "SELECT COUNT(*) AS c FROM appointments a JOIN appointments b ON a.veterinarian_id=b.veterinarian_id AND a.id<b.id AND a.starts_at<b.ends_at AND a.ends_at>b.starts_at WHERE a.veterinarian_id LIKE 'aud-%'").then((r) => Number(r[0]!.c));
export function stats(v: number[]) {
  const s = [...v].sort((a, b) => a - b);
  return { n: s.length, median: s[Math.floor(s.length / 2)]!, p95: s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)]!, max: s[s.length - 1]! };
}
