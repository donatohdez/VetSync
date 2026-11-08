# Reflexión técnica: uso de IA en VetSync

Trabajar con Codex y Claude Code me permitió ahorrar mucho tiempo en la escritura de código y en las pruebas de VetSync. Codex apoyó la planificación y la implementación, mientras que Claude realizó una revisión independiente. Esa división agilizó el trabajo manual y permitió contrastar el resultado con otra herramienta.

Mi participación se concentró en revisar personalmente los flujos de la aplicación: agendar citas, agregar mascotas y recorrer las distintas funciones. Las fechas fueron la parte que más me costó comprobar. El formulario pedía inicio y fin, lo que hacía más complicada la revisión. Por eso propuse que solamente se eligieran una fecha y una hora, con opciones cada media hora. También aclaré que la clínica cerraría a las 18:00 y que la última cita comenzaría a las 17:30. Codex implementó esos ajustes y el cálculo automático de la hora de fin.

La IA redujo mi carga al generar código y ejecutar comprobaciones, pero aumentó el trabajo necesario para revisar si lo construido correspondía al flujo que necesitábamos. Tener una función implementada no bastaba: al utilizarla aparecieron detalles que había que corregir, como el registro de mascotas durante la reserva y la presentación de algunos controles. Mi revisión del funcionamiento complementó las pruebas automatizadas.

Para reducir el riesgo de deuda técnica, el proyecto utilizó módulos separados, validación de entradas, TypeScript estricto, pruebas y verificaciones en GitHub Actions. Estas medidas fueron implementadas y comprobadas por los asistentes; no las presento como trabajo técnico realizado manualmente por mí. La auditoría de Claude también identificó pendientes, por lo que esas verificaciones no significan que el sistema esté libre de errores.

Aprendí que trabajar con ambas herramientas acelera mucho el desarrollo, pero no sustituye la comprobación personal. Mi responsabilidad fue recorrer la aplicación, señalar los problemas que observé y definir ajustes del flujo. Antes de entregar, también debo comprender las decisiones principales y revisar que los documentos describan fielmente lo que hicimos.
