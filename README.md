# VetSync

Sistema local de gestión de citas veterinarias, construido para la primera asignación de la unidad 3 de Fundamentos de IA en Ingeniería de Software.

**Estado:** versión local funcional, revisada por Claude y corregida con pruebas de regresión; revisión del estudiante y publicación remota pendientes.

Incluye dueños, mascotas, historial médico, veterinarios de demostración, agenda protegida contra reservas simultáneas y correos simulados. Arquitectura de monolito modular con TypeScript, Express y MySQL. La interfaz está en español y se adapta a escritorio y móvil.

## Iniciar desde una instalación limpia

Requisitos: Node.js 24 o superior, npm y Docker Desktop en ejecución. Los comandos se ejecutan desde la raíz del proyecto:

```bash
cd '/Users/donato/Ago-Dic 2026/Fun de IA/VetSync'
npm ci
cp .env.example .env
docker compose up -d --wait
npm run db:migrate
npm run db:seed
npm run build
npm start
```

Abrir **http://127.0.0.1:3010**. Si `.env` ya existe, conservarlo en vez de copiar de nuevo el ejemplo. `Ctrl+C` detiene el servidor; `docker compose stop` detiene MySQL sin eliminar los datos.

El nombre de Compose se mantiene fijo (`te-x20`) para conservar el contenedor y volumen creados antes de mover la carpeta a VetSync. No depende del nombre actual del directorio. La base se publica únicamente en localhost:33316 y el servidor escucha en localhost:3010.

`npm run db:seed` inserta datos ficticios sin borrar los existentes: tres dueños, cuatro mascotas, tres veterinarios y cuatro citas. Las citas son relativas al momento de su primera carga; repetir el seed no mueve sus fechas ni sobrescribe registros. Si transcurre tiempo, se pueden consultar con el filtro “Todas” y crear nuevas citas.

## Demostración sugerida

1. En **Pacientes**, registrar un dueño y después su mascota.
2. Agendar una cita futura; el formulario propone 30 minutos de duración.
3. Intentar reservar de nuevo el mismo veterinario y horario: debe aparecer el conflicto sin crear otra cita.
4. En **Historial médico**, elegir la mascota y agregar una nota con fecha actual o pasada.
5. En **Recordatorios**, simular avisos para citas de las próximas 24 horas. Ejecutar otra vez: no debe duplicar mensajes.

Los formularios convierten la hora del dispositivo a UTC. La agenda se muestra en la zona configurada de la clínica, `America/Hermosillo` por defecto; la interfaz explica esta diferencia. El texto de los recordatorios también usa esa zona y la identifica explícitamente. Una zona no reconocida impide el arranque con un error de configuración. No hay envío de correo real.

## Desarrollo y verificación

```bash
npm run db:prepare-test
npm run test
npm run test:integration
npm run check
```

`db:prepare-test` crea/migra **vetsync_test** en el contenedor local. Las pruebas de integración limpian únicamente esa base antes de cada caso; no usan la base de demostración `vetsync`. `npm test` ejecuta solo unitarias. `npm run check` verifica tipos, linter, compilación y cobertura de unitarias más integración, con mínimo de 80% en líneas, ramas, funciones y sentencias.

Pruebas del navegador:

```bash
npx playwright install chromium
DB_NAME=vetsync_test npm run db:seed
npm run test:e2e
```

Playwright arranca su propio servidor en el puerto 3011 contra `vetsync_test`. Usa esa base también para el seed, como indica el comando. No ejecutar las pruebas de integración simultáneamente con las de navegador: comparten la base de pruebas.

En este equipo se aprovechó un Chromium ya instalado mediante la variable opcional `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. En una instalación nueva basta el comando de instalación anterior. El workflow de CI instala el navegador.

Para desarrollar el backend: `npm run dev`. Después de cambiar la interfaz TypeScript, ejecutar `npm run build` para regenerar los recursos; el modo dev actual no recompila automáticamente el frontend.

## Organización y documentación

- `src/modules/`: owners, pets, veterinarians, medical-records, appointments y notifications.
- `src/shared/`: reloj, validación, errores, conexión y transacciones.
- `src/http/` y `src/composition.ts`: transporte HTTP y ensamblado de dependencias.
- `src/web/`: interfaz; la compilación copia recursos a `dist/web/`.
- `tests/`: unitarias, integración MySQL y navegador.
- `database/`: migraciones; los datos de demostración están en `scripts/seed.ts`.
- [Requisitos y fuentes](docs/requisitos/MATRIZ.md).
- [Arquitectura y modelo](docs/arquitectura/ARQUITECTURA.md).
- [API](docs/api/API.md) y [contrato OpenAPI](docs/api/openapi.json).
- [Registro TDD](docs/calidad/REGISTRO-TDD.md) y evidencias en `docs/evidencias/`.
- [Bitácora en construcción](docs/ia/BITACORA.md).
- [Plan original](outputs/PLAN-DE-TRABAJO.md), documento previo al desarrollo.
- [Revisión preparada para Claude](outputs/REVISION-CON-CLAUDE.md).

## Configuración y límites

`.env.example` contiene configuración y credenciales ficticias exclusivas de desarrollo local; `.env` está excluido de Git. Se usan consultas parametrizadas, claves foráneas, validación de entradas y salidas de error controladas. Las notas se muestran como texto para evitar interpretación HTML.

Las notificaciones se ejecutan manualmente desde la UI o la API. Esta versión no incluye autenticación, videollamadas, cancelación, reprogramación, paginación ni despliegue público. Es una demostración académica local con datos ficticios.

El workflow `.github/workflows/ci.yml` está preparado para cada push y PR. **Su ejecución en GitHub aún no se ha comprobado:** no hay remoto configurado. La revisión de Claude y su evaluación están en [RESULTADO-REVISION-CLAUDE.md](outputs/RESULTADO-REVISION-CLAUDE.md). La bitácora final de cinco prompts, la reflexión personal y el enlace de entrega se cerrarán con la participación del estudiante.
