# Informe de verificación de la primera versión

Fecha: 8 de noviembre de 2026. Directorio activo: `/Users/donato/Ago-Dic 2026/Fun de IA/VetSync`.

## Resultado local

- Node.js v24.12.0, npm 11.6.2, MySQL 8.4 en Docker.
- TypeScript: sin errores al ejecutar `npm run typecheck`.
- ESLint: sin errores al ejecutar `npm run lint`.
- Compilación backend/frontend y copia de recursos: correcta con `npm run build`.
- 24 pruebas unitarias y 12 pruebas de integración: **36 aprobadas**.
- Cobertura: **98.87% líneas, 98.36% sentencias, 98.43% funciones y 96.82% ramas**; mínimo configurado 80% en cada métrica.
- Dos pruebas Playwright: recorrido funcional en escritorio y navegación móvil. Evidencia de la última ejecución en `docs/evidencias/pruebas/navegador.txt`.
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

Esta es validación local contra datos ficticios y una carga pequeña, no una prueba de estrés ni una auditoría externa. La revisión independiente con Claude y la revisión del estudiante están pendientes. El workflow de GitHub Actions está escrito, pero no se ha ejecutado en GitHub porque no hay repositorio remoto configurado.

Los tests de integración borran únicamente registros de `vetsync_test`; no modifican la base de demostración `vetsync`. No ejecutar integración y Playwright simultáneamente sobre esa base compartida de pruebas.
