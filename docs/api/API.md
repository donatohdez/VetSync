# API de VetSync

Base local: `http://127.0.0.1:3010/api`. [Contrato OpenAPI](openapi.json).

Todas las escrituras requieren `Content-Type: application/json`, incluso la ejecución de recordatorios (enviar `{}`). Los campos no declarados en los cuerpos de registro son rechazados. No hay autenticación: alcance exclusivo de demostración local.

| Método | Ruta relativa | Cuerpo / resultado |
| --- | --- | --- |
| GET | `/health` | Estado de conexión con BD |
| GET | `/config` | Zona de clínica y horas de ventana de avisos |
| GET | `/owners` | Lista de dueños |
| POST | `/owners` | `name`, `email`, `phone` opcional/null |
| GET | `/pets` | Lista de mascotas |
| POST | `/pets` | `ownerId`, `name`, `species`, `breed` y `birthDate` opcionales/null |
| GET | `/veterinarians` | Veterinarios activos |
| GET | `/pets/{petId}/medical-records` | Historial de mascota, más reciente primero |
| POST | `/pets/{petId}/medical-records` | `veterinarianId`, `recordedAt`, `clinicalNote` |
| GET | `/appointments` | Todas las citas ordenadas por inicio |
| POST | `/appointments` | `petId`, `veterinarianId`, `startsAt`, `endsAt`, `reason` |
| GET | `/notifications` | Correos simulados, más reciente primero |
| POST | `/notifications/run` | `{}` → `{"sent": númeroDeAvisosNuevos}` |

Los registros devuelven 201 y el objeto creado con su `id`. Las consultas y la simulación devuelven 200. Los IDs son cadenas de 1 a 36 caracteres; los registros nuevos usan UUID y los datos semilla usan identificadores legibles. Las listas no tienen paginación en esta versión.

## Ejemplos

Registrar un dueño:

```bash
curl -sS http://127.0.0.1:3010/api/owners \
  -H 'Content-Type: application/json' \
  -d '{"name":"Dueña de ejemplo","email":"demo@example.test"}'
```

Agendar con datos semilla (cambiar la fecha si ya pasó):

```json
{
  "petId": "pet-luna",
  "veterinarianId": "vet-elena",
  "startsAt": "2030-01-15T10:00:00-07:00",
  "endsAt": "2030-01-15T10:30:00-07:00",
  "reason": "Consulta general"
}
```

Simular avisos:

```bash
curl -sS http://127.0.0.1:3010/api/notifications/run \
  -H 'Content-Type: application/json' -d '{}'
```

La ventana es `ahora < startsAt <= ahora + REMINDER_HOURS`. Por defecto, 24 horas. Una cita en 2030 no generará recordatorio hasta estar dentro de esa ventana; para la demo, crear una cita de las próximas horas. No se envía correo real.

## Reglas de fechas

- Citas e historial requieren ISO 8601 con `Z` o desplazamiento como `-07:00`. No se aceptan fechas locales sin zona ni días de calendario inexistentes.
- Inicio de cita estrictamente futuro y fin posterior a inicio.
- Dos citas contiguas son válidas. Mismo veterinario e intervalos solapados producen 409, incluso con solicitudes simultáneas.
- El historial solo permite instantes actuales/pasados y se consulta por mascota existente.
- Nacimiento usa `YYYY-MM-DD`, sin hora; no puede superar el día UTC actual.
- Campos de instantes en las respuestas: UTC. La UI aplica la zona configurada para mostrarlos. El texto de `message` de los avisos usa la hora de la clínica e identifica `CLINIC_TIMEZONE`.

## Errores

```json
{"error":{"code":"APPOINTMENT_CONFLICT","message":"El veterinario ya tiene una cita en ese intervalo."}}
```

| HTTP | Código | Motivo |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Campos, fechas o reglas inválidas |
| 400 | `INVALID_JSON` | JSON malformado |
| 404 | `NOT_FOUND` | Referencia inexistente, veterinario inactivo o ruta de API desconocida |
| 409 | `APPOINTMENT_CONFLICT` | Horario ocupado para ese veterinario |
| 413 | `PAYLOAD_TOO_LARGE` | Cuerpo mayor de 32 KB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Escritura sin JSON |
| 500 | `INTERNAL_ERROR` | Fallo inesperado; el cliente no recibe detalles internos |

La página de 404 fuera de `/api` es texto. No hay endpoints de eliminación, cancelación o reprogramación en este alcance.
