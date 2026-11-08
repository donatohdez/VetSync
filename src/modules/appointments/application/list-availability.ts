import type { AppointmentRepository } from '../domain/appointment.js';
import type { Clock } from '../../../shared/clock.js';
export interface AppointmentSlot {time:string;startsAt:Date;endsAt:Date;available:boolean;reason:'past'|'occupied'|null}
export class ListAvailability {
 constructor(private readonly repository:AppointmentRepository,private readonly veterinarians:{exists(id:string):Promise<boolean>},private readonly clock:Clock,private readonly timeZone='America/Hermosillo'){}
 async execute(_input:unknown):Promise<AppointmentSlot[]>{throw new Error('Pendiente implementar disponibilidad por horario de clínica');}
}
