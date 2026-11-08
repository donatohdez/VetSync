import { makePool, guard, rows, seed, cleanup, check, failCount } from "./lib.mts";
const pool = makePool();
await guard(pool);
try {
  const q = async (sql: string, p: any[] = []) => rows<any>(pool, sql, p);
  console.log("== Tablas/índices/FK/CHECK (information_schema, vetsync_test)");
  const tables = (await q("SELECT TABLE_NAME t, ENGINE e FROM information_schema.TABLES WHERE TABLE_SCHEMA='vetsync_test' ORDER BY 1")).map((r) => `${r.t}:${r.e}`);
  console.log(tables.join(", "));
  const exp = ["appointments", "medical_records", "notification_logs", "owners", "pets", "veterinarians"];
  for (const t of exp) check(`tabla ${t} InnoDB`, tables.includes(`${t}:InnoDB`));
  const fks = await q("SELECT TABLE_NAME t, COLUMN_NAME c, REFERENCED_TABLE_NAME r FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA='vetsync_test' AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY 1,2");
  console.log(fks.map((r) => `${r.t}.${r.c}->${r.r}`).join(", "));
  check("6 FK esperadas (pets 1, appointments 2, medical_records 2, notification_logs 1)", fks.length === 6, String(fks.length));
  const chk = await q("SELECT CONSTRAINT_NAME n, CHECK_CLAUSE c FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA='vetsync_test'");
  console.log(JSON.stringify(chk));
  check("CHECK chk_appointment_interval presente", chk.some((r) => r.n === "chk_appointment_interval"));
  const idx = await q("SELECT TABLE_NAME t, INDEX_NAME i, NON_UNIQUE nu, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) cols FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='vetsync_test' GROUP BY 1,2,3 ORDER BY 1,2");
  console.log(idx.map((r) => `${r.t}.${r.i}(${r.cols})${r.nu == 0 ? " UNIQUE" : ""}`).join("\n"));
  check("UNIQUE uq_notification_appointment_type", idx.some((r) => r.i === "uq_notification_appointment_type" && r.nu == 0 && r.cols === "appointment_id,type"));
  check("índice idx_appointments_vet_start", idx.some((r) => r.i === "idx_appointments_vet_start" && r.cols === "veterinarian_id,starts_at"));
  const ver = await q("SHOW TABLES LIKE '%migr%'");
  console.log("tabla de versionado de migraciones:", ver.length ? "sí" : "NO existe (ver scripts/migrate.ts)");

  console.log("== Violaciones directas");
  await cleanup(pool); await seed(pool);
  const expectErr = async (name: string, code: string, sql: string, p: any[]) => {
    try { await pool.execute(sql, p); check(name, false, "aceptó la fila"); }
    catch (e: any) { check(name, e.code === code, `${e.code}`); }
  };
  await expectErr("pet con owner inexistente", "ER_NO_REFERENCED_ROW_2", "INSERT INTO pets (id,owner_id,name,species) VALUES ('aud-x1','aud-no','x','y')", []);
  await expectErr("cita con pet inexistente", "ER_NO_REFERENCED_ROW_2", "INSERT INTO appointments (id,pet_id,veterinarian_id,starts_at,ends_at,reason) VALUES ('aud-a1','aud-no','aud-vet-1','2027-01-01 17:00:00','2027-01-01 17:30:00','r')", []);
  await expectErr("cita con vet inexistente", "ER_NO_REFERENCED_ROW_2", "INSERT INTO appointments (id,pet_id,veterinarian_id,starts_at,ends_at,reason) VALUES ('aud-a1','aud-pet','aud-no','2027-01-01 17:00:00','2027-01-01 17:30:00','r')", []);
  await expectErr("ends_at == starts_at", "ER_CHECK_CONSTRAINT_VIOLATED", "INSERT INTO appointments (id,pet_id,veterinarian_id,starts_at,ends_at,reason) VALUES ('aud-a2','aud-pet','aud-vet-1','2027-01-01 17:00:00','2027-01-01 17:00:00','r')", []);
  await expectErr("ends_at < starts_at", "ER_CHECK_CONSTRAINT_VIOLATED", "INSERT INTO appointments (id,pet_id,veterinarian_id,starts_at,ends_at,reason) VALUES ('aud-a3','aud-pet','aud-vet-1','2027-01-01 17:30:00','2027-01-01 17:00:00','r')", []);
  await expectErr("medical_record con pet inexistente", "ER_NO_REFERENCED_ROW_2", "INSERT INTO medical_records (id,pet_id,veterinarian_id,recorded_at,clinical_note) VALUES ('aud-m1','aud-no','aud-vet-1',NOW(),'n')", []);
  await expectErr("notificación con cita inexistente", "ER_NO_REFERENCED_ROW_2", "INSERT INTO notification_logs (id,appointment_id,type,recipient,simulated_at,message) VALUES ('aud-n0','aud-no','upcoming','a@b.c',NOW(),'m')", []);
  await expectErr("NULL en columna NOT NULL (owners.email)", "ER_BAD_NULL_ERROR", "INSERT INTO owners (id,name,email) VALUES ('aud-o2','n',NULL)", []);
  await pool.execute("INSERT INTO appointments (id,pet_id,veterinarian_id,starts_at,ends_at,reason) VALUES ('aud-a4','aud-pet','aud-vet-1','2027-01-01 17:00:00','2027-01-01 17:30:00','r')");
  await pool.execute("INSERT INTO notification_logs (id,appointment_id,type,recipient,simulated_at,message) VALUES ('aud-n1','aud-a4','upcoming','a@b.c',NOW(),'m')");
  await expectErr("duplicado notification_logs (cita,tipo)", "ER_DUP_ENTRY", "INSERT INTO notification_logs (id,appointment_id,type,recipient,simulated_at,message) VALUES ('aud-n2','aud-a4','upcoming','a@b.c',NOW(),'m')", []);
  await expectErr("borrar owner con mascotas (FK RESTRICT)", "ER_ROW_IS_REFERENCED_2", "DELETE FROM owners WHERE id='aud-owner'", []);
  await expectErr("borrar cita con notificación (FK RESTRICT)", "ER_ROW_IS_REFERENCED_2", "DELETE FROM appointments WHERE id='aud-a4'", []);
  console.log("NOTA: la BD NO impide por sí sola dos citas solapadas del mismo vet (no hay constraint de exclusión); se protege vía transacción/bloqueo (ver s3/s4).");
  await pool.execute("INSERT INTO appointments (id,pet_id,veterinarian_id,starts_at,ends_at,reason) VALUES ('aud-a5','aud-pet','aud-vet-1','2027-01-01 17:00:00','2027-01-01 17:30:00','r')");
  check("BD acepta SQL directo solapado (no hay restricción a nivel BD)", true, "informativo");
} finally {
  await cleanup(pool);
  const left = await rows<any>(pool, "SELECT (SELECT COUNT(*) FROM owners WHERE id LIKE 'aud-%')+(SELECT COUNT(*) FROM appointments WHERE id LIKE 'aud-%')+(SELECT COUNT(*) FROM pets WHERE id LIKE 'aud-%') AS c");
  console.log("restos aud- tras limpieza:", left[0].c);
  await pool.end();
}
console.log(`FALLOS: ${failCount()}`);
process.exit(failCount() ? 1 : 0);
