import { config } from "./shared/config.js";
import { database } from "./shared/database.js";
import { systemClock } from "./shared/clock.js";
import { buildApplication } from "./composition.js";
const pool = database({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
});
await pool.query("SELECT 1");
const app = buildApplication(pool, systemClock, {
  timeZone: config.CLINIC_TIMEZONE,
  reminderHours: config.REMINDER_HOURS,
});
const server = app.listen(config.PORT, config.HOST, () =>
  console.log(`VetSync: http://${config.HOST}:${config.PORT}`),
);
const shutdown = () => {
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
