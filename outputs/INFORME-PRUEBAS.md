# Informe de verificación de VetSync

Fecha: 8 de noviembre de 2026. Directorio activo: `/Users/donato/Ago-Dic 2026/Fun de IA/VetSync`.

## Resultado local

- Node.js v24.12.0, npm 11.6.2, MySQL 8.4 en Docker.
- TypeScript: sin errores al ejecutar `npm run typecheck`.
- ESLint: sin errores al ejecutar `npm run lint`.
- Compilación backend/frontend y copia de recursos: correcta con `npm run build`.
- 49 pruebas unitarias y 32 pruebas de integración: **81 aprobadas**.
- Cobertura: **98.70% líneas, 98.33% sentencias, 98.63% funciones y 97.82% ramas**; mínimo configurado 80% en cada métrica.
- Diez pruebas Playwright: recorridos con MySQL para registro/reserva y móvil; casos de selectores, historial, errores y geometría. Resultado final en `docs/evidencias/pruebas/navegador-recepcion-final.txt`. Las pruebas de `polish.spec.ts` usan respuestas HTTP controladas; no sustituyen las de MySQL.
- Auditoría npm: cero alertas en el resultado archivado en `docs/evidencias/pruebas/npm-audit.json`.

Las exclusiones de cobertura están declaradas en `vitest.config.ts` y justificadas en arquitectura: arranque, configuración de entorno, composición y UI. La UI se verifica con Playwright, no se incluye artificialmente en cobertura de unitarias.

## Qué se comprobó

- Registro y asociación de dueños/mascotas; validación de fechas y datos.
- Historial cronológico separado por mascota, sin notas futuras.
- Rechazo de intervalos superpuestos, aceptación de citas contiguas y de horarios iguales para veterinarios distintos.
- Dos solicitudes concurrentes a la API sobre MySQL: una respuesta 201 y otra 409, con una sola fila persistida.
- Dos ejecuciones concurrentes de avisos: un solo correo simulado persistido; repetición posterior sin duplicados.
- Texto con sintaxis SQL se guarda como dato y no ejecuta instrucciones.
- JSON malformado, cargas excesivas, tipo de contenido incorrecto y referencias inexistentes tienen errores controlados.
- Las fallas internas no revelan detalles de conexión al cliente.
- La UI compilada está disponible; `.env` y fuentes TypeScript no se sirven por HTTP.
- Recorrido de formularios, mensaje de conflicto, nota con texto HTML sin ejecución y vista móvil de 390 px sin desbordamiento global.

## TDD y correcciones

`docs/calidad/REGISTRO-TDD.md` enlaza los commits y salidas rojo/verde. Las nueve pruebas originales de integración se ejecutaron antes de la API funcional. Las pruebas posteriores de endurecimiento y navegador son validación adicional; no se afirma que toda la interfaz se desarrolló con TDD.

El primer intento de navegador falló por las etiquetas accesibles de navegación; se conserva la salida y se corrigieron las etiquetas. La siguiente ejecución aprobó ambos recorridos.

## Límites de la evidencia

Esta es validación local contra datos ficticios. La revisión independiente con Claude fue recibida y se contrastó con pruebas propias. La revisión del estudiante sigue pendiente. Las sondas adicionales descritas en `test1.md` son evidencia atribuida a Claude, no una ejecución propia de Codex. El workflow se ejecutó correctamente en GitHub sobre el commit `cfba2fc4e274ab169288891628a2b500b708c96a`. Véanse `CI-REMOTO.md` y las evidencias `docs/evidencias/pruebas/ci-github-inicial.*`.

Los tests de integración borran únicamente registros de `vetsync_test`; no modifican la base de demostración `vetsync`. No ejecutar integración y Playwright simultáneamente sobre esa base compartida de pruebas.

## Validación de la revisión independiente

- M1: matriz completa de intervalos y ventana contra SQL real. Cuatro mutaciones de operadores detectadas, con fuentes restaurados; no se modificó el SQL original correcto.
- B1: una zona horaria no reconocida se rechaza al interpretar la configuración.
- B2: los avisos nuevos usan la zona de clínica y la identifican; prueba de composición en Asia/Tokyo, conservando UTC en BD.
- B4: se conservan el error original y el de rollback con AggregateError; una prueba simula el fallo de rollback, sin afirmar que se cortó una conexión real.
- B3: después de aquella revisión, el usuario definió duración exacta de 30 minutos y horario de 10:00 a 18:00. Se implementaron mediante un nuevo ciclo TDD. El horizonte máximo continúa sin definirse.

La verificación completa posterior está en `docs/evidencias/revision/06-verificacion-corregida.txt`. Las pruebas originales y su resultado de 36 casos se conservan como evidencia histórica en `docs/evidencias/pruebas/`.

## Validación de recepción y diseño

`npm run check` aprobó tipos, lint, compilación y los 81 casos de backend con cobertura: `docs/evidencias/pruebas/verificacion-recepcion.txt`. La ejecución final de `npm run test:e2e` con Chromium local aprobó los diez casos: `docs/evidencias/pruebas/navegador-recepcion-final.txt`.

Se verificaron los 16 bloques, último inicio 17:30, duración de 30 minutos, fechas y disponibilidad por veterinario, rechazo HTTP de horarios inválidos y registro de dueño/mascota sin perder el borrador de la cita. Se midieron X y flechas a 1440 y 390 px. La consulta de disponibilidad no sustituye el bloqueo transaccional al reservar. Las fechas antiguas de la base de demostración se conservaron; el seed nuevo utiliza los bloques acordados sin reescribir filas existentes.

Los registros rojos de UI, redimensionamiento y reglas están en `docs/evidencias/tdd/08*` a `14*`. El descubrimiento accidental de una copia temporal del repositorio por Vitest se registró y se corrigió delimitando la búsqueda a `tests/unit/` y `tests/integration/`; ese fallo de infraestructura no se cuenta como rojo de negocio.
