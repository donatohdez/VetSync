import "dotenv/config";
import { z } from "zod";
const schema = z.object({
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().positive().default(33316),
  DB_USER: z.string().default("vetsync"),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().default("vetsync"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3010),
  HOST: z.string().default("127.0.0.1"),
  CLINIC_TIMEZONE: z.string().default("America/Hermosillo"),
  REMINDER_HOURS: z.coerce.number().positive().max(168).default(24),
});
export const config = schema.parse(process.env);
