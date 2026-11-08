import type { ListAvailability } from "../modules/appointments/application/list-availability.js";
import { clinicHours } from "../modules/appointments/domain/clinic-hours.js";
import express, { type Express, type ErrorRequestHandler } from "express";
import helmet from "helmet";
import path from "node:path";
import type { Owners } from "../modules/owners/application/owners.js";
import type { Pets } from "../modules/pets/application/pets.js";
import type { MedicalRecords } from "../modules/medical-records/application/medical-records.js";
import type { ScheduleAppointment } from "../modules/appointments/application/schedule-appointment.js";
import type { SendReminders } from "../modules/notifications/application/send-reminders.js";
import type { AppointmentRepository } from "../modules/appointments/domain/appointment.js";
import type { VeterinarianRepository } from "../modules/veterinarians/domain/veterinarian.js";
import type { ReminderRepository } from "../modules/notifications/domain/reminder.js";
import { AppError } from "../shared/errors.js";
import { parse } from "../shared/validation.js";
import { z } from "zod";
const emptyBody = z.strictObject({}).optional();
export interface Services {
  owners: Owners;
  pets: Pets;
  medicalRecords: MedicalRecords;
  schedule: ScheduleAppointment;
  availability: ListAvailability;
  sendReminders: SendReminders;
  appointments: AppointmentRepository;
  veterinarians: VeterinarianRepository;
  reminders: ReminderRepository;
  health: () => Promise<void>;
}
interface TranslatedError {
  status: number;
  code: string;
  message: string;
}
// Errores conocidos de body-parser/raw-body (por `type`) y de Express 5
// (parámetro de ruta mal codificado). Solo se traducen casos explícitos: no se
// confía en `status`/`statusCode` de un error arbitrario. Comportamiento
// comprobado con body-parser 2.4.0 y router 2.2.0.
const bodyErrors: Record<string, TranslatedError> = {
  "entity.parse.failed": {
    status: 400,
    code: "INVALID_JSON",
    message: "El JSON no es válido.",
  },
  "entity.too.large": {
    status: 413,
    code: "PAYLOAD_TOO_LARGE",
    message: "La solicitud supera el tamaño permitido.",
  },
  "charset.unsupported": {
    status: 415,
    code: "UNSUPPORTED_CHARSET",
    message: "Usa codificación UTF-8 en el cuerpo de la solicitud.",
  },
  "encoding.unsupported": {
    status: 415,
    code: "UNSUPPORTED_CONTENT_ENCODING",
    message: "La codificación del contenido no es compatible.",
  },
  "request.aborted": {
    status: 400,
    code: "REQUEST_ABORTED",
    message: "La solicitud se interrumpió antes de terminar.",
  },
  "request.size.invalid": {
    status: 400,
    code: "INVALID_REQUEST_SIZE",
    message: "El tamaño declarado no coincide con el cuerpo recibido.",
  },
  "entity.verify.failed": {
    status: 403,
    code: "BODY_VERIFICATION_FAILED",
    message: "No se pudo verificar el cuerpo de la solicitud.",
  },
};
// body-parser envuelve los fallos de zlib/brotli con createError(400, error):
// conservan `code` de zlib y `errno` numérico, pero no `type`.
const isDecompressionError = (error: Error): boolean =>
  "errno" in error &&
  typeof error.errno === "number" &&
  "code" in error &&
  typeof error.code === "string" &&
  "status" in error &&
  error.status === 400 &&
  "expose" in error &&
  error.expose === true;
function translateHttpError(error: unknown): TranslatedError | null {
  if (typeof error !== "object" || error === null) return null;
  if ("type" in error && typeof error.type === "string") {
    const known = bodyErrors[error.type];
    if (known) return known;
  }
  if (
    error instanceof URIError &&
    error.message.startsWith("Failed to decode param")
  )
    return {
      status: 400,
      code: "INVALID_PARAMETER",
      message: "Un parámetro de la ruta no está codificado correctamente.",
    };
  if (error instanceof Error && isDecompressionError(error))
    return {
      status: 400,
      code: "INVALID_BODY_ENCODING",
      message: "El cuerpo no coincide con la codificación indicada.",
    };
  return null;
}
export function createApp(
  services: Services,
  options: { timeZone: string; reminderHours: number },
): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } },
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  // No CORS: la UI y la API pertenecen al mismo origen. Las escrituras exigen JSON.
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "POST" && !req.is("application/json")) {
      res.status(415).json({
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Usa Content-Type: application/json.",
        },
      });
      return;
    }
    next();
  });
  app.get("/api/health", async (_req, res) => {
    await services.health();
    res.json({ status: "ok" });
  });
  app.get("/api/config", (_req, res) => {
    res.json({ ...options, bookingHours: clinicHours });
  });
  app.get("/api/owners", async (_req, res) => {
    res.json(await services.owners.list());
  });
  app.post("/api/owners", async (req, res) => {
    res.status(201).json(await services.owners.create(req.body));
  });
  app.get("/api/pets", async (_req, res) => {
    res.json(await services.pets.list());
  });
  app.post("/api/pets", async (req, res) => {
    res.status(201).json(await services.pets.create(req.body));
  });
  app.get("/api/veterinarians", async (_req, res) => {
    res.json(await services.veterinarians.list());
  });
  app.get("/api/pets/:petId/medical-records", async (req, res) => {
    res.json(await services.medicalRecords.list(req.params.petId));
  });
  app.post("/api/pets/:petId/medical-records", async (req, res) => {
    res
      .status(201)
      .json(await services.medicalRecords.create(req.params.petId, req.body));
  });
  app.get("/api/appointments/availability", async (req, res) => {
    res.json(await services.availability.execute(req.query));
  });
  app.get("/api/appointments", async (_req, res) => {
    res.json(await services.appointments.list());
  });
  app.post("/api/appointments", async (req, res) => {
    res.status(201).json(await services.schedule.execute(req.body));
  });
  app.get("/api/notifications", async (_req, res) => {
    res.json(await services.reminders.list());
  });
  app.post("/api/notifications/run", async (req, res) => {
    // El contrato admite solo `{}` (o ausencia de cuerpo con Content-Type JSON).
    parse(emptyBody, req.body);
    res.json(await services.sendReminders.execute());
  });
  app.use("/api", (_req, res) => {
    res
      .status(404)
      .json({ error: { code: "NOT_FOUND", message: "Ruta no encontrada." } });
  });
  app.use(express.static(path.resolve("dist/web")));
  app.use((_req, res) => {
    res.status(404).send("Página no encontrada.");
  });
  const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    if (error instanceof AppError) {
      res
        .status(error.status)
        .json({ error: { code: error.code, message: error.message } });
      return;
    }
    const known = translateHttpError(error);
    if (known) {
      res.status(known.status).json({
        error: { code: known.code, message: known.message },
      });
      return;
    }
    console.error(
      "Error interno de la aplicación:",
      error instanceof Error ? error.message : "error desconocido",
    );
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "No se pudo completar la operación.",
      },
    });
  };
  app.use(errors);
  return app;
}
