# Requisitos y trazabilidad

Fuentes: `../referencias/presentacion-profesor.pdf` (20 páginas) y `../referencias/asignacion-plataforma.png`.

**Explícito** = requisito del material. **Sugerido** = aparece dentro de un prompt de ejemplo. **Propuesto** = decisión nuestra, revisable.

| ID | Nivel | Requisito | Fuente | Evidencia prevista |
| --- | --- | --- | --- | --- |
| R01 | Explícito | Registrar dueños y mascotas, con historial médico | PDF p. 11 | API/flujo de registro y consulta de historial; pruebas de asociación |
| R02 | Explícito | Agendar sin choques de horario por veterinario | PDF p. 11 | Pruebas de solapamiento, límites y concurrencia |
| R03 | Explícito | Simular correo cuando una cita está próxima | PDF p. 11 | Registro persistente de envío simulado y pruebas con reloj controlado |
| R04 | Explícito | Microservicios o monolito modular desacoplado; TDD y SOLID | PDF p. 11 | Diagrama, dependencias, ciclos rojo/verde/refactor y revisión |
| R05 | Explícito | Diseñar esquema de BD y estructura de carpetas con un LLM | PDF p. 12 | Modelo, decisión y prompt real |
| R06 | Explícito | Archivo de reglas y configuración inicial del proyecto | PDF pp. 13-14 | AGENTS.md, configuración y conexión comprobada |
| R07 | Explícito | Tests previos, implementación y refactorización; informe de resultados | PDF pp. 15-17 | Pruebas, registros TDD, informe y cambios verificables |
| R08 | Explícito | Revisión con IA de seguridad y rendimiento antes del merge | PDF p. 18 | Hallazgos, correcciones y validaciones |
| R09 | Explícito | CI con tests y linter en cada push | PDF p. 19 | Workflow y ejecución comprobada en el repositorio remoto |
| R10 | Explícito | README y documentación de API | PDF p. 20 | Arranque reproducible y contrato coherente con implementación |
| E01 | Explícito | Enlace al código funcional en GitHub/GitLab | Captura, punto 1 | URL y commit de entrega verificables |
| E02 | Explícito | Cinco prompts: texto exacto, herramienta, respuesta y crítica | Captura, punto 2 | Bitácora final Markdown o PDF con cinco entradas completas |
| E03 | Explícito | Reflexión técnica de máximo 500 palabras | Captura, punto 3 | Texto sobre carga cognitiva y prevención de deuda técnica |
| S01 | Sugerido | MySQL y backend Node.js/Python/Java | PDF p. 12, prompt | Se propone MySQL y Node.js/TypeScript; no es lenguaje impuesto |
| S02 | Sugerido | camelCase, interfaces, try/catch y prohibir any | PDF p. 13, prompt | Convenciones adaptadas al stack |
| S03 | Sugerido | Cinco tests iniciales y casos de fecha pasada/mascota inexistente | PDF p. 15, prompt | Se adoptan y amplían con criterios de aceptación |
| S04 | Sugerido | Fallar si cobertura <80% | PDF p. 19, prompt | Se adopta como umbral propio; no se atribuye a la captura |
| P01 | Propuesto | Monolito modular; UI web sencilla tras completar API | Decisión de alcance | Justificación y demo |
| P02 | Propuesto | Aviso 24 h antes, configurable; reloj inyectado | Regla no definida por profesor | Pruebas del límite y de no duplicación |
| P03 | Propuesto | Cancelación y reprogramación como ampliación | No explícito | Solo después del núcleo obligatorio |

## Ambigüedades y supuesto de trabajo

- El título menciona telemedicina, pero el cuerpo no define videollamadas, chat o consulta remota. Se excluyen inicialmente y se declara ese límite.
- No se especifican frontend, autenticación, roles, despliegue público, duración de citas, horarios laborales ni formato del historial. Se proponen reglas mínimas en el plan; no se presentan como exigencias del profesor.
- El registro de veterinarios es soporte necesario para asignar citas: puede resolverse con datos de demostración inicialmente.
- La captura fija cierre el **8 de noviembre de 2026 a las 23:59**. No indica zona horaria; comprobarla directamente en la plataforma al entregar.
- El PDF llama a la actividad “Asignación IVirtual”; el usuario la identifica como primera asignación de unidad 3. Conservar su identificación sin deducir más numeración del rótulo.
