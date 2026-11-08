# Entrega de VetSync

**Materia:** Optativa I: Fundamentos de la Inteligencia Artificial en la Ingeniería de de Software.

Caso de uso: Sistema de Gestión de Citas y Telemedicina Veterinaria. Primera asignación de la unidad 3.

## Código fuente

[Repositorio público en GitHub](https://github.com/donatohdez/VetSync).

La rama `main` contiene código, documentación, migraciones, pruebas y evidencia. El README explica la instalación y la demostración. No se incluye una URL de despliegue público: la aplicación se ejecuta localmente.

## Documentos

1. [Bitácora de cinco interacciones](BITACORA-PROMPTS.md): prompts conservados, herramienta, respuesta y crítica técnica.
2. [Reflexión técnica](REFLEXION-TECNICA.md): 370 palabras incluyendo el título, basada en el aporte del estudiante y los hechos del proyecto.
3. [Informe de pruebas](INFORME-PRUEBAS.md) y [CI remoto](CI-REMOTO.md).
4. [Evaluación de la revisión de Claude](RESULTADO-REVISION-CLAUDE.md).

La documentación de API está en `docs/api/` y la trazabilidad de requisitos en `docs/requisitos/MATRIZ.md`.

## Validación

Código funcional validado en el primer CI: `cfba2fc4e274ab169288891628a2b500b708c96a`.

[Primera ejecución remota aprobada](https://github.com/donatohdez/VetSync/actions/runs/42505243566): 59 pruebas unitarias/integración y dos recorridos de navegador. Las actualizaciones documentales posteriores activan nuevamente el workflow; [consultar la ejecución del último commit](https://github.com/donatohdez/VetSync/actions/workflows/ci.yml).

## Antes de enviar a la plataforma

El estudiante debe revisar la bitácora y la reflexión, recorrer la aplicación y comprobar que puede explicar sus decisiones. Después debe enviar el enlace y los documentos requeridos; no se ha realizado la entrega en la plataforma escolar.

## Actualización funcional

La última validación local registra 81 pruebas de backend y diez de navegador, con recepción, registro durante reserva, disponibilidad y diseño pulido. La primera ejecución de CI citada arriba es histórica; el workflow enlazado permite comprobar la versión más reciente. El estudiante confirmó el uso literal del prompt preparado para Claude.
