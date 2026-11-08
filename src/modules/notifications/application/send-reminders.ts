import { randomUUID } from "node:crypto";
import type { Clock } from "../../../shared/clock.js";
import type { ReminderRepository } from "../domain/reminder.js";
export class SendReminders {
  constructor(
    private readonly repository: ReminderRepository,
    private readonly clock: Clock,
    private readonly hours: number = 24,
    private readonly timeZone: string = "America/Hermosillo",
  ) {}
  async execute(): Promise<{ sent: number }> {
    const now = this.clock.now();
    const through = new Date(now.getTime() + this.hours * 3600000);
    const candidates = await this.repository.findUpcoming(now, through);
    const formatter = new Intl.DateTimeFormat("es-MX", {
      timeZone: this.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    let sent = 0;
    for (const c of candidates) {
      const recorded = await this.repository.recordOnce({
        id: randomUUID(),
        appointmentId: c.appointmentId,
        type: "upcoming",
        recipient: c.recipient,
        simulatedAt: now,
        message: `Recordatorio: ${c.petName} tiene una cita el ${formatter.format(c.startsAt)} (${this.timeZone}). Correo simulado; no se envió un correo real.`,
      });
      if (recorded) sent++;
    }
    return { sent };
  }
}
