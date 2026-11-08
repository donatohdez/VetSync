import { it,expect } from 'vitest';
import { environmentSchema } from '../../src/shared/environment.js';
it.each(['Foo/Bar',''])('rechaza zona horaria inválida %j al configurar el servidor',CLINIC_TIMEZONE=>{
 const result=environmentSchema.safeParse({DB_PASSWORD:'test-only',CLINIC_TIMEZONE});
 expect(result.success).toBe(false);
 if(!result.success)expect(result.error.issues.some(issue=>issue.path[0]==='CLINIC_TIMEZONE')).toBe(true);
});
it.each(['America/Hermosillo','UTC','Europe/Madrid'])('acepta zona horaria soportada %s',CLINIC_TIMEZONE=>{
 expect(environmentSchema.parse({DB_PASSWORD:'test-only',CLINIC_TIMEZONE}).CLINIC_TIMEZONE).toBe(CLINIC_TIMEZONE);
});
it('usa la zona de la clínica por defecto',()=>{
 expect(environmentSchema.parse({DB_PASSWORD:'test-only'}).CLINIC_TIMEZONE).toBe('America/Hermosillo');
});
