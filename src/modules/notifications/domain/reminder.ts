export interface Reminder {
  id: string; appointmentId: string; type: 'upcoming'; recipient: string; simulatedAt: Date; message: string;
}
export interface ReminderCandidate { appointmentId: string; recipient: string; petName: string; startsAt: Date }
export interface ReminderRepository {
  findUpcoming(after: Date, through: Date): Promise<ReminderCandidate[]>;
  recordOnce(reminder: Reminder): Promise<boolean>;
  list(): Promise<Reminder[]>;
}
