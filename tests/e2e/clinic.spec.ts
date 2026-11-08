import { test, expect } from "@playwright/test";
test("recorre registros, agenda, conflicto, historial y correo simulado", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#stat-vets")).not.toHaveText("—");
  await page.screenshot({
    path: "docs/evidencias/capturas/agenda-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Pacientes", exact: true }).click();
  await page.getByRole("button", { name: "Registrar dueño" }).click();
  const ownerForm = page.locator("#owner-form");
  const unique = String(Date.now());
  await ownerForm.getByLabel("Nombre completo").fill(`Dueña E2E ${unique}`);
  await ownerForm
    .getByLabel("Correo electrónico")
    .fill(`e2e-${unique}@example.test`);
  await ownerForm.getByRole("button", { name: "Registrar dueño" }).click();
  await expect(page.locator("#form-dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Registrar mascota" }).click();
  const petForm = page.locator("#pet-form");
  await petForm
    .getByLabel("Dueño")
    .selectOption({ label: `Dueña E2E ${unique}` });
  const petName = `Nube ${unique}`;
  await petForm.getByLabel("Nombre", { exact: true }).fill(petName);
  await petForm.getByLabel("Especie").selectOption("Gato");
  await petForm.getByRole("button", { name: "Registrar mascota" }).click();
  await expect(page.locator("#form-dialog")).not.toBeVisible();
  await expect(page.locator("#patients-grid")).toContainText(petName);
  await page.getByRole("button", { name: "Agendar cita" }).click();
  const appointment = page.locator("#appointment-form");
  await appointment.getByLabel("Mascota").selectOption({ label: petName });
  const vetOption = await appointment
    .locator("[name=veterinarianId] option")
    .first()
    .getAttribute("value");
  const future = new Date(Date.now() + 7 * 3600000);
  future.setSeconds(0, 0);
  const toLocal = (date: Date) =>
    new Date(date.getTime() - 7 * 3600000).toISOString().slice(0, 16);
  const startsAt = toLocal(future),
    endsAt = toLocal(new Date(future.getTime() + 1800000));
  await appointment.getByLabel("Inicio", { exact: true }).fill(startsAt);
  await appointment.getByLabel("Fin", { exact: true }).fill(endsAt);
  await appointment
    .getByLabel("Motivo")
    .fill("Consulta de prueba de navegador");
  await appointment.getByRole("button", { name: "Guardar cita" }).click();
  await expect(page.locator("#form-dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.locator("#appointments-body")).toContainText(petName);
  await page.getByRole("button", { name: "Agendar cita" }).click();
  await appointment.getByLabel("Mascota").selectOption({ label: petName });
  await appointment.getByLabel("Veterinario").selectOption(vetOption ?? "");
  await appointment.getByLabel("Inicio", { exact: true }).fill(startsAt);
  await appointment.getByLabel("Fin", { exact: true }).fill(endsAt);
  await appointment.getByLabel("Motivo").fill("Conflicto deliberado de prueba");
  await appointment.getByRole("button", { name: "Guardar cita" }).click();
  await expect(page.locator("#form-error")).toContainText("ya tiene una cita");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Historial médico", exact: true })
    .click();
  await page.locator("#history-pet").selectOption({ label: petName });
  await page.getByRole("button", { name: "Agregar nota" }).click();
  const record = page.locator("#record-form");
  await record
    .getByLabel("Nota clínica")
    .fill(
      "Paciente estable. Seguimiento de demostración. <img src=x onerror=alert(1)>",
    );
  await record.getByRole("button", { name: "Guardar nota clínica" }).click();
  await expect(page.locator("#form-dialog")).not.toBeVisible();
  await expect(page.locator("#history-list")).toContainText("Paciente estable");
  await expect(page.locator("#history-list img")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Recordatorios", exact: true })
    .click();
  await page.getByRole("button", { name: "Simular recordatorios" }).click();
  await expect(page.locator("#notifications-list")).toContainText(petName);
  await page.screenshot({
    path: "docs/evidencias/capturas/recordatorios-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("navegación móvil sin desbordamiento horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("#stat-pets")).not.toHaveText("—");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "docs/evidencias/capturas/agenda-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Pacientes", exact: true }).click();
  await expect(page.locator("#patients-grid")).toBeVisible();
  await page
    .getByRole("button", { name: "Historial médico", exact: true })
    .click();
  await expect(page.locator("#history-pet")).toBeVisible();
});
