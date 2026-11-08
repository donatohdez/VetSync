import type { AppointmentRepository, Appointment, ScheduleInput } from '../domain/appointment.js';
import type { Clock } from '../../../shared/clock.js';
export class ScheduleAppointment {
  constructor(private readonly repository: AppointmentRepository, private readonly clock: Clock) {}
  async execute(_input: ScheduleInput): Promise<Appointment> { throw new Error('Pendiente implementar agenda'); }
}
