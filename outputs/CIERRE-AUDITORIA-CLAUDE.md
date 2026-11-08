# Cierre de la auditoría final de VetSync

8 de noviembre de 2026. Sigue a [`AUDITORIA-FINAL-CLAUDE.md`](AUDITORIA-FINAL-CLAUDE.md), que se conserva sin cambios, y complementa [`SEGUIMIENTO-AUDITORIA.md`](SEGUIMIENTO-AUDITORIA.md).

## 1. Commit y CI

- Commit verificado por CI: `7764084090f1f5d9c84859c5ad1f4c0e5b84bda4` (`main`, publicado en `origin`).
- Ejecución de CI para ese SHA: [run 42521263021](https://github.com/donatohdez/VetSync/actions/runs/42521263021), resultado **success**. Pasos: `npm ci`, migración, `npm run check`, instalación de Chromium, seed, `npm run test:e2e` y subida de artefactos.
- Un commit posterior añade este cierre y el enlace en el README. Solo cambia documentación; su propio run de CI se consulta en [GitHub Actions](https://github.com/donatohdez/VetSync/actions/workflows/ci.yml) y no se afirma aquí.
- Los cambios locales previos de Codex (F-01 en `src/web/app.ts`, la prueba nueva, las evidencias 15 y 16, la reflexión actualizada y los originales de la auditoría) estaban sin commit y sin publicar al empezar. Se integraron y se publicaron en los cuatro commits de esta ronda.

| Commit | Propósito |
| --- | --- |
| `b355b75` | Backend y sus pruebas: errores HTTP, fechas, límites de agenda y fuente única del horario |
| `266733c` | Interfaz, CSS y pruebas de navegador: recuperación ante fallos, contraste, diseño y capturas del e2e |
| `8d1f95d` | Contratos, arquitectura, informe de pruebas, bitácoras y reflexión |
| `7764084` | Evidencias de la auditoría y de su cierre |

## 2. Estado de cada hallazgo

Estados: **corregido** (con regresión y verificación), **verificado sin cambio**, **pendiente humano**, **pospuesto** (con motivo).

| ID | Estado | Qué se hizo y evidencia |
| --- | --- | --- |
| F-01 | Corregido | El POST confirmado no se repite si falla el refresco; el refresco tolera fallos parciales y deduplica por id. Cubre dueño, mascota, nota y cita. Evidencia: `tdd/15`, `tdd/16`, `cierre-auditoria/B/` |
| F-02 | Corregido | Pruebas de «ahora exacto» en agendar y en disponibilidad, y de dos veterinarios (unitaria y MySQL real). Sensibilidad en la sección 5. Evidencia: `cierre-auditoria/A/05-mutantes.txt` |
| F-03 | Pendiente humano | Aclarado en la bitácora (selección, mensaje breve de la entrada 02, prompt de la 03 redactado por Codex, entrada 05 en tres mensajes). El estudiante debe confirmar que las cinco entradas son fieles |
| F-04 | Corregido en documentación | Se aclara que la fecha de modificación de un archivo no prueba alteración ni registro simultáneo, y que no hay captura automática de cada mensaje |
| F-05 | Pendiente humano | La reflexión (325 palabras, menos de 500) conserva el aporte real del estudiante y atribuye a los asistentes la implementación y las pruebas. Falta su lectura final |
| F-06 | Corregido | 4xx por tipo conocido (charset, codificación, parámetro mal codificado); 500 genérico para errores internos reales. Evidencia: `cierre-auditoria/A/` |
| F-07 | Corregido | El `petId` se normaliza antes de validar, guardar y consultar; la integración comprueba que no se guardan espacios |
| F-08 | Corregido | Tras un 409 se consulta de nuevo la disponibilidad, el bloque ocupado se libera y los datos se conservan; si la consulta falla, Guardar queda deshabilitado con «Reintentar consulta» |
| F-09 | Corregido | Error visible del selector requerido, con `aria-invalid`, `aria-describedby`, `role=alert` y foco al primer campo inválido |
| F-10 | Corregido | Textos pequeños y foco por encima de los umbrales. Cálculo propio sobre colores computados, no una herramienta certificada. Ver F-24 |
| F-11 | Corregido | `overflow-wrap` en historial y tarjetas; sin desbordamiento horizontal en los cuatro anchos |
| F-12 | Corregido | Anchos mínimos y máximos de columnas en la agenda; Estado visible a 1440 px y veterinario completo en móvil |
| F-13 | Corregido | «Ver historial» alineado al pie de las tarjetas de cada fila (1440 y 768 px), con el fondo, borde y flecha anteriores |
| F-14 | Corregido en la interfaz; pospuesto en el backend | Nuevo `src/web/messages.ts` traduce errores de validación y de red. Los mensajes del servidor siguen en inglés. Se pospone localizarlos en `parse()` porque la interfaz ya los cubre |
| F-15 | Corregido | Una sola parada de Tab en el grupo de horarios; flechas, Home y End saltan los bloques ocupados |
| F-16 | Corregido | Controles bloqueados durante el guardado y sin «Volver a la cita» residual |
| F-17 | Corregido | Las capturas del e2e van a `work/playwright-results`; `docs/evidencias/capturas/` queda solo documental y el CI ya no la sube. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` está documentado |
| F-18 | Corregido | `setUTCFullYear` evita convertir años menores de 100 en 1900-1999. El nacimiento se compara con el día de la clínica y con el rango de `DATE` de MySQL (desde 1000-01-01, razón técnica). No se impuso una edad máxima. El máximo del campo en la interfaz usa el día de la clínica; esto último no tiene regresión automática, solo typecheck y compilación |
| F-19 | Corregido | OpenAPI sin códigos imposibles en los GET; `/notifications/run` solo acepta `{}` o ausencia de cuerpo; `/config` con `bookingHours` probado |
| F-20 | Verificado sin cambio | `test1.md` se conserva y ahora figura en el README. No se cambió el autor de Git ni el nombre de la materia («Ingeniería de de Software», literal del usuario) |
| F-21 | Corregido | `clinicHours` es la única fuente; la interfaz lee el horario de `/config`. `ARQUITECTURA.md` documenta disponibilidad, zona de clínica frente a zona del dispositivo y rutas por caso de uso |
| F-22 | Corregido en lo objetivo | Botón de borrar de los buscadores, título del recordatorio, migas a 320 px y doble anillo de foco. Quedan como preferencias sin cambiar: insignia de notas a 320 px y placeholder del buscador de pacientes a 320 px |
| F-23 (nuevo) | Corregido | La verificación visual final halló el horario seleccionado ilegible con el puntero encima (1.08:1). Rojo en `final/06-rojo-contraste.txt`, verde en `final/07-verde-contraste.txt` |
| F-24 (nuevo) | Corregido | `(opcional)` a 10 px con 4.29:1; ahora supera 4.5:1. Misma evidencia que F-23 |

## 3. Cambios principales

- **Backend:** `src/http/app.ts`, `src/modules/medical-records/application/medical-records.ts`, `src/modules/pets/application/pets.ts`, `src/modules/appointments/domain/clinic-hours.ts`, `src/modules/appointments/application/list-availability.ts`, `src/shared/clock.ts`, `src/composition.ts`.
- **Interfaz:** `src/web/app.ts`, `src/web/messages.ts` (nuevo), `src/web/components/select.ts`, `src/web/index.html`, `src/web/styles.css`.
- **Pruebas nuevas:** `tests/unit/http-errors.test.ts`, `pets.test.ts`, `medical-records.test.ts`, `clinic-hours-source.test.ts`, ampliaciones de `appointments.test.ts`, `availability.test.ts` y `tests/integration/api.test.ts`, más `tests/e2e/recovery.spec.ts` (nuevo) y ampliación de `polish.spec.ts`.
- **Configuración:** `playwright.config.ts` (solo un comentario) y `.github/workflows/ci.yml` (artefactos).
- **Documentación:** `README.md`, `docs/api/API.md`, `docs/api/openapi.json`, `docs/arquitectura/ARQUITECTURA.md`, `outputs/INFORME-PRUEBAS.md`, bitácoras y reflexión.

## 4. Pruebas, conteos y cobertura reales

Verificación final local, secuencial. Logs con comando, hora y código de salida en `docs/evidencias/cierre-auditoria/final/`.

| Comprobación | Resultado | Salida |
| --- | --- | --- |
| `git diff --check` | sin avisos | |
| `npm run check` (tipos, linter, compilación, cobertura) | código de salida 0; 133 pruebas | `01-check.txt` |
| `npm test` | 96 unitarias, código de salida 0 | `02-unitarias.txt` |
| `npm run test:integration` (`vetsync_test`) | 37 aprobadas, código de salida 0 | `03-integracion.txt` |
| `npm run db:seed` solo sobre `vetsync_test` | código de salida 0 | `04-seed.txt` |
| `npm run test:e2e` (Chromium headless shell 1234) | 29 aprobadas, código de salida 0 | `05-e2e.txt` |
| Cobertura de backend | líneas 99.24 %, ramas 97.29 %, funciones 98.76 %, sentencias 98.56 % | `01-check.txt` |

Antes de esta ronda había 49 unitarias, 32 de integración y 10 de navegador. La cobertura mide el backend; `src/web/**`, `server.ts`, `shared/config.ts` y `composition.ts` están excluidos. Una cobertura alta no demuestra ausencia de defectos. El e2e fue más lento que en la ejecución previa por carga de la máquina; no hubo fallos.

Las pruebas `recovery` y `polish` usan respuestas HTTP controladas, no un fallo real de MySQL ni de red. Solo `booking` y `clinic` usan MySQL.

## 5. Rojo/verde y sensibilidad a mutaciones

- **Backend:** antes de los arreglos fallaron 24 unitarias y 3 de integración por la razón esperada (por ejemplo, `petId` con espacios daba 500). Una primera ejecución roja se sobrescribió tras corregir dos defectos de las propias pruebas; la evidencia final es la segunda.
- **Navegador:** de 16 casos nuevos fallaron 13 antes de los arreglos. Tres aprobaron desde el inicio porque la corrección local previa ya los cubría (fallo parcial del refresco, cadena cita > mascota > dueño y reintento tras fallo real del POST); no se fabricó una fase roja. Dos casos se corrigieron en la propia prueba tras el rojo, así que su forma final no se vio en rojo.
- **F-23 y F-24:** rojo con 1.08:1 y 4.29:1, verde tras el cambio de CSS. Una limpieza posterior de líneas sobrantes en una de esas pruebas se hizo después de registrar el rojo.
- **Mutaciones**, en una copia aislada ya borrada:

| Mutante | Con las pruebas anteriores | Con las nuevas | Clasificación |
| --- | --- | --- | --- |
| Agendar: `<=` a `<` | sobrevive | muere | hueco real cerrado |
| Disponibilidad: `<=` a `<` | sobrevive | muere | hueco real cerrado |
| Quitar el filtro por veterinario | sobrevive | muere | hueco real cerrado |
| `endsAt <= startsAt` a `false` | sobrevive | muere | cerrado por el mensaje; en código es redundante con la duración exacta |
| Cierre a las 18:00 | muere | muere | análogo, porque esa comprobación se reestructuró |
| Quitar `!sameDay` | sobrevive | sobrevive | equivalente: es una comprobación defensiva |

Las pruebas de límite exacto aprueban en el código correcto; su evidencia de sensibilidad es el fallo con el mutante, no una fase roja.

## 6. Revisión visual con navegador real

Chromium headless shell 1234 con Playwright. Se revisaron capturas en **1440, 768, 390 y 320 px** de Agenda, Pacientes, Historial y Recordatorios, con datos sembrados y con nombres de más de 100 caracteres sin espacios; los cuatro formularios; selectores abiertos; errores, estados vacíos y de carga; modales a 390×600 y 320×500; y foco por teclado. Las medidas fueron: X de cerrar centrada (dx=0, dy=0), flechas de selectores a 17 px del borde, flecha de «Ver historial» a 15 px, sin desbordamiento horizontal en los cuatro anchos y Guardar alcanzable en los modales.

- Las capturas finales están en `docs/evidencias/cierre-auditoria/final/visual/` (48 imágenes) y las de la corrección de CSS en `docs/evidencias/cierre-auditoria/C/` (antes y después).
- El agente verificador abrió con la herramienta de lectura las capturas que cita. Yo abrí tres para contrastar: el error del selector requerido a 1440 px, la agenda con texto largo a 390 px y Pacientes a 1440 px. Coinciden con la descripción.
- El agente de CSS abrió las suyas y lista cuáles no abrió; de esas solo cita medidas numéricas.
- El contraste es un cálculo propio con la fórmula WCAG sobre colores computados, no una herramienta certificada. Las cifras de contraste de los agentes (42 combinaciones antes y 0 después) no son comparables con las 19 de la auditoría original; se usó un conjunto de datos distinto.

## 7. Limitaciones de la validación

- No se probaron Firefox, Safari, iOS, Chrome con interfaz, dispositivos físicos, teclado virtual, lectores de pantalla, alto contraste forzado ni zoom real del navegador.
- No se midió el contraste en estado hover de otros controles ni se revisó cada combinación «seleccionado más hover» fuera de los horarios.
- No se revisaron los formularios a 768 px ni los selectores abiertos de mascota, dueño y horarios en captura (solo el de veterinario), ni el historial con notas a 1440 y 768 px con datos simulados.
- Quedan sin cambiar como preferencias: el mensaje «Correo electrónico no es un correo válido.» se lee raro, los campos no se atenúan durante el guardado y los nombres numéricos largos se parten por carácter a 768 px.
- El texto de los errores de validación del servidor sigue en inglés (F-14).
- La verificación de que la base de demostración `vetsync` no se alteró consiste en que ningún comando de esta ronda la apuntó: el seed y la integración usan `vetsync_test`. No hay una comprobación independiente del contenido de `vetsync`.
- `vetsync_test` conserva datos de las pruebas y del seed, incluidos registros con sufijos numéricos creados por el e2e.

## 8. Pendientes académicos que requieren al estudiante

- Leer y confirmar las cinco entradas de `BITACORA-PROMPTS.md` (F-03), en particular que la entrada 02 es un mensaje breve y que el prompt de la 03 lo redactó Codex.
- Leer el texto final de `REFLEXION-TECNICA.md` y confirmar que refleja su experiencia (F-05). No se da por hecha esa lectura.
- Verificar la fecha límite y la zona horaria en la plataforma al entregar, y enviar el enlace y los documentos.
- Comprender las decisiones principales del proyecto para poder explicarlas.

## 9. Estado final de Git y procesos

- Rama `main` sincronizada con `origin/main` tras el push de los cuatro commits, sin push forzado ni reescritura de historia. El commit que añade este cierre se publica después, como se indica en la sección 1.
- Árbol de trabajo sin cambios pendientes salvo este documento y el enlace del README antes de su commit. `work/`, `dist/` y `coverage/` están ignorados por Git.
- Procesos: solo sigue en escucha el servidor de demostración del usuario en el puerto 3010 (PID 38439), que no se tocó. Los servidores de prueba de los puertos 3011, 3012, 3013 y 3014 están detenidos, y las copias de mutación se borraron.
