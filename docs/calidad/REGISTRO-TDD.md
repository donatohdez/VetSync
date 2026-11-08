# Ciclos TDD y validación

## Ciclo 1: agenda y recordatorios

- Requisitos: R02, R03 y reglas propuestas de fechas e idempotencia.
- Se crearon contratos y casos de prueba antes de la implementación; los métodos solo indicaban que faltaba implementar.
- Rojo: `docs/evidencias/tdd/01-agenda-recordatorios-rojo.txt`: 24 pruebas fallidas por funcionalidad pendiente, con entorno de pruebas operativo.
- Commit rojo: `769f2a4`.
- Verde: `docs/evidencias/tdd/02-agenda-recordatorios-verde.txt`: 24 pruebas aprobadas.
- Implementación: `d7fadff`. Validación de fechas con zona, reloj inyectado, persistencia por puertos y recordatorio único.
- Los repositorios en memoria de estas unitarias comprueban reglas del caso de uso; no prueban transacciones MySQL.

## Ciclo 2: API, registros y MySQL

- Se escribieron pruebas de contratos HTTP y concurrencia contra `vetsync_test` antes de implementar las rutas y adaptadores.
- Rojo: `docs/evidencias/tdd/03-api-mysql-rojo.txt`: nueve fallos porque la API devolvía 501; la conexión y el esquema de pruebas ya estaban disponibles.
- Commit rojo: `0ba4db5`.
- Verde: `docs/evidencias/tdd/04-api-mysql-verde.txt`: nueve pruebas aprobadas, con solicitudes concurrentes reales y persistencia en MySQL.
- Se incorporaron pruebas posteriores de seguridad de formato/carga, navegador y regresión; no se presentan como tests escritos antes de toda la interfaz.

## Refactorización y hallazgos reales

- Se separaron casos de uso de adaptadores SQL y se inyectaron reloj y repositorios.
- Se formateó el código y se ajustaron tipos de parámetros SQL sin introducir `any`.
- Las pruebas de navegador iniciales fallaron porque los iconos formaban parte del nombre accesible de los botones de navegación. Se agregaron etiquetas accesibles; no se cambió la prueba para ignorar el problema.
- Los recursos estáticos se copiaron a `dist/web` para no servir archivos TypeScript del directorio fuente.
- Se corrigieron alertas de dependencias transitivas con override acotado y se verificó el linter.
- La salida inicial y la corregida del navegador se conservan en `docs/evidencias/pruebas/`.

No se atribuyen estas revisiones técnicas al estudiante: fueron realizadas por Codex. La revisión humana y la revisión independiente con Claude siguen pendientes.
