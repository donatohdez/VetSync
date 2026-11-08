export interface Appointment {
  id: string;
  petId: string;
  veterinarianId: string;
  startsAt: Date;
  endsAt: Date;
  reason: string;
}
export interface ScheduleInput { petId: string; veterinarianId: string; startsAt: string; endsAt: string; reason: string }
export interface AppointmentRepository {
  reserve(appointment: Appointment): Promise<void>;
  list(): Promise<Appointment[]>;
}
