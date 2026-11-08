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
export interface Services {
  owners: Owners;
  pets: Pets;
  medicalRecords: MedicalRecords;
  schedule: ScheduleAppointment;
  sendReminders: SendReminders;
  appointments: AppointmentRepository;
  veterinarians: VeterinarianRepository;
  reminders: ReminderRepository;
  health: () => Promise<void>;
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
    res.json(options);
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
  app.get("/api/appointments", async (_req, res) => {
    res.json(await services.appointments.list());
  });
  app.post("/api/appointments", async (req, res) => {
    res.status(201).json(await services.schedule.execute(req.body));
  });
  app.get("/api/notifications", async (_req, res) => {
    res.json(await services.reminders.list());
  });
  app.post("/api/notifications/run", async (_req, res) => {
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
    if (
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      error.type === "entity.parse.failed"
    ) {
      res.status(400).json({
        error: { code: "INVALID_JSON", message: "El JSON no es válido." },
      });
      return;
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      error.type === "entity.too.large"
    ) {
      res.status(413).json({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "La solicitud supera el tamaño permitido.",
        },
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
