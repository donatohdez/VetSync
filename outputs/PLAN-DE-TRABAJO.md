# VetSync: plan para completar la asignación

Fecha de análisis: 8 de noviembre de 2026. Estado: **propuesta para revisión; implementación pendiente**.

## 1. Qué se pide realmente

Se revisaron las 20 páginas de la presentación y la captura de la plataforma. La presentación aporta el alcance funcional y el proceso de desarrollo; la captura especifica los tres entregables. Deben usarse juntas.

El objetivo académico es demostrar desarrollo asistido por IA con criterio humano: diseñar, probar antes de implementar, revisar las propuestas de la IA y explicar las decisiones. Una aplicación que funcione sin evidencia del proceso dejaría parte de la tarea incompleta.

### Obligaciones explícitas

- Registro de dueños y mascotas con historial médico.
- Citas sin choques de horarios para los veterinarios.
- Correos simulados cuando una cita está próxima.
- Microservicios **o** monolito modular bien desacoplado, TDD y principios SOLID.
- Diseño de BD y carpetas, reglas para la IA, configuración base, pruebas previas, implementación y refactorización.
- Informe de pruebas, revisión de seguridad/rendimiento con IA, CI con tests y linter en cada push, README y documentación de API.
- Entrega: enlace al código funcional en GitHub/GitLab; bitácora de cinco prompts con sus respuestas y crítica; reflexión técnica de máximo 500 palabras.

La matriz completa con fuentes y distinción entre obligatorio, sugerido y propuesto está en `docs/requisitos/MATRIZ.md`.

**Plazo mostrado:** domingo 8 de noviembre de 2026, 23:59. Corresponde a hoy según el contexto del usuario. La zona de la plataforma no aparece; verificarla antes de entregar.

## 2. Alcance recomendado

Construir una aplicación local reproducible para una clínica veterinaria. Priorizar el núcleo, su validación y la evidencia académica; después completar una interfaz sencilla para la demostración.

### Funcionalidad del núcleo

| Área | Resultado verificable |
| --- | --- |
| Dueños | Crear y consultar un dueño con nombre y correo; validar los datos necesarios |
| Mascotas | Registrar y consultar una mascota vinculada a un dueño existente |
| Veterinarios | Disponer de veterinarios de demostración para asignar citas |
| Historial | Agregar y consultar entradas cronológicas por mascota, con fecha, veterinario y nota clínica |
| Citas | Crear y listar citas con mascota, veterinario, inicio, fin y motivo; rechazar referencias inválidas y conflictos |
| Notificaciones | Detectar citas próximas y dejar un correo simulado observable y persistente, sin enviar correo real |
| Demostración | Recorrer el flujo completo mediante API documentada y una pantalla web pequeña si alcanza el tiempo |

**Fuera del alcance inicial:** videollamada, chat, pagos, recetas electrónicas, múltiples clínicas, aplicación móvil y despliegue público. “Telemedicina” aparece en el título, pero no tiene requisitos operativos en los materiales. No inventar un módulo de videollamadas como condición de entrega.

Cancelación, reprogramación, búsqueda avanzada y administración completa de veterinarios son ampliaciones. No deben desplazar los requisitos explícitos.

### Reglas propuestas que debemos hacer visibles

Estas reglas completan vacíos del enunciado; se pueden ajustar antes de implementar:

1. Una mascota pertenece a un dueño; puede tener varias entradas de historial y varias citas.
2. Cada cita tiene inicio y fin. El fin debe ser posterior al inicio y la cita debe comenzar en el futuro.
3. Se proponen 30 minutos por defecto, con duración explícita en la API. No se inventarán turnos laborales o feriados.
4. Para un mismo veterinario, hay choque cuando `inicioExistente < finNueva` y `finExistente > inicioNueva`. Dos citas contiguas sí se permiten.
5. El aviso se considera próximo dentro de las siguientes 24 horas; el intervalo será configurable y se excluirán citas pasadas.
6. Cada cita genera como máximo un recordatorio de ese tipo en la demostración. Ejecutar dos veces el proceso no debe duplicarlo.
7. Los datos de fechas se guardarán como instantes en UTC. Las solicitudes deberán incluir zona/desplazamiento; la interfaz mostrará la zona configurada para la clínica.
8. Se usarán datos ficticios. La primera versión será una demostración local; autenticación y publicación no son requisitos definidos y requerirían ampliar el alcance.

## 3. Arquitectura y tecnología propuestas

**Monolito modular**: un proceso y una base de datos, con módulos separados por responsabilidad. Está permitido expresamente por el profesor y reduce el trabajo de infraestructura dentro del plazo.

Propuesta inicial de herramientas: Node.js con TypeScript estricto, Express para HTTP, MySQL con mysql2 y migraciones SQL, Vitest para pruebas, ESLint y GitHub Actions. Interfaz pequeña con HTML/CSS y TypeScript sin un segundo proyecto frontend. MySQL sigue el ejemplo del profesor; el lenguaje y estas bibliotecas son decisiones nuestras. Las versiones se verificarán y fijarán al implementar.

No se instalarán dependencias ni se generará código de aplicación durante esta revisión del plan.

### Límites de módulos

- `owners`: datos de dueños.
- `pets`: registro y asociación de mascotas.
- `veterinarians`: consulta de veterinarios disponibles para asignación.
- `medical-records`: entradas del historial por mascota.
- `appointments`: reglas de agenda y coordinación de reserva.
- `notifications`: selección de citas próximas y correo simulado.

Dentro de cada módulo: `domain/` para reglas y tipos; `application/` para casos de uso y puertos; `infrastructure/` para SQL/adaptadores; `http/` para rutas y validación. Un punto de composición conectará dependencias. Evitar crear clases o interfaces sin una responsabilidad concreta.

### Cómo demostrar SOLID

- Responsabilidad única: separar reservar una cita, consultar disponibilidad y simular un correo.
- Abierto/cerrado: poder sustituir el correo simulado por otro adaptador sin modificar la regla de notificación.
- Sustitución: repositorios de prueba y SQL deben respetar el mismo contrato; verificar comportamientos relevantes.
- Segregación: interfaces pequeñas por necesidad del caso de uso.
- Inversión: los casos de uso dependen de puertos y un reloj inyectable, no de Express, MySQL o la hora del sistema directamente.

### Modelo de datos inicial

| Tabla | Campos principales y relaciones |
| --- | --- |
| owners | id, name, email, phone opcional, createdAt |
| pets | id, ownerId, name, species, breed y birthDate opcionales |
| veterinarians | id, name, active |
| medical_records | id, petId, veterinarianId, recordedAt, clinicalNote |
| appointments | id, petId, veterinarianId, startsAt, endsAt, reason |
| notification_logs | id, appointmentId, type, recipient, simulatedAt, message |

Agregar claves foráneas e índices para citas por veterinario/fecha, historial por mascota y búsqueda de recordatorios. La combinación cita/tipo de aviso será única. El diseño definitivo irá acompañado de diagrama y migraciones.

**Concurrencia:** comprobar disponibilidad y luego insertar sin protección deja una carrera. La propuesta es realizar ambas operaciones dentro de una transacción y serializar reservas del mismo veterinario mediante bloqueo de su fila. La consulta de conflictos debe leer el estado vigente bajo la configuración transaccional elegida. Todos los caminos que creen o cambien citas deberán respetar ese protocolo. Una prueba de integración con MySQL y dos conexiones debe demostrar una sola reserva exitosa cuando ambas compiten por el mismo horario.

El correo simulado se guardará en la BD. El proceso de recordatorios se podrá ejecutar manualmente para la demo y, después, periódicamente. La unicidad en BD y el manejo de transacciones impedirán registros duplicados. No se necesita un proveedor de correo ni una cola distribuida para esta simulación.

## 4. Organización de carpetas

La base documental ya se creó. Los directorios de implementación están reservados y siguen vacíos.

```text
te-x20/
├── README.md                      # Entrada al proyecto y, luego, guía de ejecución
├── AGENTS.md                      # Reglas para trabajar con IA
├── .gitignore
├── .env.example                   # Se creará sin secretos al implementar
├── package.json / lockfile        # Se crearán al elegir versiones
├── docs/
│   ├── referencias/               # PDF y captura preservados
│   ├── requisitos/MATRIZ.md        # Fuentes, obligaciones y supuestos
│   ├── arquitectura/
│   │   └── decisiones/            # ADR de arquitectura propuesto; luego modelo/diagramas
│   ├── api/                       # Contrato OpenAPI y solicitudes de ejemplo
│   ├── calidad/REGISTRO-TDD.md
│   ├── ia/
│   │   ├── BITACORA.md             # Registro; después se seleccionan cinco entradas
│   │   ├── respuestas/            # Respuestas exactas o capturas
│   │   └── criticas/               # Revisión, cambios y verificaciones
│   └── evidencias/
│       ├── tdd/                   # Rojo, verde y refactorización
│       ├── pruebas/               # Resultados y cobertura
│       ├── revision/              # Hallazgos y correcciones
│       └── capturas/              # Demostración de la aplicación
├── src/
│   ├── modules/                   # Se crearán los seis módulos propuestos
│   ├── shared/                    # Elementos transversales mínimos
│   └── web/                       # Interfaz de demostración
├── tests/{unit,integration,e2e}/
├── database/{migrations,seeds}/
├── scripts/
├── .github/workflows/             # CI al implementar
├── outputs/                       # Este plan y entregables finales
└── work/                          # Temporales excluidos de Git
```

Git no conserva directorios vacíos: cada carpeta aparecerá en el remoto cuando tenga contenido real. No se llenará el repositorio de archivos de relleno. El punto de entrada de la aplicación y la configuración de MySQL/Docker se crearán durante la preparación técnica.

## 5. Etapas y criterio de salida

Estimación orientativa: **8 a 11 horas de trabajo concentrado**, sujeta al entorno, experiencia y fallos encontrados. No es garantía de completar antes del cierre. Mantener una reserva para entrega y acceso al repositorio.

| Etapa | Trabajo | Salida comprobable | Tiempo orientativo |
| --- | --- | --- | --- |
| 0. Revisar decisiones | Acordar alcance, stack, reglas y forma de entrega | Plan y matriz consistentes | 20-30 min |
| 1. Diseñar y preparar | Diagrama, esquema, configuración, MySQL, migraciones, datos ficticios, scripts y Git | Instalación y conexión reproducibles; primer prompt archivado | 60-90 min |
| 2. Escribir pruebas | Casos de agenda y contratos; ejecutar antes de implementar | Fallos por reglas todavía no implementadas; evidencia roja | 45-60 min |
| 3. Implementar núcleo | Dueños, mascotas, veterinarios, historial y agenda por ciclos TDD | Recorrido funcional y pruebas unitarias/integración en verde | 120-150 min |
| 4. Notificar y demostrar | Recordatorios con reloj controlado y ejecución manual; pantalla mínima si hay margen | Correo simulado observable, sin duplicados; flujo demostrable | 60-90 min |
| 5. Revisar y automatizar | Refactorización, revisión con IA, correcciones, CI y cobertura | Informe, validaciones y workflow comprobado | 60-90 min |
| 6. Cerrar entrega | README/API, cinco prompts, reflexión, prueba desde instalación limpia | URL accesible y documentos finales completos | 90 min |

Dentro de cada etapa funcional se aplica TDD: la fase 2 inicia la agenda, pero las reglas nuevas de otras áreas también deben probarse antes de implementarse.

Si falta tiempo: reducir acabado visual y ampliaciones; conservar registro/historial, ausencia de choques, notificaciones, pruebas y entregables. Preparar la documentación y bitácora en paralelo al trabajo, sin esperar al último momento.

## 6. Pruebas y aceptación

### Agenda: casos imprescindibles

1. Cita válida con mascota y veterinario existentes: se guarda.
2. Mismo veterinario y mismo horario: rechazo por conflicto.
3. Solapamiento parcial al inicio o final: rechazo.
4. Cita contenida dentro de otra, o que contiene otra: rechazo.
5. Citas contiguas: permitidas.
6. Horario igual con veterinarios distintos: permitido.
7. Fecha pasada, intervalo vacío/invertido o fecha sin zona: rechazo con error claro.
8. Mascota o veterinario inexistente: rechazo sin registros parciales.
9. Dos reservas concurrentes incompatibles en MySQL: exactamente una se confirma.

### Registros y recordatorios

- Mascota vinculada a un dueño válido; rechazo de asociación inexistente.
- Historial ligado a la mascota correcta y ordenado cronológicamente; no mezclar historiales.
- Cita dentro de la ventana: un registro de correo simulado al destinatario correcto.
- Cita pasada o fuera de la ventana: ningún aviso.
- Casos exactos del límite de 24 horas y del instante actual: comportamiento documentado.
- Dos ejecuciones, incluidas ejecuciones concurrentes: ningún aviso duplicado.

Usar unitarias para reglas con reloj controlado; integración contra MySQL para migraciones, restricciones, transacciones y persistencia; un recorrido completo desde crear dueño hasta consultar el recordatorio. No sustituir las pruebas de concurrencia por mocks.

Adoptar **80% como mínimo propuesto** de cobertura en líneas, ramas, funciones y sentencias sobre el código de aplicación comprobable. Es una sugerencia del prompt de la diapositiva 19, no un umbral explícito de la captura. La cobertura no reemplaza los casos críticos. Justificar exclusiones y no excluir módulos de negocio para alcanzar el número.

CI propuesta: instalación reproducible, verificación de tipos, linter, unitarias con cobertura, integración con servicio MySQL y compilación en cada push y PR. Guardar evidencia del resultado remoto; una ejecución local no demuestra que GitHub Actions funcionó.

## 7. Evidencia de uso de IA

Conservar el texto exacto de cada prompt y la respuesta real. Seleccionar cinco interacciones con suficiente contenido para mostrar criterio:

| Candidata | Qué pedir | Qué revisar y registrar |
| --- | --- | --- |
| Arquitectura | Modelo, límites, carpetas y alternativas | Si el diseño sobredimensiona el problema o acopla módulos; decisión adoptada |
| TDD | Casos de agenda antes del código | Límites omitidos, pruebas que no detectan errores y fallo inicial esperado |
| Implementación | Resolver un caso de uso con contratos existentes | Cambios humanos, concurrencia, validaciones y evidencia verde |
| Refactorización | Evaluar SOLID y dependencias | Diferencias de código y pruebas que mantienen el comportamiento |
| Revisión/CI | Auditar código real y proponer automatización | Hallazgos comprobados, falsos positivos y correcciones verificadas |

Son temas previstos, no prompts ya ejecutados. Pueden seleccionarse otros si aportan mejor evidencia.

Cada entrada debe incluir lo exigido por la captura: prompt exacto, herramienta, respuesta y crítica de los cambios al código, sus motivos y las alucinaciones detectadas. Si no hubo alucinaciones comprobadas, declararlo y describir la validación. No provocar ni inventar errores para llenar el apartado.

Para TDD, guardar prueba, comando y resultado rojo; cambio mínimo y resultado verde; refactorización y nueva validación. Los commits pueden reforzar la secuencia, sin reconstruir evidencia falsa al final.

La revisión de seguridad y rendimiento abordará consultas parametrizadas, validación, escape de contenido al mostrar notas, errores sin secretos, consultas N+1 y los índices relevantes. Las conclusiones deben referirse al código realmente construido.

## 8. Documentos de cierre

En `outputs/` se prepararán al terminar:

- `BITACORA-PROMPTS.md`: exactamente cinco entradas seleccionadas, con evidencia enlazada dentro del repositorio.
- `REFLEXION-TECNICA.md`: máximo 500 palabras; objetivo sugerido de 350-450. Explicar momentos concretos en que la IA redujo y aumentó la carga cognitiva y medidas reales para evitar deuda técnica.
- `INFORME-PRUEBAS.md`: entorno, comandos, resultados, cobertura, concurrencia y limitaciones.
- `ENTREGA.md`: enlace al repositorio, commit final, ubicación de documentos y recorrido breve.

El informe y la hoja de entrega organizan el cierre; no se presentan como nuevos archivos obligatorios de la captura. Markdown está permitido para la bitácora, por lo que no hace falta convertirla a PDF para cumplir.

La reflexión no se escribirá como experiencia personal inventada del estudiante: durante el trabajo se tomarán notas y el estudiante revisará la voz final. El README y el contrato de API se redactarán con comandos y respuestas comprobados.

## 9. Lista de verificación antes de entregar

- [ ] Los tres requisitos funcionales están implementados y demostrados.
- [ ] Arquitectura modular y aplicación de SOLID explicadas con código concreto.
- [ ] TDD documentado con evidencia real y resultado de pruebas.
- [ ] Reservas concurrentes protegidas y probadas contra MySQL.
- [ ] Notificaciones simuladas observables y sin duplicados.
- [ ] Linter, tipos, compilación, pruebas y cobertura cumplen lo acordado.
- [ ] CI ejecutado en el remoto y resultado comprobado.
- [ ] README y documentación de API coinciden con el proyecto.
- [ ] Instalación desde una copia limpia y datos de demostración verificadas.
- [ ] Cinco prompts completos, respuestas accesibles y crítica específica.
- [ ] Reflexión de máximo 500 palabras, revisada por el estudiante.
- [ ] Repositorio accesible para el profesor; si es privado, acceso resuelto.
- [ ] Sin credenciales, bases locales o datos personales reales versionados.
- [ ] Enlace y archivos enviados antes del cierre de la plataforma.

## 10. Decisiones a revisar contigo

Recomiendo mantener: **monolito modular, TypeScript y MySQL; API como núcleo; interfaz sencilla; sin videollamadas; bitácora y pruebas desde el primer cambio**.

Los puntos con más impacto para ajustar el plan son tu experiencia con ese lenguaje, si existe alguna instrucción adicional del profesor sobre interfaz o telemedicina, y el repositorio/cuenta donde se entregará. El diseño puede revisarse ahora; la cuenta remota solo hace falta para publicar y comprobar CI más adelante.

Hasta este punto se preservaron las fuentes, se analizó el material, se preparó la estructura y se escribieron documentos de planificación. **No se ha programado, instalado dependencias, inicializado Git ni publicado nada.**
