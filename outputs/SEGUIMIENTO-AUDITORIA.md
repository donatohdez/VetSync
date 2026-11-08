# Seguimiento de la auditoría final

8 de noviembre de 2026. El informe de Claude se conserva sin modificar en `AUDITORIA-FINAL-CLAUDE.md`; sus mediciones siguen atribuidas a esa herramienta.

## F-01: corrección local verificada

Se separó la confirmación del POST de la actualización posterior. Si falla el refresco, se informa que el registro ya quedó guardado y se cierra el formulario de alta independiente; en recepción se conservan localmente dueño/mascota para continuar el flujo. El error de lectura no habilita repetir el POST exitoso.

Prueba antes del cambio: `docs/evidencias/tdd/15-refresco-rojo.txt`, fallo porque el diálogo seguía abierto. Después: `16-refresco-verde.txt`, un caso aprobado. Regresión completa: `docs/evidencias/pruebas/post-auditoria-navegador.txt`, once casos aprobados. Tipos, linter y compilación aprobados. El caso nuevo reproduce dueño con POST confirmado y GET fallido mediante respuestas controladas; no se atribuye ese escenario a una nueva prueba de fallo real de MySQL. La protección se aplica al manejador compartido de los cuatro formularios.

## Pendientes

- F-02: fortalecer límites exactos y separación de veterinarios mediante pruebas y mutaciones.
- F-06–F-22: contrastar y atender por prioridad; no se presentan como resueltos.
- F-03–F-05: revisar atribución y selección de prompts. La fecha de modificación de un archivo no demuestra alteración del texto original ni registro simultáneo. Los artefactos se archivaron durante el trabajo; no se debe presentar su escritura como captura automática simultánea de cada mensaje.
- F-05: el estudiante aportó su revisión personal, dificultades con fechas y aprendizaje. Se conservó el mensaje original y se reescribió la reflexión distinguiendo su revisión de la implementación y pruebas realizadas por los asistentes. Falta su lectura del texto final.

Este seguimiento no sustituye el informe original ni declara cerrada toda la auditoría. El arreglo F-01 está local; todavía no se publica esta tanda.

## Actualización posterior: ronda de correcciones

Esta sección sustituye, en el estado actual, a las listas de «Pendientes» anteriores, que se conservan arriba como registro histórico. El detalle completo, con la tabla F-01 a F-24, las cifras y las evidencias, está en [`CIERRE-AUDITORIA-CLAUDE.md`](CIERRE-AUDITORIA-CLAUDE.md).

- F-01 a F-02, F-06 a F-19, F-21 y F-22 (parte objetiva) se corrigieron con regresiones. La verificación final local dio 96 unitarias, 37 de integración y 29 de navegador, todas aprobadas, con cobertura de backend de 99.24 % en líneas.
- La verificación visual de la versión integrada encontró dos defectos nuevos, que se registraron como F-23 (horario seleccionado ilegible con el puntero encima) y F-24 (etiqueta «(opcional)» por debajo de 4.5:1). Ambos se reprodujeron en rojo y se corrigieron.
- Siguen pendientes de confirmación humana F-03 a F-05 (lectura final de la bitácora de cinco interacciones y de la reflexión).
- Los mensajes de validación del servidor siguen en inglés; la interfaz los traduce. Se pospone localizarlos en el backend.
