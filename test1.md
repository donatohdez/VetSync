# Revisión independiente de VetSync (test1)

Fecha: 2026-11-08. Herramienta: Claude Code (Sonnet 5.5), modo de revisión: sin cambios en el código, sin commits y sin leer `.env`. Las escrituras de prueba se hicieron solo en `vetsync_test`.

Prompt usado: `outputs/REVISION-CON-CLAUDE.md`.

**Resumen:** no hay errores críticos ni altos. El único hallazgo de severidad media es de pruebas, no de comportamiento.

## Hallazgos

### Media

**M1. Los límites de solapamiento y de ventana de recordatorios se prueban contra dobles en memoria, no contra el SQL real.**

- **Dónde:** `tests/unit/appointments.test.ts:10-34` y `tests/unit/reminders.test.ts:12-16` reimplementan el predicado. El SQL de producción está en `mysql-appointments.ts:26` y `mysql-reminders.ts:15`.
- **Escenario:** alguien cambia `a.starts_at<=?` por `<` en el SQL de recordatorios, o altera un operador del predicado de cruces.
- **Efecto:** la matriz unitaria sigue en verde porque prueba su propio doble. La integración solo cubre un solape (10:15), una cita contigua posterior y un recordatorio dentro de la ventana.
- **Evidencia:** deducido por lectura; no se ejecutó la mutación del SQL de recordatorios. La integración no tiene casos a +24 h exactos, a `now` ni a +25 h. Tampoco cubre contigua anterior, envolvente ni contenida.
- **Corrección mínima:** llevar a `tests/integration/api.test.ts` la misma matriz con `it.each`: los 5 solapes, las 2 contiguas y los casos −1, 0, +1, +24 y +25 h.

### Baja

**B1. `CLINIC_TIMEZONE` no se valida al arrancar.**

- **Dónde:** `src/shared/config.ts:11` (`z.string()`).
- **Escenario:** un valor como `Foo/Bar`.
- **Efecto:** el servidor arranca y la interfaz falla después al formatear fechas. `new Intl.DateTimeFormat("es-MX",{timeZone:"Foo/Bar"})` lanza `RangeError`, comprobado con Node.
- **Corrección:** agregar un `.refine` que intente construir el `Intl.DateTimeFormat`.

**B2. El mensaje del recordatorio muestra la hora en UTC.**

- **Dónde:** `send-reminders.ts:22` usa `toISOString()`.
- **Efecto:** una cita de las 10:00 en Hermosillo se registra como `…17:00:00.000Z`, mientras la agenda muestra la hora de la clínica.
- **Corrección:** inyectar la zona horaria en `SendReminders` y formatear con ella.

**B3. No hay límite de duración ni de horizonte para las citas.**

- **Dónde:** `schedule-appointment.ts:38`.
- **Escenario:** una cita de un año, o una en el año 9999.
- **Efecto:** la sonda devolvió 201 en ambos casos y el veterinario queda bloqueado todo ese periodo.
- **Alcance:** la matriz declara que la duración no está definida. Es una mejora de validación, no un incumplimiento.

**B4. `rollback()` puede ocultar el error original.**

- **Dónde:** `src/shared/database.ts:29-30`.
- **Escenario:** la conexión se cae durante la transacción.
- **Efecto:** el `await connection.rollback()` lanza y se pierde la causa. No se reprodujo.
- **Corrección:** envolver el rollback en su propio `try/catch` y relanzar el error original.

### Opcionales y limitaciones

- **Migraciones (`scripts/migrate.ts:27`):** `split(";")` es frágil con punto y coma dentro de literales. No hay candado ni atomicidad, porque el DDL de MySQL confirma implícitamente. Hoy solo existe `001`.
- **Rutas relativas al directorio actual:** `express.static(path.resolve("dist/web"))` (`app.ts:97`) y `readdir("database/migrations")` solo funcionan desde la raíz del proyecto.
- **Misma mascota con dos veterinarios:** se permite en horarios simultáneos. R02 solo exige no chocar por veterinario.
- **CI:**
  - Sin ejecutar en remoto, como ya declara el README.
  - Las acciones se fijan por tag (`@v4`), no por SHA.
  - No hay `format:check` ni `npm audit`.
  - El e2e corre sobre `vetsync_test` con los datos que dejó la integración; no se verificó.
- **Alcance local ya declarado:** sin autenticación, sin paginación y sin planificador automático. No se cuenta como hallazgo.

## Categorías sin fallos comprobables

- **Concurrencia de citas:**
  - 40 solicitudes simultáneas con intervalos desfasados dieron 14 creadas, 26 con 409 y 0 errores. Un `JOIN` de autoverificación no encontró solapes en la base.
  - Una subclase sin `FOR UPDATE`, cargada solo en la sonda, duplicó la reserva en **30 de 30 rondas**. La prueba concurrente existente sí detecta quitar el bloqueo.
  - El bloqueo de la fila del veterinario con `READ COMMITTED` es correcto, y el intervalo semiabierto permite citas contiguas.
- **Recordatorios duplicados:** la restricción única `(appointment_id, type)` y el manejo de `ER_DUP_ENTRY` son correctos. La integración con dos ejecuciones concurrentes pasa. La ventana usa un único `now` por ejecución.
- **Inyección SQL:** todas las consultas son parametrizadas. No hay SQL dinámico salvo los nombres fijos de tablas en el `DELETE` de pruebas.
- **XSS:** la interfaz usa `textContent` en todos los datos externos y no hay `innerHTML`. Helmet aplica CSP por defecto y no hay scripts ni estilos en línea.
- **Secretos y errores:**
  - El 500 oculta detalles y una prueba lo verifica.
  - Las credenciales de `compose.yaml` y del CI son ficticias y de solo localhost.
  - `.env` está ignorado por Git.
- **Archivos servidos:** solo se sirve `dist/web`. `/app.ts` y `/.env` devuelven 404.
- **Asociaciones:** las referencias de mascota, dueño y veterinario se validan, y las claves foráneas las respaldan.
- **POST sin cuerpo a `/api/notifications/run`:** devuelve 415. No es un error, porque `API.md:5` ya indica enviar `{}`. Se descartó como falso positivo.

## Pruebas ejecutadas

| Comprobación | Resultado |
| --- | --- |
| `npm run typecheck` | sin errores |
| `npm run lint` | sin errores |
| `npm test` | 24/24 pruebas pasan |
| `npm run build` | correcto |
| `npm run test:integration` | 12/12 pruebas pasan, sobre `vetsync_test` |
| Sonda propia, fuera del repositorio | resultados en la sección de concurrencia |

## Limitaciones de la revisión

- No se ejecutó Playwright ni la cobertura, porque esta última escribe en `coverage/`.
- No se revisó el CI remoto.
- La sonda corrió en un solo proceso Node. El bloqueo vive en MySQL, así que debería valer igual con varios procesos, pero no se probó.
- `npm run build` regeneró `dist/`, que Git ignora.
- Tras la sonda, `vetsync_test` quedó con filas mínimas (`o1`, `p1`, `v1`) en lugar de los datos del seed. Para volver a correr el e2e, ejecutar `DB_NAME=vetsync_test npm run db:seed`. La base de demostración `vetsync` no se tocó.

## Siguiente paso

Comprobar cada hallazgo contra el código antes de corregirlo, como indica `AGENTS.md`. Para M1, escribir primero la prueba de integración y registrar que falla al mutar el SQL. Registrar también los falsos positivos y las decisiones justificadas en la bitácora.
