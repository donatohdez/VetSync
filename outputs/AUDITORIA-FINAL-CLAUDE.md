# Auditoría final de VetSync (Claude Code)

Fecha: 2026-11-08. Modo auditoría: no se modificó código de aplicación, pruebas ni documentación existente. No hubo commits, push, despliegues ni correos.

## 1. Veredicto

**Listo con observaciones.**

No se reprodujo ningún defecto que impida la demostración académica. Las reglas de negocio centrales funcionan: 16 bloques, 30 minutos, zona de clínica, conflictos, concurrencia y recordatorios. Persisten en MySQL y las comprobaciones de seguridad básica salieron limpias. Esto describe lo comprobado en esta auditoría, no una garantía total.

Antes de entregar hay dos grupos de observaciones:

- **Técnicas (F-01, F-02):** conviene corregirlas, pero no bloquean.
- **De honestidad académica (F-03 a F-05):** requieren una acción del estudiante. Son el punto más delicado para la evaluación.

## 2. Commit auditado, entorno y alcance real

- Commit: `637ce0be2dbaa30db795ba4b333f413847d56d80` (`main`). Estado de Git al inicio: limpio.
- Entorno: macOS (Darwin), Node v24.12.0, npm 11.6.2, Docker 29.9.1, MySQL 8.4 en contenedor. Inventario en `work/auditoria-final/00-inventario.md`.
- Navegador: Chrome for Testing 151 (headless shell 1234) con Playwright 1.65. No es Chrome con interfaz.
- Método: cinco subagentes, en el orden siguiente.
  - A (requisitos y documentación), B (dominio, API y arquitectura) y C (MySQL, concurrencia y recordatorios) en paralelo.
  - D (navegador y accesibilidad) después de C.
  - E (diseño visual) después de D.
  - Los accesos a MySQL con escrituras y los de navegador fueron secuenciales, para no compartir `vetsync_test`.
- Quién comprobó qué:
  - Los resultados de A–E son los de cada subagente, y el detalle está en `work/auditoria-final/<letra>/INFORME.md`.
  - El orquestador solo comprobó por sí mismo el estado de Git, los procesos y los archivos creados.
  - No repitió las mediciones de los subagentes.
- Datos: la base de demostración `vetsync` no se tocó. Toda escritura fue en `vetsync_test`, con guarda `SELECT DATABASE()`.

## 3. Matriz requisito → comprobación → resultado → evidencia

Estados: ✅ comprobado y aprobado · ⚠️ aprobado con observación · 🔴 defecto reproducido · ❔ no comprobado.

| Requisito | Comprobación | Resultado | Evidencia |
| --- | --- | --- | --- |
| R01 Dueños, mascotas e historial | Lectura de código, API directa, navegador, SQL | ✅ Altas, asociaciones, historial por mascota, orden, vacío y HTML como texto | A, B, D |
| R02 Citas sin choques por veterinario | Matriz SQL real, 120 rondas concurrentes, navegador | ✅ Ver §5 | C |
| R03 Recordatorio simulado | SQL real con reloj controlado | ✅ Ventana, destinatario, zona y sin duplicados | C |
| R04 Monolito modular, SOLID | Grep de imports y lectura | ✅ Sin importaciones cruzadas; el dominio no importa express ni mysql | B |
| R05–R06 Esquema y reglas | Migraciones y restricciones por SQL | ✅ 6 FK, CHECK y UNIQUE rechazan violaciones | C |
| R07 TDD e informe | Conteo real de pruebas | ⚠️ Coincide con el informe; hay mutantes que sobreviven (F-02) | C, B |
| R08 Revisión con IA | Lectura de documentos | ⚠️ Ver F-03 a F-05 sobre atribución | A |
| R09 CI | `gh run list` | ✅ Los 6 últimos runs de `main` en success, incluido el del commit auditado | A |
| R10 README y API | Contraste 14 rutas contra OpenAPI | ⚠️ Diferencias menores (F-17) | A, B |
| E01–E03 Entrega | Lectura de documentos | ⚠️ Pendientes de revisión humana (F-03 a F-05) | A |
| Reglas del usuario: 16 bloques 10:00–17:30 | 16 zonas, incluidas las de cambio de horario de verano | ✅ | B, D |
| 30 min, rechazo de 18:00, anterior a 10:00, minutos fuera de rejilla, segundos/ms, pasado, fechas imposibles, sin zona | Por API directa | ✅ | B, C |
| Una fecha y una hora, fin calculado | Navegador | ✅ | D |
| Disponibilidad por veterinario y fecha; pasados y ocupados deshabilitados | Navegador y API | ✅ | C, D |
| Disponibilidad vieja no reemplaza una consulta nueva | Respuestas retrasadas con `page.route` | ✅ En fecha, veterinario e historial | D |
| Revalidación transaccional | POST con disponibilidad obsoleta | ✅ 409 | C |
| Alta de dueño y mascota durante la reserva, con borrador preservado | Navegador | ✅ | D |
| Volver, cancelar y cerrar sin mezclar formularios | Navegador | ⚠️ Un residuo menor (F-16) | D |
| Doble envío | Doble clic y Enter repetido | ✅ 1 POST y 1 fila | D |
| Recuperación tras red caída | `page.route` con abort | ✅ | D |
| Guardado exitoso seguido de fallo al refrescar | POST ok y GET fallido | 🔴 Ver F-01 | D |
| Recordatorios simulados, sin ejecución automática | Búsqueda de timers y cron, navegador | ✅ Solo botón y endpoint manual | C, D |
| Fuera de alcance: portal, autenticación, videollamadas, cancelación, reprogramación | Lectura | ✅ No hay nada de eso | A |

## 4. Hallazgos únicos, por severidad

Los IDs F-xx son de este informe. Se indica el ID original de los subagentes entre paréntesis. Ninguno bloquea la entrega técnica. Las rutas de evidencia son relativas a `work/auditoria-final/<letra>/` y `docs/evidencias/auditoria-final/<letra>/`.

### Media

**F-01. Un refresco fallido tras un guardado correcto se muestra como error de guardado, y reintentar duplica registros** (B-03 = D-01) — 🔴 reproducido.
- **Pasos:**
  1. Abrir un formulario (dueño, nota o mascota con dueño).
  2. Con `page.route`, hacer que el POST funcione y que el GET de refresco falle.
  3. Guardar y pulsar Guardar de nuevo.
- **Esperado:** aviso de éxito, o al menos no reintentar el POST.
- **Real:**
  - El diálogo sigue abierto con mensaje de error.
  - Al reintentar, dueño pasa de 1 a 2 filas y nota de 1 a 2 filas.
  - En la cadena cita→mascota→dueño quedan 2 filas del dueño.
  - En citas, el reintento da 409 contra la propia cita.
- **Código:** `src/web/app.ts` aprox. 940-941 y 962 (`refresh()` dentro del `try` del submit).
- **Corrección mínima:** separar el `try` del guardado del `refresh()`. Si el POST ya funcionó, cerrar el diálogo y avisar éxito. Si falla el refresco, mostrar un aviso aparte.
- **Bloquea:** no. Es una decisión del equipo.

**F-02. Hay pruebas que aprueban aunque haya una regresión** (B-10) — 🔴 comprobado por mutación manual en una copia; `src/` y `tests/` originales intactos.
- Seis mutantes sobrevivieron con 49/49 pruebas unitarias en verde (`work/auditoria-final/B/mutaciones.log`).
- Dos son huecos reales:
  - Cambiar `startsAt <= now` por `<`, en agendar y en disponibilidad. El único caso de «ahora exacto» se rechaza por horario antes de llegar al límite.
  - Quitar el filtro por veterinario en `list-availability.ts:44`. Ninguna prueba, unitaria ni de integración, lo detecta.
- Los otros 3 mutantes son código redundante y no indican hueco de prueba.
- Además, `owners`, `pets`, `medical-records` y `http/app.ts` no tienen pruebas unitarias propias. Solo las cubre la integración.
- **Corrección mínima:** una prueba de «ahora exacto» en un horario válido y una de disponibilidad con dos veterinarios, ambas escritas primero para verlas fallar.
- **Bloquea:** no.

**F-03. Los «cinco prompts exactos» son una selección con matices** (A-03) — ⚠️ riesgo documental.
- La entrada 02 usa el mensaje «claude ya está instalado… empecemos» como origen de toda la implementación.
- La 03 es un prompt redactado por la IA y pegado por el estudiante. Está declarado.
- La 05 agrupa tres mensajes separados.
- Los textos citados sí coinciden literalmente con `docs/ia/prompts/*.txt`. Las respuestas son documentos producidos, no transcripciones, y la bitácora lo dice.
- **Acción:** el estudiante debe revisar que cada entrada describa fielmente qué prompt fue y qué se hizo con él.
- **Bloquea:** no, pero requiere acción antes de enviar.

**F-04. Los prompts parecen haberse guardado por lotes, no «desde el inicio»** (A-04) — riesgo inferido, sin reproducir.
- `AGENTS.md` exige guardar prompts y respuestas desde el inicio.
- Las fechas de modificación de `docs/ia/prompts/*` son posteriores a commits de implementación:
  - 01 y 02 a las 09:47, con primer commit a las 09:24.
  - 03 y 04 a las 10:20, con commit a las 10:16.
  - 06 a 08 a las 11:36, con commits a las 11:01 y 11:22.
- Esto sugiere registro a posteriori. No prueba que se alteraran los textos, y la documentación no lo declara.
- **Acción:** declarar en la bitácora que el registro fue posterior, si así fue. No debe presentarse como registro simultáneo.
- **Bloquea:** no.

**F-05. La reflexión técnica atribuye al estudiante trabajo de otras herramientas** (A-05) — ⚠️ riesgo de atribución.
- `outputs/REFLEXION-TECNICA.md` está en primera persona y describe trabajo hecho por Codex (mutaciones SQL, análisis de carga cognitiva). Según la bitácora, Claude solo revisó.
- El aporte propio del estudiante en el texto son unas 36 palabras. Mide 369 palabras reales (`wc -w` da 370 por el `#` del título), por debajo de 500.
- Los documentos ya la marcan como pendiente de lectura del estudiante.
- **Acción:** el estudiante debe reescribirla o confirmarla a partir de su experiencia real (`AGENTS.md`: «la reflexión se redactará a partir de la experiencia real del estudiante»).
- **Bloquea:** no técnicamente. Para la entrega, sí conviene resolverlo.

### Baja-media

**F-06. Errores de cliente salen como 500** (B-01) — 🔴 reproducido.
- **Casos:**
  - Charset distinto de UTF-8 (`iso-8859-1`).
  - `Content-Encoding` gzip inválido o `br`.
  - Porcentaje mal formado en un parámetro de ruta, por ejemplo `/api/pets/%E0%A4%A/medical-records`.
- **Esperado:** 4xx. **Real:** 500 `INTERNAL_ERROR`, sin fuga de detalles.
- **Código:** `src/http/app.ts:107-149` (manejador de errores).
- **Corrección mínima:** mapear `error.status` o `statusCode` 4xx de body-parser y de la decodificación de rutas a su código.
- **Bloquea:** no.

**F-07. El `petId` de ruta se valida recortado pero se guarda con espacios** (B-02) — reproducido en la app con un doble; efecto en MySQL inferido.
- `POST /api/pets/%20pet-1%20/medical-records` devuelve 201 con `petId " pet-1 "` en el doble. En MySQL se esperaría 500 por FK o colación, pero **no se verificó**.
- **Código:** `medical-records.ts:29-50`.
- **Corrección mínima:** usar el valor ya parseado y recortado, o rechazar espacios.
- **Bloquea:** no.

**F-08. Tras un 409 la UI no vuelve a consultar disponibilidad** (B-04 = D-02) — 🔴 reproducido.
- El bloque conflictivo sigue seleccionado y habilitado, sin «Ocupado», y Guardar sigue activo. Sí se puede elegir otro turno y guardar.
- **Código:** `app.ts` aprox. 962-977.
- **Corrección mínima:** al recibir 409, repetir la consulta de disponibilidad y deseleccionar el bloque.
- **Bloquea:** no.

**F-09. Un `<select>` requerido sin elegir solo mueve el foco, sin mensaje visible** (D-04) — reproducido, formulario de mascota.
- **Corrección mínima:** mostrar un mensaje visible asociado al campo.

**F-10. Contraste insuficiente en texto pequeño y en foco** (D-06) — cálculo propio con la fórmula WCAG sobre colores computados; no se usó axe-core.
- 19 combinaciones de texto de 10–12 px quedan entre 3.94:1 y 4.49:1, por debajo de 4.5:1.
- El anillo de foco da 2.36:1 y el borde de los campos en reposo 1.33:1. Esas dos cifras dependen de qué criterio aplique al foco y a los bordes, y no son una medición con herramienta certificada.
- **Evidencia:** `work/auditoria-final/D/`.
- **Corrección mínima:** oscurecer los grises afectados y reforzar el anillo de foco.

**F-11. Historial médico: texto largo sin espacios desborda la tarjeta y provoca scroll horizontal** (E-01) — 🔴 reproducido.
- Raza, dueño y veterinario de 100+ caracteres sin espacios. El documento mide `scrollWidth` 1148 en 768 px y 785 en 390 y 320 px. A 1440 px no ocurre, y con espacios no ocurre en ningún ancho.
- **Código:** falta `overflow-wrap` en `src/web/styles.css:921-929` y `:1002`.
- **Evidencia:** `docs/evidencias/auditoria-final/E/historial-768.png` y `recortes/historial-390-a.png`, `historial-320-a.png`.
- **Corrección mínima:** `overflow-wrap: anywhere` en esas reglas.

**F-12. Agenda: nombre sin espacios recortado o aplastando columnas** (E-02) — 🔴 reproducido.
- A 768, 390 y 320 px el veterinario queda recortado por `.agenda-panel{overflow:hidden}` (`styles.css:461` y `:586`).
- A 1440 px la columna Motivo queda en unos 60 px y empuja Estado fuera de vista.
- **Evidencia:** `agenda-1440`, `agenda-768`, `agenda-390` y `recortes/agenda-320-largo` en `docs/evidencias/auditoria-final/E/`.
- **Corrección mínima:** `overflow-wrap` y un ancho mínimo razonable para las columnas.

### Baja

- **F-13. «Ver historial» no se alinea entre tarjetas de una fila** (E-03). A 1440 y 768 px los botones quedan a alturas distintas, con hasta 188 px de hueco a 1440 y 333 px a 768. No aplica en una columna.
  - **Código:** `styles.css:774` y `:830`.
  - **Corrección:** tarjeta `flex` en columna y `margin-top:auto` en el botón.
- **F-14. Mensajes de zod o red en inglés llegan a la UI** (B-08 = D-03): «Invalid email address», «Too small…», «Failed to fetch». Reproducido.
- **F-15. El grupo de horarios tiene 16 paradas de Tab** (D-05). Las flechas, Home y End sí funcionan.
- **F-16. «Volver a la cita» residual** en la cita raíz si se pulsa «Registrar mascota» mientras se guarda (D-07).
- **F-17. La suite e2e reescribe capturas versionadas** (D-08). `clinic.spec.ts` regenera `agenda-desktop`, `agenda-mobile` y `recordatorios-desktop` en `docs/evidencias/capturas/` en cada ejecución. D las restauró con `git restore`.
  - Además, sin `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` la suite falla 10/10 en este equipo, porque Playwright 1.65 busca `chromium_headless_shell-1254`. Es un fallo de infraestructura, no de negocio, y el README ya documenta la variable.
- **F-18. Fechas de nacimiento:**
  - «Mañana» en la zona de la clínica se acepta porque se compara contra el día UTC (ya documentado en `API.md`).
  - No hay cota inferior: `0001-01-01` pasa (B-06).
  - `date=0001-01-01` en disponibilidad devuelve bloques del año 1901, por `Date.UTC` con año menor de 100, en `clinic-hours.ts:38` (B-07).
- **F-19. Diferencias de documentación:**
  - `openapi.json` lista 409, 413 y 415 en todas las operaciones, incluidos los GET. `API.md` es correcto (A-02, B-09).
  - `/notifications/run` declara `additionalProperties:false` en OpenAPI, pero el servidor acepta `[]` y `{"x":1}` (B-09).
  - `bookingHours` está documentado y se devuelve, pero ninguna prueba lo comprueba (`api.test.ts:249` solo revisa `timeZone`) y la UI no lo consume (A-01).
  - `ARQUITECTURA.md` está desactualizado: no menciona el horario de clínica ni `ListAvailability`. Dice que los formularios usan la zona del dispositivo, pero ahora solo la nota clínica lo hace. Dice que HTTP delega siempre en casos de uso, pero expone directamente algunos repositorios (A-07).
  - La tabla de resultados del README junta las cifras locales actuales con «CI remoto aprobado» sin aclarar que esa fila describe el primer run (A-06).
- **F-20. Orden del repositorio:**
  - `test1.md` está versionado en la raíz y no figura en la estructura del README.
  - `docs/ia/criticas/` está vacío.
  - Posible errata «Ingeniería de de Software» en README y ENTREGA, sin contrastar con el PDF.
  - El autor de Git aparece como «Doanto», y el README dice «Donato». Confirmar cuál es el nombre correcto.
- **F-21. Duplicación menor:** `10*60` y `18*60` están repetidos en `list-availability.ts:32-33` y `clinic-hours.ts:73-76` (A-09).
- **F-22. Observaciones visuales leves** (E-04 y otras):
  - A 320 px las migas y la fecha de la barra superior quedan apretadas.
  - El título de la tarjeta de recordatorio con nombre extremo parte «Recordatori/o».
  - El botón nativo de borrar de los campos de búsqueda sale azul.
  - El placeholder del selector se trunca a 320 px.
  - El recuadro de error muestra doble anillo de foco.
  - Son menores y se tratan como preferencias, no como defectos objetivos.

### Riesgos de crecimiento (inferidos; no son defectos hoy)

- La disponibilidad carga todas las citas con `repository.list()` y filtra en memoria (`list-availability.ts:28`). Costo lineal (B-11, A-09).
- `GET /appointments`, `/pets` y `/owners` no tienen paginación. Solo se midió el crecimiento de citas.
- `migrate.ts` separa sentencias con `split(";")`. Hoy funciona con la única migración, pero un `;` dentro de una cadena o un trigger la rompería.
- El envío de recordatorios no es atómico. Si falla en la cita *n*, las anteriores quedan registradas. Es idempotente al reejecutar.
- La base no impide por sí sola solapes del mismo veterinario. La protección depende del `FOR UPDATE` en `reserve()`, que está probado.
- Se aceptan dueños con correo duplicado (B-05). No es un requisito declarado.

## 5. Resumen real de pruebas, cobertura y concurrencia

**Comandos** (todos con código de salida 0): `typecheck`, `lint`, `build`, `npm test`, `npm run test:integration`, `npm run test:coverage`. Logs completos en `work/auditoria-final/C/logs/` y `docs/evidencias/auditoria-final/C/`.

| Medida | Resultado real | Documentado |
| --- | --- | --- |
| Pruebas unitarias | 49 | 49 |
| Pruebas de integración | 32 | 32 |
| Backend total | 81 | 81 |
| Playwright, con `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | 10/10 | 10 |
| Cobertura de líneas | 98.70 % | 98.70 % |
| Cobertura de sentencias | 98.33 % | 98.33 % |
| Cobertura de funciones | 98.63 % | 98.63 % |
| Cobertura de ramas | 97.82 % | 97.82 % |

**Alcance de la cobertura:** se excluyen `server.ts`, `web/**`, `config.ts` y `composition.ts`. `src/web` tiene 1.343 líneas contra 232 medidas, así que el 98.7 % describe el backend, no la interfaz. No debe citarse como cobertura de todo el producto. Además, el e2e solo tiene 5 casos con MySQL real, y son recorridos felices.

**Concurrencia (C, 133 aserciones PASS y 0 FAIL en las ejecuciones finales):**

- 120 rondas con N=2, 5 y 20, por HTTP y por repositorio, dan exactamente 1 reserva por ronda.
- 20 veterinarios distintos a la misma hora: 20 de 20 aceptadas.
- Mezcla con solapes parciales y un JOIN final: 0 solapes sobre 1.064 citas.
- Control negativo: «consultar y luego insertar» sin transacción produjo dobles reservas en 20 de 20 rondas, así que la prueba detecta la carrera.
- Matriz SQL real (repositorio directo): se rechazan idéntica, contenida, envolvente, parcial inicio, parcial fin y 1 ms de solape. Se aceptan contigua antes, contigua después y veterinario distinto.
- Restricciones: 6 FK, el CHECK `ends_at > starts_at` y el UNIQUE de `notification_logs` rechazan las violaciones directas.
- Rollback y pool: tras 500 solicitudes fallidas y 60 fallos de INSERT concurrentes, no quedan filas, transacciones ni bloqueos, y el servicio sigue respondiendo.
- Persistencia: los datos sobreviven al reinicio del servidor de prueba.
- Inyección: ninguna consulta concatena datos. 8 cargas hostiles se guardaron y recuperaron literalmente.

**Rendimiento (mediana, medición real):**

| Citas | availability | POST | GET /appointments |
| --- | --- | --- | --- |
| 0 | 1.9 ms | 2.4 ms | 1 ms |
| 5.000 | 5.1 ms | 2.2 ms | 11 ms |
| 50.000 | 39.2 ms (p95 44.1) | 3.9 ms | 92 ms (7.7 MiB) |

**Recordatorios:** la ventana `ahora < inicio <= ahora+24h` se cumple en los bordes (−1 s, 0, +1 s, ventana exacta, +1 ms). El mensaje usa la hora y la zona de clínica y dice que es simulado. 20 rondas concurrentes no duplican. Con una violación real de FK no se cuenta el envío ni queda registro. No hay correo real, timers ni cron en `src/`.

## 6. Evaluación visual por tamaño de pantalla

E generó 114 capturas más recortes. Abrió una por una las citadas en su informe (§8 lista las abiertas y las no abiertas). De las no abiertas usó solo mediciones numéricas.

| Ancho | Resultado |
| --- | --- |
| **1440 px** | Agenda, pacientes, historial, recordatorios y los 4 formularios sin desbordamiento. Defectos solo con texto extremo sin espacios (F-12) y la alineación de «Ver historial» (F-13). |
| **768 px** | Sin desbordamiento con datos normales. Con texto extremo sin espacios, el historial desborda (F-11), la agenda recorta (F-12) y los botones quedan desalineados (F-13). |
| **390 px** | Sin desbordamiento con datos normales. Navegación móvil con 4 elementos alcanzables y área de toque de 67–85 × 69 px. Modales desplazables con Guardar alcanzable. Con texto extremo, F-11 y F-12. |
| **320 px** | Igual que 390 px. Además, migas y fecha apretadas y el placeholder del selector truncado (F-22). |

**Medido y aprobado:**

- La X de cerrar está centrada: el centro del svg coincide con el del botón (dx=dy=0) en los 4 anchos. El glifo pintado se desplaza entre 0.0 y 0.5 px, dentro de la tolerancia del recorte.
- Las flechas de los selectores están a 17 px del borde y centradas en vertical.
- La flecha de «Ver historial» está a 15 px del borde del botón.
- Con un selector abierto, al redimensionar de 1440 a 768, 390, 320 y 390×400 y de vuelta, el menú sigue abierto y dentro del viewport.
- Modales a 390×600 y 320×500: el diálogo desplaza por dentro. Guardar no es fijo, pero queda alcanzable.

**No comprobado:** teclado móvil real, Safari, iOS y otros navegadores. Con la altura reducida a 400 px (emulación), el textarea enfocado queda fuera de vista. Es un riesgo inferido, sin reproducir en dispositivo real.

## 7. Diferencias entre README/OpenAPI y la implementación

Coinciden las 14 rutas, los códigos de las respuestas reales, los esquemas `.strict()`, `/config` con `bookingHours` y `/appointments/availability`. Los comandos del README existen en `package.json`. Las diferencias están en F-17 y F-19. Resumen:

1. OpenAPI lista 409, 413 y 415 en los GET, donde no pueden ocurrir.
2. OpenAPI declara `additionalProperties:false` en `/notifications/run`, pero el servidor acepta `[]` y `{"x":1}`.
3. `ARQUITECTURA.md` no refleja horario de clínica, bloques ni `ListAvailability`, ni el uso de zona del dispositivo en los formularios.
4. La tabla de resultados del README mezcla cifras locales actuales con el resultado de un CI antiguo.
5. Sin la variable `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, la suite e2e falla en este equipo. El README documenta la variable.

## 8. Limitaciones y comprobaciones no realizadas

- Navegador: solo Chrome for Testing 151 en modo headless. No se probó Chrome con interfaz, Safari, Firefox, iOS ni teclado móvil real. El zoom al 200 % se emuló con el tamaño de ventana.
- Accesibilidad: se leyó el árbol de accesibilidad vía CDP. No hubo lectores de pantalla, no se capturan las burbujas nativas de validación en headless (sí se comprobó `validity`), y `axe-core` no está instalado, por lo que no hay medición con herramienta certificada. El contraste (F-10) es un cálculo propio.
- No se comprobó la caída de MySQL a mitad de transacción, ni otras zonas horarias en MySQL (B las probó solo en la lógica de dominio), ni el crecimiento de `/pets` y `/owners`.
- Carreras de `refresh()` solapados en la UI: no comprobadas.
- No comprobado desde el repositorio: la visibilidad pública del repo, el número de pruebas de los runs de CI posteriores al primero, la fidelidad de la matriz R/E frente al PDF, y que «Codex Desktop» se haya usado.
- Algunas capturas se generaron pero no se abrieron (por ejemplo variantes de 768×500 y 1440×500).
- Los defectos visuales E-01 a E-03 necesitan texto extremo (100+ caracteres sin espacios), por lo que su probabilidad en una demostración normal es baja.
- Las severidades de este informe las asignó el orquestador al consolidar, a partir de los informes de los subagentes.

## 9. Correcciones prioritarias para Codex (sin implementar)

1. **F-01:** separar guardado y refresco en el submit; no reintentar un POST ya exitoso. Escribir primero la prueba que falla.
2. **F-02:** añadir las pruebas de «ahora exacto» válido y de disponibilidad con dos veterinarios, y comprobar que los mutantes ya no sobreviven.
3. **F-08:** tras un 409, volver a consultar la disponibilidad y quitar el bloque conflictivo.
4. **F-06 y F-07:** mapear errores 4xx de body-parser y de decodificación a su código, y usar el `petId` ya parseado.
5. **F-11, F-12 y F-13:** `overflow-wrap`, anchos de columna y alineación de tarjetas en CSS.
6. **F-10 y F-09:** contraste del texto pequeño y del foco, y mensaje visible del `<select>` requerido.
7. **F-19:** corregir OpenAPI (códigos en GET y `additionalProperties`) y actualizar `ARQUITECTURA.md`.
8. **F-03 a F-05 (estudiante, no Codex):** revisar las cinco entradas de la bitácora, declarar el registro por lotes si fue así y redactar la reflexión con su experiencia real.
9. Opcional: mover las capturas generadas por el e2e a una carpeta de trabajo para no reescribir las versionadas (F-17).

## 10. Estado final de Git, archivos creados y procesos

- Git: HEAD `637ce0b`, sin commits nuevos. `git status --short`: solo `?? docs/evidencias/auditoria-final/`. Antes de este informe, `outputs/AUDITORIA-FINAL-CLAUDE.md` tampoco existía, y `work/` está ignorado por Git.
- Archivos creados:
  - `work/auditoria-final/` (ignorado por Git): inventario, `REGLAS.md`, scripts, logs e informes de A a E.
  - `docs/evidencias/auditoria-final/` (19 MB): A 1, B 8, C 22, D 21 y E 156 archivos.
  - `outputs/AUDITORIA-FINAL-CLAUDE.md`, este informe.
  - Regenerados por la verificación y también ignorados por Git: `dist/` y `coverage/`.
- Datos: `vetsync` no se tocó. `vetsync_test` tiene 0 filas con prefijo `aud-`/`AUD`. Contiene los datos de la suite y del seed: 6 dueños, 7 mascotas, 5 veterinarios, 6 citas, 2 notas y 5 recordatorios. Los clics en «Simular recordatorios» pudieron añadir recordatorios a citas sembradas dentro de la ventana de 24 h. Para un estado conocido, ejecutar `DB_NAME=vetsync_test npm run db:seed` antes del e2e.
- Procesos:
  - Todos los servidores propios (puertos 3011 y 3012) están detenidos, y no queda Chrome ni Playwright de la auditoría.
  - Sigue en escucha solo el PID 38439 en el puerto 3010 (`node dist/server.js`, la demostración del usuario), que no se tocó.
  - Los procesos `tsx watch` (PID 38053/38054) que D y E vieron al principio ya no aparecían al cerrar. No eran de la auditoría y no se detuvieron.
