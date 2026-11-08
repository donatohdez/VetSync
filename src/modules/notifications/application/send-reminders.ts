import type { Clock } from '../../../shared/clock.js';
import type { ReminderRepository } from '../domain/reminder.js';
export class SendReminders {
  constructor(private readonly repository: ReminderRepository, private readonly clock: Clock, private readonly hours: number = 24) {}
  async execute(): Promise<{sent: number}> { throw new Error('Pendiente implementar recordatorios'); }
}
