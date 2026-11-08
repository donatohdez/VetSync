import { it, expect, beforeEach } from 'vitest';
import { SendReminders } from '../../src/modules/notifications/application/send-reminders.js';
import type { Reminder, ReminderCandidate, ReminderRepository } from '../../src/modules/notifications/domain/reminder.js';
const now = new Date('2026-11-08T15:00:00Z');
class MemoryReminders implements ReminderRepository {
 candidates: ReminderCandidate[] = [];
 reminders: Reminder[] = [];
 async findUpcoming(after: Date, through: Date): Promise<ReminderCandidate[]> { return this.candidates.filter(c=>c.startsAt>after && c.startsAt<=through); }
 async recordOnce(r: Reminder): Promise<boolean> { if(this.reminders.some(x=>x.appointmentId===r.appointmentId)) return false; this.reminders.push(r); return true; }
 async list(): Promise<Reminder[]> { return this.reminders; }
}
let repo: MemoryReminders;
beforeEach(()=>{repo = new MemoryReminders();});
it('incluye el límite de 24 horas y excluye citas pasadas, actuales y posteriores', async ()=>{
 repo.candidates = [-1,0,1,24,25].map((h,i)=>({appointmentId:String(i),recipient:'dueno@example.test',petName:'Luna',startsAt:new Date(now.getTime()+h*3600000)}));
 expect(await new SendReminders(repo,{now:()=>now}).execute()).toEqual({sent:2});
 expect(repo.reminders.map(r=>r.appointmentId)).toEqual(['2','3']);
 expect(repo.reminders[0]?.message).toContain('Luna');
 expect(repo.reminders[0]?.simulatedAt).toEqual(now);
});
it('dos ejecuciones no duplican un correo simulado', async ()=>{
 repo.candidates = [{appointmentId:'a',recipient:'dueno@example.test',petName:'Luna',startsAt:new Date(now.getTime()+3600000)}];
 const service = new SendReminders(repo,{now:()=>now});
 expect(await service.execute()).toEqual({sent:1});
 expect(await service.execute()).toEqual({sent:0});
 expect(await repo.list()).toHaveLength(1);
});
it('sin citas no genera recordatorios',async()=>{expect(await new SendReminders(repo,{now:()=>now}).execute()).toEqual({sent:0});});
it('permite configurar la ventana',async()=>{
 repo.candidates = [{appointmentId:'a',recipient:'x@example.test',petName:'Luna',startsAt:new Date(now.getTime()+3*3600000)}];
 expect(await new SendReminders(repo,{now:()=>now},2).execute()).toEqual({sent:0});
});
