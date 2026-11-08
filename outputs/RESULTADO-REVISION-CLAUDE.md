# Resultado de la revisión de Claude

Fecha: 8 de noviembre de 2026. Revisión realizada sobre la versión funcional anterior y contrastada por Codex en esta sesión.

Se conservó `test1.md` en la raíz, sin editar, y una copia idéntica en `docs/evidencias/revision/claude-test1-original.md`. SHA-256 de ambas: `a13154393d96ab549450552a2d079997ec190a06f16ff58665457d702acc7268`.

## Decisiones y correcciones

| Hallazgo | Evaluación propia | Acción |
| --- | --- | --- |
| M1: límites probados solo en memoria | Confirmado como carencia de regresión SQL. Los operadores actuales eran correctos. | Agregar cinco solapamientos, dos citas contiguas y cinco límites de ventana contra MySQL. Probar cuatro mutaciones controladas. |
| B1: zona inválida admitida al arrancar | Reproducido: Foo/Bar y cadena vacía pasaban el esquema. | Validar con Intl en un esquema puro probado, cargado al arrancar. |
| B2: texto del aviso en UTC | Confirmado como mejora de presentación. El instante UTC original no era incorrecto. | Inyectar la zona de clínica y mostrar fecha, hora local y nombre de zona. Mantener UTC en BD y en los campos de instantes de API. |
| B3: citas sin máximo de duración/horizonte | Propuesta válida de negocio, sin límite establecido en el enunciado. | Pospuesto: no introducir máximos arbitrarios. La validación vigente exige futuro y fin posterior al inicio. |
| B4: rollback oculta el fallo original | Reproducido por simulación de fallos. | Agregar ambos errores a AggregateError y mantener el original como causa; liberar siempre la conexión. |

Los mensajes simulados que ya estaban guardados se conservan como registros históricos. El nuevo formato se aplica a los avisos generados después de la corrección; no se reenvía ni duplica un recordatorio anterior.

## Evidencia de TDD y regresión

- `docs/evidencias/tdd/05-revision-claude-rojo.txt`: cinco fallos nuevos de unitarias, con 29 casos ya aprobados.
- `docs/evidencias/tdd/06-zona-integracion-rojo.txt`: prueba de composición fallida antes de pasar la zona al servicio.
- `docs/evidencias/tdd/07-revision-claude-verde.txt`: 34 unitarias aprobadas.
- Commit inicial de reproducción: `694769f`.
- La matriz SQL original aprobó sus casos. Los archivos `docs/evidencias/revision/02*` a `05*` registran cambios temporales: límite de recordatorios superior inclusivo convertido en exclusivo, inferior exclusivo convertido en inclusivo y los dos límites de solapamiento convertidos en inclusivos. Cada mutación provocó exactamente un fallo de regresión.
- Los dos adaptadores se restauraron byte por byte; no hay diferencias de SQL contra la versión revisada. Las mutaciones no son correcciones ni fallos del producto final.

## Resultado local tras corregir

Tipos, linter y compilación correctos. **59 pruebas aprobadas: 34 unitarias y 25 de integración.** Cobertura: **98.94% líneas, 98.46% sentencias, 98.46% funciones, 96.96% ramas**. El informe de verificación completo está en `docs/evidencias/revision/06-verificacion-corregida.txt`; el del navegador, en `07-navegador-corregido.txt`.

## Qué se dejó fuera

- Máximos de duración/horizonte y prohibir citas simultáneas de una mascota con distintos veterinarios: requieren una regla explícita de negocio.
- Migraciones con literales complejos, ejecución desde cualquier directorio y fijar acciones por SHA: mejoras opcionales; el proyecto actual tiene una migración simple y documenta ejecutar desde la raíz.
- Ejecución remota de CI: continúa pendiente porque no hay remoto configurado.
- Autenticación, paginación y planificador automático: límites del alcance local ya declarados.

Se confirmó que la exigencia de JSON en la ejecución manual de recordatorios coincide con la documentación. No se cambió ese contrato para resolver un falso positivo.

Las cifras de carga y mutaciones de concurrencia de la sonda de Claude se conservan como afirmaciones del informe recibido. No se reejecutó su script ni se atribuyen a Codex. La propia comprobación de concurrencia de API contra MySQL sigue aprobando.

La revisión técnica de IA está documentada; falta la revisión y comprensión personal del estudiante y cerrar repositorio remoto, CI y entregables académicos.
