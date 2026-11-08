import { test, expect, type Page, type Locator } from "@playwright/test";
async function choose(
  page: Page,
  scope: Page | Locator,
  name: string,
  label: string,
): Promise<void> {
  await scope.getByRole("combobox", { name, exact: true }).click();
  await page
    .locator(".select-popup:not([hidden])")
    .getByRole("searchbox")
    .fill(label);
  await page.getByRole("option").filter({ hasText: label }).first().click();
}
test("recorre registros, agenda, disponibilidad, historial y correo simulado", async ({
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
  await page
    .getByRole("button", { name: "Registrar dueño", exact: true })
    .click();
  const ownerForm = page.locator("#owner-form"),
    unique = String(Date.now());
  await ownerForm.getByLabel("Nombre completo").fill(`Dueña E2E ${unique}`);
  await ownerForm
    .getByLabel("Correo electrónico")
    .fill(`e2e-${unique}@example.test`);
  await ownerForm
    .getByRole("button", { name: "Registrar dueño", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Registrar mascota", exact: true })
    .click();
  const petForm = page.locator("#pet-form");
  await choose(page, petForm, "Dueño", `Dueña E2E ${unique}`);
  const petName = `Nube ${unique}`;
  await petForm.getByLabel("Nombre", { exact: true }).fill(petName);
  await choose(page, petForm, "Especie", "Gato");
  await petForm
    .getByRole("button", { name: "Registrar mascota", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator("#patients-grid")).toContainText(petName);
  await page.getByRole("button", { name: "Agendar cita" }).click();
  const appointment = page.locator("#appointment-form");
  await choose(page, appointment, "Mascota", petName);
  const vet = await appointment
    .locator("[name=veterinarianId] option:not([disabled])")
    .first()
    .textContent();
  await choose(page, appointment, "Veterinario", vet ?? "");
  // Se reserva hoy, dentro de la ventana de avisos. Si ya cerró, se usa mañana.
  let day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Hermosillo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  await appointment.getByLabel("Fecha de la cita").fill(day);
  await expect(page.locator("#appointment-slots")).not.toHaveAttribute(
    "aria-busy",
    "true",
  );
  if (!(await appointment.locator(".slot-button:not([disabled])").count())) {
    const date = new Date(`${day}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    day = date.toISOString().slice(0, 10);
    await appointment.getByLabel("Fecha de la cita").fill(day);
  }
  const free = appointment.locator(".slot-button:not([disabled])").first();
  await expect(free).toBeEnabled();
  const time = await free.getAttribute("data-time");
  await free.click();
  await appointment
    .getByLabel("Motivo")
    .fill("Consulta de prueba de navegador");
  const posted = page.waitForRequest(
    (r) =>
      r.method() === "POST" &&
      new URL(r.url()).pathname === "/api/appointments",
  );
  await appointment
    .getByRole("button", { name: "Guardar cita", exact: true })
    .click();
  const body = (await posted).postDataJSON() as Record<string, unknown>;
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.locator("#appointments-body")).toContainText(petName);
  await page.getByRole("button", { name: "Agendar cita" }).click();
  await choose(page, appointment, "Mascota", petName);
  await choose(page, appointment, "Veterinario", vet ?? "");
  await appointment.getByLabel("Fecha de la cita").fill(day);
  await expect(
    appointment.locator(`.slot-button[data-time="${time}"]`),
  ).toBeDisabled();
  expect(
    (await page.request.post("/api/appointments", { data: body })).status(),
  ).toBe(409);
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Historial médico", exact: true })
    .click();
  await choose(page, page, "Selecciona un paciente", petName);
  await page.getByRole("button", { name: "Agregar nota", exact: true }).click();
  const record = page.locator("#record-form");
  await record
    .getByLabel("Nota clínica")
    .fill(
      "Paciente estable. Seguimiento de demostración. <img src=x onerror=alert(1)>",
    );
  await record
    .getByRole("button", { name: "Guardar nota clínica", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator("#history-list")).toContainText("Paciente estable");
  await expect(page.locator("#history-list img")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Recordatorios", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simular recordatorios", exact: true })
    .click();
  // El mensaje aparece si la cita elegida está dentro de 24 horas; el backend mantiene su límite probado.
  if (new Date(String(body.startsAt)).getTime() <= Date.now() + 86400000)
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
      () => document.documentElement.scrollWidth <= innerWidth,
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
  await expect(
    page.getByRole("combobox", { name: "Selecciona un paciente", exact: true }),
  ).toBeVisible();
});
