# Revisión de cumplimiento de VetSync

8 de noviembre de 2026. Fuentes y clasificación: `docs/requisitos/MATRIZ.md`. Esta revisión distingue el funcionamiento y los documentos preparados del envío académico, todavía pendiente.

| Requisito | Estado y evidencia |
| --- | --- |
| Dueños, mascotas e historial (R01) | Implementado; persistencia MySQL y flujo completo de navegador |
| Citas sin choques (R02) | Implementado; bloqueos por veterinario, matrices SQL y pruebas concurrentes reales |
| Correo próximo simulado (R03) | Implementado; registro persistente, ventana configurable, límites e idempotencia comprobados. Se ejecuta manualmente; no hay un programador automático |
| Monolito modular, SOLID, TDD, diseño BD y reglas (R04–R07) | Código separado por dominio/casos/adaptadores, composición, migraciones, arquitectura, AGENTS.md y evidencia rojo/verde |
| Revisión con IA (R08) | Claude revisó la versión inicial antes de publicarla; hallazgos contrastados y corregidos. Se trabajó en main y no hubo un merge de PR: no se inventa ese evento. La ampliación de recepción tiene validación propia, sin segunda revisión de Claude |
| CI (R09) | Workflow en push/PR y ejecuciones remotas anteriores aprobadas. Consultar Actions para el resultado del último cambio |
| README/API (R10) | README con tecnologías, índice, equipo, instalación y pruebas; API y OpenAPI incluyen disponibilidad y horarios |
| Repositorio (E01) | Público: https://github.com/donatohdez/VetSync |
| Cinco prompts (E02) | `BITACORA-PROMPTS.md` incluye textos originales, herramientas, respuestas conservadas y crítica; el estudiante confirmó el prompt exacto de Claude |
| Reflexión ≤500 palabras (E03) | `REFLEXION-TECNICA.md`, 370 palabras al redactarse, basada en aporte real y hechos del proyecto; falta lectura final del estudiante |
| Ajustes del usuario (U01–U04) | Alta durante cita, 16 turnos diarios, fecha/hora, disponibilidad, X y flechas; 81 pruebas de backend y diez de navegador aprobadas |

No se identificó una obligación de correo real, videollamadas, portal del dueño o despliegue público. La simulación satisface el módulo de avisos descrito. Quedan la revisión del equipo, comprobar comprensión y enviar el enlace y documentos a la plataforma; no se afirma haber realizado esos pasos humanos.

## Correo real como ampliación opcional

Es una mejora útil después de cerrar la entrega. Requeriría elegir proveedor SMTP/API, configurar credenciales fuera de Git y un remitente autorizado; añadir un adaptador de correo, estados pendiente/aceptado/fallido, reintentos y protección contra duplicados. Un registro simulado no debe contarse como entrega real. Para envío periódico también se necesita un proceso programado y servidor disponible; hoy el botón inicia la simulación.

Primero se probarían fallos del proveedor y duplicados con destinatarios de prueba. No se configuró proveedor ni se enviaron correos reales en esta versión. Como referencia, Resend documenta la verificación de dominio en https://resend.com/docs/dashboard/domains/introduction y las restricciones del remitente de pruebas en https://resend.com/docs/knowledge-base/403-error-resend-dev-domain .
