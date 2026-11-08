# API de VetSync

Base local: `http://127.0.0.1:3010/api`. [Contrato OpenAPI](openapi.json).

Todas las escrituras requieren `Content-Type: application/json`, incluso la ejecución de recordatorios (enviar `{}` o una solicitud sin cuerpo; cualquier otro cuerpo da 400). Los campos no declarados en los cuerpos de registro son rechazados. No hay autenticación: alcance exclusivo de demostración local.

| Método | Ruta relativa | Cuerpo / resultado |
| --- | --- | --- |
| GET | `/health` | Estado de conexión con BD |
| GET | `/config` | `timeZone`, `reminderHours` y `bookingHours` (`opensAt` "10:00", `closesAt` "18:00", `slotMinutes` 30), tomado de la misma fuente que usan la validación y la disponibilidad |
| GET | `/owners` | Lista de dueños |
| POST | `/owners` | `name`, `email`, `phone` opcional/null |
| GET | `/pets` | Lista de mascotas |
| POST | `/pets` | `ownerId`, `name`, `species`, `breed` y `birthDate` opcionales/null |
| GET | `/veterinarians` | Veterinarios activos |
| GET | `/pets/{petId}/medical-records` | Historial de mascota, más reciente primero. El `petId` de la ruta se normaliza (se recortan espacios): `%20pet-luna%20` resuelve a `pet-luna` |
| POST | `/pets/{petId}/medical-records` | `veterinarianId`, `recordedAt`, `clinicalNote` |
| GET | `/appointments` | Todas las citas ordenadas por inicio |
| GET | `/appointments/availability?date=YYYY-MM-DD&veterinarianId=ID` | 16 bloques con `time`, `startsAt`, `endsAt`, `available` y `reason` (`past`, `occupied` o null). `date` admite fechas ISO válidas de 0001-01-01 a 9999-12-31; una fecha inexistente da 400 |
| POST | `/appointments` | `petId`, `veterinarianId`, `startsAt`, `endsAt`, `reason` |
| GET | `/notifications` | Correos simulados, más reciente primero |
| POST | `/notifications/run` | Solo `{}` o sin cuerpo → `{"sent": númeroDeAvisosNuevos}`; `[]` o `{"x":1}` dan 400 `VALIDATION_ERROR` |

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
- Inicio de cita estrictamente futuro, segundos y milisegundos en cero, y duración exacta de 30 minutos.
- En la zona de la clínica: inicio alineado a bloques de `slotMinutes` (30) desde `opensAt` (10:00) hasta el último bloque que termine en `closesAt` (18:00), es decir, 17:30; el fin cae el mismo día. Estos valores salen de una sola fuente (`clinicHours`), la misma que publica `/config` y usa la disponibilidad. Un incumplimiento produce 400.
- La UI solicita una fecha y un turno. Conserva `startsAt` y `endsAt` en el contrato HTTP y calcula automáticamente el fin.
- La disponibilidad es informativa: una reserva concurrente puede ocupar el bloque entre consultar y guardar; el POST vuelve a comprobarlo dentro de la transacción y devuelve 409 si corresponde.
- Dos citas contiguas son válidas. Mismo veterinario e intervalos solapados producen 409, incluso con solicitudes simultáneas.
- El historial solo permite instantes actuales/pasados y se consulta por mascota existente.
- Nacimiento usa `YYYY-MM-DD`, sin hora. No puede ser posterior al día de calendario actual en la zona de la clínica (`timeZone` de `/config`) ni anterior a 1000-01-01 (cota técnica de la columna DATE de MySQL); ambos casos dan 400 `VALIDATION_ERROR`. Con la zona por defecto (America/Hermosillo, UTC-7), después de las 17:00 locales el día UTC ya es el siguiente; por eso ya no se compara contra el día UTC.
- En disponibilidad, `date` acepta de 0001-01-01 a 9999-12-31 y devuelve los bloques de ese año con la misma regla horaria; una fecha fuera del rango de DATETIME de MySQL no puede reservarse.
- Campos de instantes en las respuestas: UTC. La UI aplica la zona configurada para mostrarlos. El texto de `message` de los avisos usa la hora de la clínica e identifica `CLINIC_TIMEZONE`.

## Errores

```json
{"error":{"code":"APPOINTMENT_CONFLICT","message":"El veterinario ya tiene una cita en ese intervalo."}}
```

| HTTP | Código | Motivo |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Campos, fechas o reglas inválidas |
| 400 | `INVALID_JSON` | JSON malformado, o un valor que no es objeto ni arreglo (p. ej. `null`) |
| 400 | `INVALID_PARAMETER` | Parámetro de ruta mal codificado (p. ej. `%E0%A4%A` en `petId`) |
| 400 | `INVALID_BODY_ENCODING` | El cuerpo no coincide con el `Content-Encoding` declarado |
| 400 | `REQUEST_ABORTED` | El cliente interrumpió la solicitud antes de terminar |
| 400 | `INVALID_REQUEST_SIZE` | El `Content-Length` declarado no coincide con el cuerpo recibido |
| 403 | `BODY_VERIFICATION_FAILED` | Traducción defensiva de un fallo de verificación del cuerpo; la configuración actual no activa esa verificación, así que no se espera en uso normal |
| 404 | `NOT_FOUND` | Referencia inexistente, veterinario inactivo o ruta de API desconocida |
| 409 | `APPOINTMENT_CONFLICT` | Horario ocupado para ese veterinario |
| 413 | `PAYLOAD_TOO_LARGE` | Cuerpo mayor de 32 KB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Escritura sin `Content-Type: application/json` |
| 415 | `UNSUPPORTED_CHARSET` | `charset` distinto de UTF-8 |
| 415 | `UNSUPPORTED_CONTENT_ENCODING` | `Content-Encoding` no compatible |
| 500 | `INTERNAL_ERROR` | Fallo inesperado; el cliente no recibe detalles internos |

Los códigos de cuerpo (`INVALID_JSON`, `PAYLOAD_TOO_LARGE`, 415, 403 y los 400 de codificación) solo aplican a escrituras; los GET no pueden devolver 409, 413 ni 415. El 409 solo ocurre en `POST /appointments`. Los fallos de zlib/brotli se traducen a `INVALID_BODY_ENCODING`; cualquier otro error no reconocido sigue siendo 500 sin detalles.

Los mensajes de validación de campos (`VALIDATION_ERROR`) provienen de Zod y pueden venir en inglés; la interfaz web los traduce al español antes de mostrarlos.

La página de 404 fuera de `/api` es texto. No hay endpoints de eliminación, cancelación o reprogramación en este alcance.
