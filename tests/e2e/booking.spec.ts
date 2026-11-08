import {test,expect,type Page,type Locator} from '@playwright/test';
async function choose(page:Page,scope:Page|Locator,label:string,text:string){
 await scope.getByRole('combobox',{name:label,exact:true}).click();await page.locator('.select-popup:not([hidden])').getByRole('searchbox').fill(text);await page.getByRole('option').filter({hasText:text}).first().click();
}
test('recepción registra dueño y mascota desde la cita y reserva un bloque de media hora',async({page})=>{
 await page.goto('/');await expect(page.locator('#stat-vets')).not.toHaveText('—');
 await page.getByRole('button',{name:'Agendar cita'}).click();const appointment=page.locator('#appointment-form');
 await expect(appointment.getByLabel('Inicio',{exact:true})).toHaveCount(0);await expect(appointment.getByLabel('Fin',{exact:true})).toHaveCount(0);
 await appointment.getByLabel('Motivo').fill('Primera consulta registrada por recepción');
 await appointment.getByRole('button',{name:'Registrar mascota',exact:true}).click();
 const unique=String(Date.now()),petName=`Kiwi ${unique}`,ownerName=`Responsable ${unique}`;
 const pet=page.locator('#pet-form');await pet.getByLabel('Nombre',{exact:true}).fill(petName);
 await pet.getByRole('button',{name:'Registrar dueño',exact:true}).click();
 const owner=page.locator('#owner-form');await owner.getByLabel('Nombre completo').fill(ownerName);await owner.getByLabel('Correo electrónico').fill(`recepcion-${unique}@example.test`);await owner.getByRole('button',{name:'Registrar dueño',exact:true}).click();
 await expect(pet).toBeVisible();await expect(pet.getByLabel('Nombre',{exact:true})).toHaveValue(petName);await expect(pet.getByRole('combobox',{name:'Dueño',exact:true})).toContainText(ownerName);
 await choose(page,pet,'Especie','Gato');await pet.getByRole('button',{name:'Registrar mascota',exact:true}).click();
 await expect(appointment).toBeVisible();await expect(appointment.getByRole('combobox',{name:'Mascota',exact:true})).toContainText(petName);await expect(appointment.getByLabel('Motivo')).toHaveValue('Primera consulta registrada por recepción');
 const vetName=await appointment.locator('[name=veterinarianId] option:not([disabled])').first().textContent();await choose(page,appointment,'Veterinario',vetName??'');
 const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Hermosillo',year:'numeric',month:'2-digit',day:'2-digit'}).format(tomorrow);
 await appointment.getByLabel('Fecha de la cita').fill(day);
 await expect(appointment.getByRole('radio')).toHaveCount(16);
 const available=appointment.locator('.slot-button:not([disabled])').first();await expect(available).toBeEnabled();const time=await available.getAttribute('data-time');await available.click();
 const posted=page.waitForRequest(request=>request.method()==='POST'&&new URL(request.url()).pathname==='/api/appointments');
 await appointment.getByRole('button',{name:'Guardar cita',exact:true}).click();const body=(await posted).postDataJSON() as {startsAt:string;endsAt:string};
 expect(new Date(body.endsAt).getTime()-new Date(body.startsAt).getTime()).toBe(1800000);
 await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.locator('#appointments-body')).toContainText(petName);
 await page.getByRole('button',{name:'Agendar cita'}).click();await choose(page,appointment,'Mascota',petName);await choose(page,appointment,'Veterinario',vetName??'');await appointment.getByLabel('Fecha de la cita').fill(day);
 await expect(appointment.locator(`.slot-button[data-time="${time}"]`)).toBeDisabled();await expect(appointment.locator('.slot-button[data-time="17:30"]')).toBeVisible();await expect(appointment.locator('.slot-button[data-time="18:00"]')).toHaveCount(0);
});
for(const width of [1440,390])test(`iconos centrados y flechas con margen en ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/');await expect(page.locator('#stat-vets')).not.toHaveText('—');await page.getByRole('button',{name:'Agendar cita'}).click();
 const close=await page.locator('#close-dialog').boundingBox(),x=await page.locator('#close-dialog svg').boundingBox();expect(close&&x).toBeTruthy();
 expect(Math.abs((close!.x+close!.width/2)-(x!.x+x!.width/2))).toBeLessThanOrEqual(1);expect(Math.abs((close!.y+close!.height/2)-(x!.y+x!.height/2))).toBeLessThanOrEqual(1);
 const control=page.locator('#appointment-form .select-trigger').first(),rect=await control.boundingBox(),arrow=await control.locator('svg').boundingBox();
 expect(rect!.x+rect!.width-(arrow!.x+arrow!.width)).toBeGreaterThanOrEqual(16);
});
