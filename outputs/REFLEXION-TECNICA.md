# Reflexión técnica: uso de IA en VetSync

La principal ventaja de utilizar inteligencia artificial en VetSync fue el ahorro de tiempo al escribir código y trabajar con pruebas. Esto permitió avanzar con rapidez en un sistema que debía registrar dueños y mascotas, conservar historial médico, evitar choques de citas y simular recordatorios. La asistencia redujo el esfuerzo de preparar estructuras repetitivas y configuraciones iniciales.

Las dos herramientas tuvieron funciones diferentes. Codex se utilizó para planificar, implementar y verificar el proyecto; Claude Code realizó una revisión independiente y comprobaciones adicionales. La revisión de Claude me resultó rápida y útil. Comparar sus observaciones con la implementación ayudó a que la evaluación no dependiera únicamente de la herramienta que había generado el código.

Sin embargo, ahorrar tiempo no elimina el trabajo de comprender y comprobar los resultados. Un caso concreto fue la cobertura de los límites de horario: algunas pruebas utilizaban repositorios en memoria que repetían la condición esperada. Eso no garantizaba que detectaran un operador incorrecto en las consultas reales. Se añadieron pruebas contra MySQL y se introdujeron cuatro mutaciones temporales del SQL; cada una produjo el fallo esperado y después se restauró el código correcto.

Este ejemplo muestra dónde aumenta la carga cognitiva: hay que interpretar los hallazgos, distinguir errores de mejoras opcionales y comprobar que una prueba verifica el comportamiento importante. También se revisaron la zona horaria de los recordatorios y la conservación del error original cuando falla una transacción. Aceptar automáticamente todas las sugerencias habría añadido decisiones sin justificar, como imponer una duración máxima que el enunciado no definía.

Para reducir el riesgo de deuda técnica se separaron módulos, casos de uso y adaptadores, se inyectaron dependencias y se aplicó TypeScript estricto. Las pruebas, el linter y la compilación se ejecutaron localmente y en GitHub Actions. Se conservaron evidencias de los ciclos de pruebas y de las correcciones. La cobertura se acompañó de casos críticos de concurrencia y límites, en lugar de tratar el porcentaje como garantía suficiente.

Considero que la IA fue especialmente útil para acelerar la construcción y la revisión. Mi responsabilidad sigue siendo revisar los documentos, comprender las decisiones y poder explicar cómo funciona el sistema; la rapidez de las herramientas no sustituye esa comprensión.
