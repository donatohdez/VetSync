# Conteo de pruebas por lectura de archivos (sin ejecutar la suite)

Fecha: 2026-11-08. Commit 637ce0b. Método: lectura de `it(`, `it.each`, `test(` y tamaño de cada arreglo `each`.

| Archivo | Casos |
| --- | --- |
| tests/unit/appointments.test.ts | 1 + 5 (solape) + 2 (contiguas) + 1 + 9 (entrada inválida) + 2 (referencias) + 7 (horario clínica) + 1 (17:30) = 28 |
| tests/unit/availability.test.ts | 1 + 1 + 1 + 3 (fechas inválidas) + 1 = 7 |
| tests/unit/environment.test.ts | 2 + 3 + 1 = 6 |
| tests/unit/reminders.test.ts | 4 + 2 (zonas) = 6 |
| tests/unit/transaction.test.ts | 2 |
| **Unitarias** | **49** (coincide con la documentación) |
| tests/integration/api.test.ts | 12 `it` sueltos + 3 `it` (zona, disponibilidad x2) + 7 (intervalos SQL) + 5 (ventana SQL) + 5 (horario por API) = **32** (coincide) |
| tests/e2e/booking.spec.ts | 1 + 2 (bucle 1440/390) = 3 |
| tests/e2e/clinic.spec.ts | 2 |
| tests/e2e/polish.spec.ts | 5 |
| **E2E** | **10** (coincide) |

Total backend 81 (49 + 32), coincide con `docs/evidencias/pruebas/verificacion-recepcion.txt` ("81 passed", 6 archivos) y con la lista de 10 casos de `navegador-recepcion-final.txt`.

Reflexión (`outputs/REFLEXION-TECNICA.md`): `wc -w` = 370 contando el token `#` del título; palabras reales = 369 (título 7 + cuerpo 362). Menos de 500.

SHA-256 de `test1.md` y `docs/evidencias/revision/claude-test1-original.md`: idénticos, a13154393d96ab549450552a2d079997ec190a06f16ff58665457d702acc7268 (coincide con lo citado).

Enlaces relativos y rutas en código de README, outputs/*.md y docs/**/*.md: 0 rotos (script ad hoc de lectura).

`gh run list` (solo lectura): los últimos 6 runs de main son `success`, incluido el del commit 637ce0b (run 42512084073, 2026-11-08T18:51:37Z).

`npm-audit.json` archivado: 0 vulnerabilidades (info, low, moderate, high, critical = 0). No se re-ejecutó.
