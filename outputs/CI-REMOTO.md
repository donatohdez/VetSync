# Verificación en GitHub Actions

Repositorio público: [donatohdez/VetSync](https://github.com/donatohdez/VetSync).

Primera ejecución: [42505243566](https://github.com/donatohdez/VetSync/actions/runs/42505243566). Resultado: **success**, completada el 8 de noviembre de 2026 a las 10:31 de Hermosillo.

Commit de código validado: `cfba2fc4e274ab169288891628a2b500b708c96a`.

## Comprobaciones aprobadas

- Runner Ubuntu, Node.js 24 y MySQL 8.4 con una base nueva `vetsync_test`.
- Instalación reproducible con `npm ci` y aplicación de migraciones.
- Tipos, linter, compilación y cobertura.
- 59 pruebas: 34 unitarias y 25 de integración.
- Cobertura de líneas 98.94%; ramas 96.96%; funciones y sentencias 98.46%.
- Instalación de Chromium, carga de datos ficticios y dos recorridos de navegador.
- Publicación de artefactos de evidencia en la ejecución.

Los logs y los metadatos originales están en `docs/evidencias/pruebas/ci-github-inicial.txt` y `.json`. El workflow corre nuevamente con cada push y PR. La [página de Actions](https://github.com/donatohdez/VetSync/actions/workflows/ci.yml) permite consultar la ejecución del último commit, incluidas actualizaciones documentales posteriores.

El código local y el remoto conservan el historial TDD. `.env`, dependencias instaladas, compilados y temporales permanecen excluidos de Git. La visibilidad pública permite consultar el código sin una invitación al profesor.
