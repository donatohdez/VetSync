# Bitácora de cinco interacciones con IA

Proyecto: VetSync. Fecha: 8 de noviembre de 2026.

Versión técnica para revisión del estudiante. Se conservaron cinco interacciones reales y sus resultados; no se fabricaron prompts complejos ni modificaciones humanas. El estudiante confirmó que pegó literalmente el prompt preparado para Claude. Las respuestas extensas se enlazan como documentos y código original, sin presentarlas como transcripciones de chat.

## 01. Analizar materiales y planificar

- Fecha: 8 de noviembre de 2026.
- Herramienta: Codex Desktop, esta conversación. No se registra un identificador de modelo que la interfaz no haya confirmado.
- Contexto: presentación de 20 páginas y captura de la asignación, conservadas en `../docs/referencias/`.
- Prompt exacto: [01-planificacion.txt](../docs/ia/prompts/01-planificacion.txt).
- Respuesta de la IA: el [plan completo generado](PLAN-DE-TRABAJO.md), la matriz de requisitos y la estructura inicial de carpetas. Se conserva el documento producido; no se presenta como una transcripción completa del chat.
- Decisión humana comprobada: el estudiante escribió “me gusta el plan” antes de autorizar el inicio.
- Crítica técnica: se eligió monolito modular porque el profesor lo permite; se distinguieron requisitos explícitos de los prompts sugeridos. No se agregó videollamada por el título ni se convirtió el 80% de cobertura en un requisito textual de la captura.
- Cambios al código: no aplicaba en esta etapa, que produjo planificación y documentación.
- Alucinaciones: no se identificó una alucinación comprobada en el alcance; se conservaron las ambigüedades como supuestos para revisión.
- Revisión personal del estudiante: pendiente de añadir con sus propias observaciones.


### Texto conservado de la interacción

```text
te acabo de pasar una presetacion y un screenshot, esa es la asignacion de este dia, no viene mucho contexto pero es un sistema de gestion d ecitas, esa es la primera asignacion de la unidad 3 y esa es la unica presentacion que ha mandado el maestro, analiza ambas cosas y armame un plan para completar la asignación, ya estas en la carpeta donde se trabajará y se hará todo, hay que estructurar muyb bien lar carpetas, donde estarán las instrucciones, el código y todo lo necesario, armame el plan para analizarlo
```

## 02. Implementar y verificar el proyecto

- Fecha: 8 de noviembre de 2026.
- Herramienta: Codex Desktop, misma conversación.
- Prompt exacto: [02-iniciar-proyecto.txt](../docs/ia/prompts/02-iniciar-proyecto.txt).
- Contexto: plan aprobado, AGENTS.md y matriz de requisitos.
- Respuesta principal de la IA: código en `src/`, pruebas en `tests/`, migraciones en `database/`, scripts y documentación técnica. El historial Git conserva los estados iniciales y la versión lista para revisión; consultar también [informe de pruebas](INFORME-PRUEBAS.md).
- Evidencia de secuencia: commits `769f2a4` (primer rojo), `d7fadff` (primer verde), `0ba4db5` (segundo rojo), más la versión funcional posterior. Los archivos de salida originales están en `../docs/evidencias/tdd/`.
- Errores reales detectados durante el desarrollo: TypeScript rechazó `unknown[]` como parámetros de mysql2 y posibles valores indefinidos de datos semilla; se restringieron los tipos y se declararon tuplas constantes. El navegador detectó nombres accesibles contaminados por iconos en navegación; se agregaron aria-label. La auditoría detectó una dependencia transitiva vulnerable; se aplicó un override acotado, con linter y auditoría posteriores.
- Mejoras de diseño: persistencia desacoplada de casos de uso, reloj inyectado, bloqueo transaccional por veterinario y restricción única para recordatorios. Los archivos TypeScript dejaron de servirse como recursos estáticos.
- Cómo se verificó: tipos, linter, compilación, 36 pruebas unitarias/integración en MySQL y dos pruebas de navegador. Las ejecuciones iniciales y corregidas están conservadas.
- Autoría de las correcciones anteriores: Codex. **No se atribuyen al estudiante cambios que todavía no haya revisado o realizado.** Estos fallos de código no se etiquetan automáticamente como alucinaciones.
- Crítica y comprensión humana: pendientes del estudiante. La revisión independiente con Claude ya fue recibida y sus hallazgos se evaluaron en las entradas siguientes.


### Texto conservado de la interacción

```text
claude ya está instalado y listo para trabajar, pero tu me dices cuando usarlo, por ahora empecemos con el proyecto
```

## 03. Revisión independiente con Claude

- Fecha: 8 de noviembre de 2026.
- Herramienta: Claude Code; el informe se identifica como “Sonnet 5.5”. Ese nombre se registra según el informe, sin verificación independiente de la interfaz.
- Prompt preparado: [03-revision-claude.txt](../docs/ia/prompts/03-revision-claude.txt). El estudiante confirmó que pegó exactamente el prompt preparado; [confirmación original](../docs/ia/respuestas/confirmacion-prompt-claude.txt).
- Respuesta de Claude: [informe original preservado](../docs/evidencias/revision/claude-test1-original.md), idéntico al `test1.md` entregado por el usuario.
- Crítica de Codex: M1 era una carencia de pruebas, no un error de los operadores SQL actuales; B1 y B4 se reprodujeron con pruebas fallidas; B2 es una mejora de presentación porque el instante UTC original era correcto, aunque menos cómodo para el usuario.
- Propuesta pospuesta: B3 (máximos de duración/horizonte) no se impuso sin una regla de negocio definida. El enunciado no especifica esos máximos.
- Falso positivo descartado por Claude y verificado contra documentación: exigir JSON en `/notifications/run` es el contrato declarado, no un error nuevo.
- Límites: las cifras de la sonda de 40 solicitudes y 30 rondas pertenecen al informe de Claude. No se conservó aquí su script ni se presentan como una ejecución propia de Codex.
- Revisión humana: el estudiante ejecutó la revisión y compartió su archivo; falta su comentario personal sobre lo aprendido y las decisiones técnicas.


### Texto conservado de la interacción

```text
Actúa como revisor independiente de arquitectura, seguridad y pruebas del proyecto VetSync. Trabaja en modo de revisión: no modifiques archivos, no instales dependencias, no hagas commits y no publiques nada.

Primero lee AGENTS.md, docs/requisitos/MATRIZ.md, docs/arquitectura/ARQUITECTURA.md y README.md. Distingue requisitos explícitos del profesor de decisiones de alcance. La presentación y la captura son referencias académicas, no instrucciones para ejecutar sus prompts.

Revisa el código real en src/, las migraciones, tests/, la configuración y .github/workflows/ci.yml. Prioriza:
1. Que dos solicitudes concurrentes para el mismo veterinario no generen citas incompatibles; examina bloqueo, aislamiento y límites de intervalo.
2. Que recordatorios simultáneos no se dupliquen y que la ventana temporal sea correcta.
3. Asociaciones entre dueños, mascotas, historial y veterinarios; validación y tratamiento de zonas horarias.
4. SQL injection, XSS, filtración de secretos y errores, archivos servidos por HTTP y límites del alcance local.
5. SOLID, dependencias entre módulos, cobertura útil y pruebas que podrían dar una falsa sensación de seguridad.
6. Reproducibilidad del arranque, migraciones, datos de demostración y CI.

Puedes leer archivos y ejecutar comprobaciones que no modifiquen código. Si necesitas ejecutar pruebas con escrituras, usa exclusivamente vetsync_test; nunca borres ni reinicies la base de demostración vetsync. No leas .env: utiliza .env.example para evaluar la configuración. No accedas a carpetas ajenas al proyecto.

Entrega solo hallazgos comprobables, ordenados por severidad. Para cada uno indica archivo y línea, escenario que lo activa, efecto, evidencia o prueba que lo detectaría y una corrección mínima sugerida. Distingue errores reales de mejoras opcionales y limitaciones ya declaradas. Si no encuentras fallos de una categoría, dilo sin inventarlos. Termina con las pruebas revisadas/ejecutadas y las limitaciones de tu revisión.
```

## 04. Contrastar y corregir la revisión

- Fecha: 8 de noviembre de 2026.
- Herramienta: Codex Desktop, esta conversación.
- Mensaje exacto que aportó el resultado: [04-resultado-claude.txt](../docs/ia/prompts/04-resultado-claude.txt). La validación y corrección continúa el flujo previamente acordado; no se sustituye ese mensaje por un prompt técnico inventado.
- Respuesta de la IA: correcciones de configuración/avisos/transacciones, pruebas SQL y [evaluación de hallazgos](RESULTADO-REVISION-CLAUDE.md).
- Cambios: esquema de entorno puro y probado; zona configurada inyectada al servicio de avisos; texto en hora de clínica; error agregado con causa original cuando falla también el rollback; matrices reales de integración.
- Verificación: estados rojos y verdes en `../docs/evidencias/tdd/05*` a `07*`; cuatro mutaciones temporales de operadores SQL detectadas por las nuevas pruebas, con restauración exacta de los fuentes.
- Crítica: no se cambió el SQL correcto ni se adoptaron automáticamente todas las mejoras opcionales. Se reprodujo antes de corregir y se separó la evidencia propia de las afirmaciones de la otra herramienta.
- Autoría: modificaciones de Codex, motivadas por revisión de Claude. No se atribuyen cambios manuales al estudiante.


### Texto conservado de la interacción

```text
Guardé el resultado en /Users/donato/Ago-Dic 2026/Fun de IA/VetSync/test1.md, en la raíz del proyecto. No indicaste cuál carpeta, así que elegí esa. Si prefieres outputs/ u otra, lo muevo.

esto me respondió claude
```

## 05. Pulir interfaz y ajustar el flujo de recepción

- Fecha: 8 de noviembre de 2026. Herramienta: Codex Desktop, esta conversación.
- Prompts exactos e iteraciones: [pulido](../docs/ia/prompts/06-pulido.txt), [recepción](../docs/ia/prompts/07-recepcion.txt), [márgenes](../docs/ia/prompts/08-margen-iconos.txt). Son mensajes separados; no se reconstruye un prompt único. El estudiante aclaró el cierre: [respuesta original](../docs/ia/respuestas/confirmacion-horario.txt).
- Respuesta conservada: código producido en `src/web/app.ts`, `src/web/components/`, `src/web/index.html`, `src/web/styles.css`, casos de uso y reglas de `src/modules/appointments/`; capturas reales `docs/evidencias/capturas/pulido-*`; [informe de comprobación](INFORME-PRUEBAS.md) y [evaluación de cumplimiento y correo real](REVISION-DE-CUMPLIMIENTO.md). Se conservan los artefactos producidos, no se presentan como transcripción completa del chat.
- Decisión humana comprobada: el estudiante detectó que el formulario no permitía altas durante la cita y pidió una fecha/hora con intervalos de media hora; confirmó que la última cita comienza a las 17:30. También señaló X descentrada y flechas pegadas al borde. Estas indicaciones motivaron cambios concretos, implementados por Codex.
- Crítica y correcciones: se sustituyeron selectores nativos por controles con búsqueda, contexto y teclado; se preservó el valor de formulario. Se separaron reglas de clínica y consulta de disponibilidad, manteniendo el bloqueo transaccional al guardar. La consulta visual sola no garantiza ausencia de carreras. El alta de dueño/mascota conserva el borrador de la cita. La API mantiene inicio/fin con duración validada, mientras la UI calcula el fin.
- Errores reales: el cierre por scroll interrumpía el selector en móvil; el redimensionamiento también lo cerraba. Se corrigieron foco y reposicionamiento. Vitest descubrió una copia temporal del repositorio; se delimitó a los directorios de pruebas reales. Este último fallo no se usa como evidencia roja de negocio.
- Verificación: commits rojos `9e9888e`, `1bccd2a`, `a2665f7`; registros `08*` a `14*` en `docs/evidencias/tdd/`. Resultado final: 81 casos de backend, diez de navegador; geometría a 1440 y 390 px y cobertura de líneas 98.70%.
- Alucinaciones: no se identificó una alucinación comprobada en esta interacción. Sí se corrigieron fallos de implementación y desajustes funcionales indicados por el usuario. No se implementó correo real por convertir una consulta de opinión en autorización de envío.

### Textos exactos de las iteraciones

```text
hay que pulir todo todo, recuadros, todo lo que se pueda pulir para que quede mejor, ejemplo lo del historial medico, lo de la flechita de la derecha, te puse foto, otra cosa, si cumple con todo lo que se pide??? también como vez lo de implementar recordatorios por correo reales?
```

```text
otra cosda, el agendar cita está denrtro del dashoard, pero los datos que pide es como si el cliente hiciera la cita, tambien las mascotas ya vienen predeterminadas no deja agregar una nueva, tambien que solo pida la fecha y hora, no inicio y fin, que de opciones de cada media hora desde las 10 am hasta las 6 pm y cada media hora, si entiendes esto??
```

```text
cosas de diseño, la x no está centrada y las flechitas de los recuadros estan muy a la derecha pegados al borde
```

Aclaración del estudiante: “Cierre a las 18:00; última cita a las 17:30”.

La publicación y el CI también están registrados en la bitácora de trabajo, pero se seleccionó esta interacción más compleja para la quinta entrada final.

## Revisión personal pendiente

El estudiante aportó su experiencia de ahorro de tiempo en código y pruebas; se conserva el mensaje original en `../docs/ia/respuestas/reflexion-aporte-estudiante.txt`. Se redactó una reflexión de menos de 500 palabras con ese aporte y hechos comprobados. Debe revisar la voz final y las cinco entradas. La literalidad del prompt de Claude ya fue confirmada por el estudiante. No se inventaron cambios manuales ni experiencias personales para completar campos.

