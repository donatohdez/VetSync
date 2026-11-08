import { randomUUID } from 'node:crypto';
import type { Clock } from '../../../shared/clock.js';
import type { ReminderRepository } from '../domain/reminder.js';
export class SendReminders {
 constructor(private readonly repository: ReminderRepository, private readonly clock: Clock, private readonly hours: number = 24) {}
 async execute(): Promise<{sent:number}> {
  const now = this.clock.now();
  const through = new Date(now.getTime()+this.hours*3600000);
  const candidates = await this.repository.findUpcoming(now,through);
  let sent = 0;
  for (const c of candidates) {
   const recorded = await this.repository.recordOnce({id:randomUUID(),appointmentId:c.appointmentId,type:'upcoming',recipient:c.recipient,simulatedAt:now,message:`Recordatorio: ${c.petName} tiene una cita el ${c.startsAt.toISOString()}. Correo simulado; no se envió un correo real.`});
   if (recorded) sent++;
  }
  return {sent};
 }
}
