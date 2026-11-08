# Revisión independiente con Claude Code

Estado: **preparada, todavía no ejecutada**. Abrir Claude Code en:

```text
/Users/donato/Ago-Dic 2026/Fun de IA/VetSync
```

Pegar el siguiente prompt tal cual. Después conservar el prompt y la respuesta exactos en la bitácora y traer los hallazgos a esta conversación para evaluarlos.

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

No aceptar automáticamente los hallazgos de Claude. Comprobar cada uno con el código y, si corresponde, una prueba que falle antes de corregirlo. Registrar falsos positivos y decisiones justificadas. La segunda herramienta complementa la revisión del estudiante.
