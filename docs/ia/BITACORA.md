# Bitácora de IA en construcción

Estado: cinco interacciones reales registradas. La versión para revisión y entrega está en `outputs/BITACORA-PROMPTS.md`. La revisión con Claude fue entregada por el estudiante en `test1.md` y se contrastó con el código. No se inventarán prompts ni resultados para completar el número.

## 01. Analizar materiales y planificar

- Fecha: 8 de noviembre de 2026.
- Herramienta: Codex Desktop, esta conversación. No se registra un identificador de modelo que la interfaz no haya confirmado.
- Contexto: presentación de 20 páginas y captura de la asignación, conservadas en `../referencias/`.
- Prompt exacto: [01-planificacion.txt](prompts/01-planificacion.txt).
- Respuesta de la IA: el [plan completo generado](../../outputs/PLAN-DE-TRABAJO.md), la matriz de requisitos y la estructura inicial de carpetas. Se conserva el documento producido; no se presenta como una transcripción completa del chat.
- Decisión humana comprobada: el estudiante escribió “me gusta el plan” antes de autorizar el inicio.
- Crítica técnica: se eligió monolito modular porque el profesor lo permite; se distinguieron requisitos explícitos de los prompts sugeridos. No se agregó videollamada por el título ni se convirtió el 80% de cobertura en un requisito textual de la captura.
- Cambios al código: no aplicaba en esta etapa, que produjo planificación y documentación.
- Alucinaciones: no se identificó una alucinación comprobada en el alcance; se conservaron las ambigüedades como supuestos para revisión.
- Revisión personal del estudiante: pendiente de añadir con sus propias observaciones.

## 02. Implementar y verificar el proyecto

- Fecha: 8 de noviembre de 2026.
- Herramienta: Codex Desktop, misma conversación.
- Prompt exacto: [02-iniciar-proyecto.txt](prompts/02-iniciar-proyecto.txt).
- Contexto: plan aprobado, AGENTS.md y matriz de requisitos.
- Respuesta principal de la IA: código en `src/`, pruebas en `tests/`, migraciones en `database/`, scripts y documentación técnica. El historial Git conserva los estados iniciales y la versión lista para revisión; consultar también [informe de pruebas](../../outputs/INFORME-PRUEBAS.md).
- Evidencia de secuencia: commits `769f2a4` (primer rojo), `d7fadff` (primer verde), `0ba4db5` (segundo rojo), más la versión funcional posterior. Los archivos de salida originales están en `../evidencias/tdd/`.
- Errores reales detectados durante el desarrollo: TypeScript rechazó `unknown[]` como parámetros de mysql2 y posibles valores indefinidos de datos semilla; se restringieron los tipos y se declararon tuplas constantes. El navegador detectó nombres accesibles contaminados por iconos en navegación; se agregaron aria-label. La auditoría detectó una dependencia transitiva vulnerable; se aplicó un override acotado, con linter y auditoría posteriores.
- Mejoras de diseño: persistencia desacoplada de casos de uso, reloj inyectado, bloqueo transaccional por veterinario y restricción única para recordatorios. Los archivos TypeScript dejaron de servirse como recursos estáticos.
- Cómo se verificó: tipos, linter, compilación, 36 pruebas unitarias/integración en MySQL y dos pruebas de navegador. Las ejecuciones iniciales y corregidas están conservadas.
- Autoría de las correcciones anteriores: Codex. **No se atribuyen al estudiante cambios que todavía no haya revisado o realizado.** Estos fallos de código no se etiquetan automáticamente como alucinaciones.
- Crítica y comprensión humana: pendientes del estudiante. La revisión independiente con Claude ya fue recibida y sus hallazgos se evaluaron en las entradas siguientes.

## 03. Revisión independiente con Claude

- Fecha: 8 de noviembre de 2026.
- Herramienta: Claude Code; el informe se identifica como “Sonnet 5.5”. Ese nombre se registra según el informe, sin verificación independiente de la interfaz.
- Prompt preparado: [03-revision-claude.txt](prompts/03-revision-claude.txt). Es el bloque que se proporcionó para copiar. El informe señala que se utilizó `outputs/REVISION-CON-CLAUDE.md`; si se modificó al enviarlo, conservar también esa versión del chat para garantizar literalidad.
- Respuesta de Claude: [informe original preservado](../evidencias/revision/claude-test1-original.md), idéntico al `test1.md` entregado por el usuario.
- Crítica de Codex: M1 era una carencia de pruebas, no un error de los operadores SQL actuales; B1 y B4 se reprodujeron con pruebas fallidas; B2 es una mejora de presentación porque el instante UTC original era correcto, aunque menos cómodo para el usuario.
- Propuesta pospuesta: B3 (máximos de duración/horizonte) no se impuso sin una regla de negocio definida. El enunciado no especifica esos máximos.
- Falso positivo descartado por Claude y verificado contra documentación: exigir JSON en `/notifications/run` es el contrato declarado, no un error nuevo.
- Límites: las cifras de la sonda de 40 solicitudes y 30 rondas pertenecen al informe de Claude. No se conservó aquí su script ni se presentan como una ejecución propia de Codex.
- Revisión humana: el estudiante ejecutó la revisión y compartió su archivo; falta su comentario personal sobre lo aprendido y las decisiones técnicas.

## 04. Contrastar y corregir la revisión

- Fecha: 8 de noviembre de 2026.
- Herramienta: Codex Desktop, esta conversación.
- Mensaje exacto que aportó el resultado: [04-resultado-claude.txt](prompts/04-resultado-claude.txt). La validación y corrección continúa el flujo previamente acordado; no se sustituye ese mensaje por un prompt técnico inventado.
- Respuesta de la IA: correcciones de configuración/avisos/transacciones, pruebas SQL y [evaluación de hallazgos](../../outputs/RESULTADO-REVISION-CLAUDE.md).
- Cambios: esquema de entorno puro y probado; zona configurada inyectada al servicio de avisos; texto en hora de clínica; error agregado con causa original cuando falla también el rollback; matrices reales de integración.
- Verificación: estados rojos y verdes en `../evidencias/tdd/05*` a `07*`; cuatro mutaciones temporales de operadores SQL detectadas por las nuevas pruebas, con restauración exacta de los fuentes.
- Crítica: no se cambió el SQL correcto ni se adoptaron automáticamente todas las mejoras opcionales. Se reprodujo antes de corregir y se separó la evidencia propia de las afirmaciones de la otra herramienta.
- Autoría: modificaciones de Codex, motivadas por revisión de Claude. No se atribuyen cambios manuales al estudiante.

## 05. Publicar y comprobar CI

- Fecha: 8 de noviembre de 2026.
- Herramienta: Codex Desktop, con Git/GitHub Actions como herramientas de verificación.
- Prompt exacto: [05-repositorio.txt](prompts/05-repositorio.txt). Es una solicitud breve que continúa el contexto del proyecto; no se reemplaza por un prompt más elaborado que no se haya utilizado.
- Respuesta de la IA: conexión del remoto, publicación del historial local y verificación de CI; [evidencia](../../outputs/CI-REMOTO.md).
- Verificación real: repositorio inicialmente vacío, push sin forzar historial y primera ejecución remota exitosa. El runner instaló dependencias desde cero, aplicó la migración, ejecutó 59 pruebas y dos recorridos de navegador.
- Crítica técnica: se conservaron los commits rojos y verdes, se comprobó que `.env` no estaba versionado y se distinguió la validación local de la ejecución en una máquina nueva. No se dio CI por aprobado solo porque existía el YAML.
- Cambios al código funcional: ninguno en esta interacción; se actualizaron enlaces y documentación de entrega. El código validado en la primera ejecución corresponde a `cfba2fc4e274ab169288891628a2b500b708c96a`.
- Alucinaciones detectadas: ninguna comprobada en esta interacción. La evidencia son el commit remoto, los logs y el resultado de Actions, no una afirmación sin ejecución.

## Revisión personal pendiente

El estudiante aportó su experiencia de ahorro de tiempo en código y pruebas; se conserva el mensaje original en `respuestas/reflexion-aporte-estudiante.txt`. Se redactó una reflexión de menos de 500 palabras con ese aporte y hechos comprobados. Debe revisar la voz final y las cinco entradas, especialmente que el prompt enviado a Claude coincide con el bloque conservado. No se inventaron cambios manuales ni experiencias personales para completar campos.
