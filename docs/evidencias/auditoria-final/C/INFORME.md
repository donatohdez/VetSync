# Informe C: MySQL, concurrencia y recordatorios (auditoría final VetSync)

Fecha: 2026-11-08. Commit auditado: 637ce0b. Solo se escribió en `vetsync_test` (cada script comprueba `SELECT DATABASE()='vetsync_test'` y limpia únicamente filas `aud-` o IDs que él mismo creó vía API). No se tocó `vetsync` ni el proceso del puerto 3010. No se modificó código del proyecto. Mi servidor (`PORT=3012 DB_NAME=vetsync_test node dist/server.js`) se arrancó desde los scripts, y cada uno lo detuvo (exitCode 0). Al terminar solo queda el PID 38439 (demo del usuario, puerto 3010).

Logs: `work/auditoria-final/C/logs/` (copia en `docs/evidencias/auditoria-final/C/`, junto con los scripts `.mts`). Ejecución: `npx tsx work/auditoria-final/C/sN-*.mts` desde la raíz.

## Resultado global
No encontré defectos reproducidos en reservas, concurrencia, persistencia, inyección ni recordatorios. Hay riesgos de crecimiento inferidos y medidos (ver sección Riesgos). No hay bloqueantes para la entrega desde esta categoría.

## Fase 2: verificaciones automatizadas (comando, fecha UTC, salida)
| Comando | Hora UTC | Salida | Resultado |
|---|---|---|---|
| `npm run typecheck` | 19:00:07 | 0 | Aprobado |
| `npm run lint` | 19:00:08 | 0 | Aprobado |
| `npm run build` (regenera `dist/`, ignorado por Git) | 19:00:09 | 0 | Aprobado (`dist/web/app.js` 39.6 kB) |
| `npm test` | 19:00:10 | 0 | 5 archivos, **49 pruebas unitarias** aprobadas |
| `npm run test:integration` | 19:00:21 | 0 | 1 archivo, **32 pruebas de integración** aprobadas |
| `npm run test:coverage` | 19:00:22 | 0 | 6 archivos, **81 pruebas** aprobadas |

Preparación: `docker compose ps` mostró MySQL sano (`healthy`); `vetsync_test` ya existía (con `schema_migrations`), así que no ejecuté `db:prepare-test`. `scripts/prepare-test-db.ts` solo crea `vetsync_test`, concede permisos sobre esa base y migra con `DB_NAME=vetsync_test`. `tests/integration/api.test.ts` usa `database: "vetsync_test"` fijo y aborta si `SELECT DATABASE()` es otro. Esas pruebas hacen `DELETE FROM` de todas las tablas en `beforeEach` (aceptable en la base de pruebas, pero borrarían mis datos si se ejecutaran a la vez).

Cobertura real (v8) frente a `outputs/INFORME-PRUEBAS.md`: coincide exactamente.
| Métrica | Real | Informe |
|---|---|---|
| Líneas | 98.70% (229/232) | 98.70% |
| Sentencias | 98.33% (236/240) | 98.33% |
| Funciones | 98.63% (72/73) | 98.63% |
| Ramas | 97.82% (90/92) | 97.82% |

Umbral configurado 80% en las cuatro métricas. Líneas sin cubrir: `http/app.ts:141`, `clinic-hours.ts:55`, `mysql-reminders.ts:29`, `clock.ts:4` (el reloj del sistema).
Exclusiones (`vitest.config.ts`): `src/server.ts`, `src/web/**`, `src/shared/config.ts`, `src/composition.ts`. Observación: `src/web/**` suma 1.343 líneas, mucho más que las 232 medidas, así que el 98.7% describe el backend, no la interfaz. El informe dice que la UI se verifica con Playwright (lo revisan D y E), y el informe no lo oculta, pero conviene no citar el porcentaje como cobertura de todo el producto. `composition.ts` queda excluido aunque las pruebas de integración lo usan.

## Fase 4: scripts propios (todos con aserciones; PASS/FAIL contados por log)
| Script | Qué verifica | PASS | FAIL |
|---|---|---|---|
| s1-constraints | tablas, FK, CHECK, índices, UNIQUE, violaciones directas | 22 | 0 |
| s2-persistence | datos persisten tras reiniciar el servidor | 9 | 0 |
| s3-overlap | matriz de solapes (repo y HTTP), 409 con disponibilidad obsoleta | 36 | 0 |
| s4-concurrency | rondas concurrentes HTTP y repositorio | 12 | 0 |
| s5-rollback-pool-injection | control negativo, rollback, pool, inyección | 21 | 0 |
| s6-perf | tiempos y EXPLAIN con 0/5k/50k filas | 2 | 0 |
| s7-reminders | ventana, texto, repetición, concurrencia, fallos | 31 | 0 |

Honestidad sobre las ejecuciones: s1 y s7 fallaron antes en una aserción por errores míos de script (conté 7 FK en lugar de 6; un caso de control con ventana de 168 h contaminó un conteo; una ventana de 6 h dejaba fuera una cita de 6,5 h; un TRIGGER no se pudo crear por falta de privilegio SUPER). Los corregí en el script, no en el producto; los logs finales son las ejecuciones corregidas. s5 falló una vez por no incluir `recordedAt` obligatorio en mi payload y porque el usuario de la app no tiene privilegio PROCESS (usé consultas de solo lectura como root del contenedor local vía `docker compose exec` para `INNODB_TRX`/`PROCESSLIST`).

### 1. Migraciones y restricciones (Comprobado y aprobado)
- 6 tablas InnoDB más `schema_migrations`; 6 FK (pets.owner, appointments.pet y vet, medical_records.pet y vet, notification_logs.appointment); CHECK `chk_appointment_interval (ends_at > starts_at)`; UNIQUE `uq_notification_appointment_type (appointment_id,type)`; índices `idx_appointments_vet_start`, `idx_appointments_start`, `idx_history_pet_date`.
- Rechazos reales de MySQL: FK huérfana (pet, vet, owner, cita, notificación), `ends_at=starts_at` y `ends_at<starts_at` (`ER_CHECK_CONSTRAINT_VIOLATED`), duplicado de notificación (`ER_DUP_ENTRY`), NOT NULL, borrados con FK (`ER_ROW_IS_REFERENCED_2`).
- Dato relevante: la base no tiene restricción que impida solapes del mismo veterinario (un INSERT directo con solape se acepta). La protección vive solo en la transacción con bloqueo `FOR UPDATE` en `mysql-appointments.ts:13-37`. Es una decisión de diseño válida, pero toda escritura debe pasar por `reserve()`.
- Riesgo inferido sin reproducir: `scripts/migrate.ts` separa sentencias con `split(";")`. Con la única migración actual funciona; un futuro `;` dentro de una cadena o un trigger la rompería.

### 2. Persistencia tras reiniciar (Comprobado y aprobado)
Dueño, mascota (con fecha de nacimiento), cita, nota clínica se crean por API en el servidor 1 (PID 42153), se detiene (exit 0), arranca el servidor 2 (otro PID) y todo persiste; el hueco sigue "occupied" y una doble reserva da 409.

### 3. Matriz de solapes (Comprobado y aprobado)
Contra el SQL real de `MysqlAppointments.reserve()` (llamada directa al repositorio, sin validar horario): idéntica, contenida, envolvente, parcial inicio y parcial fin se rechazan con `APPOINTMENT_CONFLICT`; contigua antes y después se aceptan; 1 ms de solape (inicio y fin) se rechaza; 1 ms de separación se acepta; otro veterinario a la misma hora se acepta. Fin == inicio llega al CHECK de la BD. JOIN final: 0 solapes.
Distinción pedida: por el endpoint, los horarios fuera de rejilla se rechazan por validación de dominio con 400 (12:15, +1 ms, 15 y 60 min, fin<inicio, 09:30, 18:00, pasado), antes de llegar al SQL; el SQL detecta solapes arbitrarios (verificado solo llamando al repositorio). Límites 10:00-10:30 y 17:30-18:00 devuelven 201. Vet inexistente 404. Disponibilidad consultada y luego otra reserva: el POST con datos obsoletos devuelve 409, y la disponibilidad pasa a "occupied".

### 4. Concurrencia (Comprobado y aprobado)
- Mismo vet y horario, 20 rondas por cada N=2, 5 y 20, por HTTP real y directo al repositorio (6 combinaciones, 120 rondas): en cada ronda exactamente 1 aceptada, N-1 con 409/`APPOINTMENT_CONFLICT`, 0 otros errores, 1 fila.
- 20 vets distintos a la misma hora, 20 rondas, HTTP y repositorio: 20/20 aceptadas.
- Mezcla HTTP (4 bloques contiguos x 3 solicitudes, 20 rondas): 4 aceptadas y 8 conflictos siempre. Mezcla de solapes parciales directos al repositorio (inicios cada 10 min, 20 solicitudes, 20 rondas): 0 solapes, sin errores inesperados, 3.2 aceptadas de media. JOIN global: 0 solapes sobre 1.064 citas.
- Control negativo (prueba con dientes): el patrón "consultar y luego insertar" sin transacción produjo dobles reservas en 20/20 rondas con las mismas condiciones, así que la prueba detecta la carrera que `FOR UPDATE` evita.
- Rollback: mascota inexistente da 404, sin fila y sin transacciones abiertas (`INNODB_TRX`=0), y la siguiente reserva del mismo vet va bien. Un fallo del INSERT tras obtener el bloqueo (`ER_DATA_TOO_LONG` por motivo de 600 caracteres, pasado directo al repositorio) no deja fila ni bloqueo (siguiente reserva 3 ms).
- Pool (`connectionLimit=10`): 500 solicitudes fallidas en tandas de 50 concurrentes, más 60 fallos concurrentes tras el bloqueo; después `/health` y reservas siguen respondiendo y no quedan transacciones abiertas. Conexiones observadas: 20 (pool del script más pool del servidor, ambos al tope de 10).

### 5. Inyección (Comprobado y aprobado)
Código: ninguna consulta de `src/**` (sin `web`) concatena datos; todos los `execute` usan `?`. Los únicos `${}` están en textos de mensaje, no en SQL. grep de `query(` solo muestra `SELECT 1` y `SET TRANSACTION ISOLATION LEVEL`. Pruebas: 8 cargas (comillas, `x'); DROP TABLE owners; --`, `<script>`, `" OR "1"="1`, backslash, `%_`, emoji) en nombre de dueño, mascota, especie, raza, motivo y nota; se recuperan literalmente por SQL y no se elimina ninguna tabla (7 antes y 7 después). `date`, `veterinarianId` y `petId` hostiles dan 400/404, sin 500. No se probó el renderizado del HTML en el navegador (eso queda para D/E); aquí solo se comprobó que la API devuelve JSON sin interpretar.

### 6. Rendimiento (mediciones reales, 20 muestras por fila, HTTP local)
| Citas en BD | availability mediana / p95 | POST /appointments mediana / p95 | GET /appointments |
|---|---|---|---|
| 0 | 1.9 / 2.6 ms | 2.4 / 2.8 ms | 1 ms, 0 KiB |
| 5.000 | 5.1 / 7.0 ms | 2.2 / 2.5 ms | 11 ms, 769 KiB |
| 50.000 | 39.2 / 44.1 ms | 3.9 / 4.5 ms | 92 ms, 7.738 KiB |

EXPLAIN con 50.000 filas:
- Disponibilidad usa `list()`: `SELECT ... FROM appointments ORDER BY starts_at,id` sin WHERE: `type=ALL`, `key=NULL`, ~53.106 filas, filesort. Trae TODAS las citas de todos los veterinarios y fechas y filtra en memoria (`list-availability.ts:41-56`); el costo crece linealmente (1.9 a 39 ms).
- Conflicto (`reserve`): `range` sobre `idx_appointments_vet_start`, usa índice. Como la condición es `starts_at < fin` sin cota inferior, recorre todas las citas previas del veterinario (466 filas estimadas, 0.9 ms reales); crece con el historial de ese vet, no con la tabla.
- Recordatorios `findUpcoming`: `range` sobre `idx_appointments_start` y `eq_ref` en los joins y en el UNIQUE.
Riesgos de crecimiento (inferidos de la lectura y las mediciones, no defectos hoy): `GET /api/appointments`, `/pets` y `/owners` no tienen paginación (solo medí citas: 7,7 MiB con 50.000; no medí mascotas ni dueños); `availability` es O(total de citas). Una clínica con un veterinario genera unas 16 citas/día como máximo, así que 50.000 citas serían años; severidad baja.

### 7. Recordatorios (Comprobado y aprobado)
Reloj inyectado (2030-01-01T12:00:00Z, ventana 24 h) contra SQL real: se incluyen +1 ms, +1 s, +24 h−1 ms y +24 h exacto; se excluyen −1 s, 0 (inicio == ahora), +24 h+1 ms, citas pasadas y +2 días. La ventana es `ahora < inicio <= ahora+ventana`, como se pidió. Mover el reloj +1 ms hace entrar la de +24 h+1 ms sin reenviar las ya registradas.
- Destinatario y mascota correctos (dos dueños, dos mascotas). Texto real: `Recordatorio: Pelusa tiene una cita el 02/01/2030, 05:00 (America/Hermosillo). Correo simulado; no se envió un correo real.` (12:00Z = 05:00 hora de la clínica; no usa UTC).
- Repetidas: 2.ª y 3.ª ejecución envían 0. Concurrentes: 5 ejecuciones simultáneas sobre 120 citas, `sent` suma 120, 120 logs, 0 duplicados; 20 rondas más (4 citas nuevas + 5 ejecuciones simultáneas): siempre 4 y 4; ningún (cita,tipo) duplicado global.
- Fallo de persistencia: provoqué una violación real de FK (la cita desaparece entre la lectura y el INSERT, simulando carrera). `execute()` rechaza con `ER_NO_REFERENCED_ROW_2` (no se confunde con duplicado), no devuelve conteo, la cita que falló no deja registro, y la reejecución completa solo lo pendiente sin duplicar. Con el pool cerrado, `POST /api/notifications/run` devuelve 500 `INTERNAL_ERROR` genérico, sin detalles internos. Observación de diseño, no defecto: el envío no es atómico; si falla en la cita n, las anteriores ya están registradas (el contador `sent` de esa ejecución se pierde), pero es idempotente.
- Sin correo real: no hay dependencias de correo/cron en `package.json`, ni `nodemailer`, SMTP, `fetch`, `http.request` o sockets en `src/` (sin `web`). El texto lo declara simulado.
- Sin ejecución automática: no hay `setInterval`, cron ni `schedule` en el backend. El único disparador es `POST /api/notifications/run`, usado en la UI por el clic de `#run-reminders` (`src/web/app.ts:1033`). Con el servidor real 5 s después de arrancar, una cita dentro de las próximas 24 h no generó recordatorio; el POST manual sí. (Esa espera de 5 s no prueba por sí sola que no haya un timer largo; la ausencia de timers en el código sí.)

## Limitaciones: No comprobado
- Aislamiento ante caída de MySQL a mitad de transacción (kill de conexión): no lo probé; el rollback se verificó con errores de SQL y de aplicación.
- DST: Hermosillo no usa horario de verano; no se probó otra zona configurable.
- Rendimiento sobre red real o con MySQL con carga ajena.
- Renderizado de cargas HTML en la UI (D/E).
- Pruebas de crecimiento de `/pets` y `/owners`.

## Procesos y residuos
Ninguno propio. `coverage/` y `dist/` regenerados (ignorados por Git). `vetsync_test` queda sin filas `aud-` (verificado al final de cada script); el resto de filas de integración sigue como las dejó la última ejecución de `test:integration` / `test:coverage`.
