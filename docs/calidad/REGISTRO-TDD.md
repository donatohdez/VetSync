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

No se atribuyen estas revisiones técnicas al estudiante: fueron realizadas por Codex. La revisión humana sigue pendiente; la revisión independiente de Claude ya fue recibida y contrastada.

## Ciclo 3: hallazgos de Claude

- Informe original: `docs/evidencias/revision/claude-test1-original.md`, sin editar.
- Commit de reproducción inicial: `694769f`.
- Rojo: `05-revision-claude-rojo.txt`: cinco fallos de unitarias reproducen B1, B2 y B4; las otras 29 unitarias pasaban.
- Rojo de composición: `06-zona-integracion-rojo.txt`: el texto del aviso no recibía la zona configurada, comprobado con una instancia de API en Asia/Tokyo.
- Verde unitario: `07-revision-claude-verde.txt`: 34 unitarias aprobadas tras corregir.
- M1: se agregaron matrices SQL con cinco solapamientos, dos contiguas y cinco límites de recordatorios. El SQL original las aprobó; cuatro mutaciones temporales cambiaron los operadores de límites y cada una hizo fallar exactamente una prueba relevante. Se restauraron ambos adaptadores byte por byte.
- Evidencia de mutaciones: `docs/evidencias/revision/02*` a `05*`. Son regresiones intencionadas en una verificación controlada, no defectos del código final.
- Verificación final: `docs/evidencias/revision/06-verificacion-corregida.txt`.
