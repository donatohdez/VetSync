import { test, expect, type Page } from "@playwright/test";
const owners = [
  {
    id: "owner-ana",
    name: "Ana Martínez",
    email: "ana@example.test",
    phone: null,
  },
  {
    id: "owner-diego",
    name: "Diego López",
    email: "diego@example.test",
    phone: null,
  },
];
const pets = [
  {
    id: "pet-luna",
    ownerId: "owner-ana",
    name: "Luna",
    species: "Perro",
    breed: "Golden retriever",
    birthDate: "2024-04-05",
  },
  {
    id: "pet-milo",
    ownerId: "owner-diego",
    name: "Milo",
    species: "Gato",
    breed: "Doméstico",
    birthDate: null,
  },
];
const vets = [
  { id: "vet-elena", name: "Dra. Elena Ruiz" },
  { id: "vet-mateo", name: "Dr. Mateo Vega" },
];
const appointment = {
  id: "appointment-1",
  petId: "pet-luna",
  veterinarianId: "vet-elena",
  startsAt: new Date(Date.now() + 2 * 3600000).toISOString(),
  endsAt: new Date(Date.now() + 2.5 * 3600000).toISOString(),
  reason: "Consulta de seguimiento preventivo",
};
async function fixture(page: Page) {
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/appointments/availability") {
      const day =
        new URL(route.request().url()).searchParams.get("date") ??
        new Date().toISOString().slice(0, 10);
      const slots = Array.from({ length: 16 }, (_, index) => {
        const minute = 600 + index * 30,
          time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`,
          start = new Date(`${day}T${time}:00-07:00`);
        return {
          time,
          startsAt: start.toISOString(),
          endsAt: new Date(start.getTime() + 1800000).toISOString(),
          available: start.getTime() > Date.now(),
          reason: start.getTime() > Date.now() ? null : "past",
        };
      });
      await route.fulfill({ json: slots });
      return;
    }
    const data: Record<string, unknown> = {
      "/api/owners": owners,
      "/api/pets": pets,
      "/api/veterinarians": vets,
      "/api/appointments": [appointment],
      "/api/notifications": [],
      "/api/config": { timeZone: "America/Hermosillo", reminderHours: 24 },
      "/api/pets/pet-luna/medical-records": [
        {
          id: "record-1",
          petId: "pet-luna",
          veterinarianId: "vet-elena",
          recordedAt: "2026-11-01T17:00:00Z",
          clinicalNote: "Seguimiento de Luna.",
        },
      ],
      "/api/pets/pet-milo/medical-records": [],
    };
    if (route.request().method() === "GET" && pathname in data) {
      await route.fulfill({ json: data[pathname] });
      return;
    }
    await route.continue();
  });
  await page.goto("/");
  await expect(page.locator("#stat-pets")).toHaveText("2");
}
async function selectPatient(page: Page, name: string) {
  await page
    .getByRole("combobox", { name: "Selecciona un paciente", exact: true })
    .click();
  await page
    .locator(".select-popup:not([hidden])")
    .getByRole("searchbox")
    .fill(name);
  await page.getByRole("option", { name: new RegExp(name) }).click();
}
test("selector de historial con búsqueda, contexto del paciente y notas", async ({
  page,
}) => {
  await fixture(page);
  await page
    .getByRole("button", { name: "Historial médico", exact: true })
    .click();
  const combo = page.getByRole("combobox", {
    name: "Selecciona un paciente",
    exact: true,
  });
  await combo.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page
    .locator(".select-popup:not([hidden])")
    .getByRole("searchbox")
    .fill("no-existe");
  await expect(page.locator(".select-popup:not([hidden])")).toContainText(
    "Sin coincidencias",
  );
  await page
    .locator(".select-popup:not([hidden])")
    .getByRole("searchbox")
    .fill("Diego");
  await page.getByRole("option", { name: /Milo/ }).click();
  await expect(page.locator("#history-patient")).toContainText("Milo");
  await expect(page.locator("#history-patient")).toContainText("Diego López");
  await expect(page.locator("#history-list")).toContainText(
    "Sin notas clínicas",
  );
  await selectPatient(page, "Luna");
  await expect(page.locator("#history-list")).toContainText(
    "Seguimiento de Luna.",
  );
});
test("Escape cierra el selector antes del modal y permite selección por teclado", async ({
  page,
}) => {
  await fixture(page);
  await page.getByRole("button", { name: "Agendar cita" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAttribute("aria-labelledby", "dialog-title");
  const combo = dialog.getByRole("combobox", { name: "Mascota", exact: true });
  await combo.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(combo).toContainText("Milo");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
test("guardado con estado de carga, conflicto legible y aviso descartable", async ({
  page,
}) => {
  await fixture(page);
  await page.route("**/api/appointments", async (route) => {
    if (route.request().method() === "POST") {
      await new Promise((resolve) => setTimeout(resolve, 350));
      await route.fulfill({
        status: 409,
        json: {
          error: {
            code: "APPOINTMENT_CONFLICT",
            message: "El veterinario ya tiene una cita en ese intervalo.",
          },
        },
      });
      return;
    }
    await route.fallback();
  });
  await page.getByRole("button", { name: "Agendar cita" }).click();
  for (const [label, name] of [
    ["Mascota", "Luna"],
    ["Veterinario", "Dra. Elena Ruiz"],
  ]) {
    await page
      .getByRole("dialog")
      .getByRole("combobox", { name: label, exact: true })
      .click();
    await page
      .locator(".select-popup:not([hidden])")
      .getByRole("searchbox")
      .fill(name!);
    await page.getByRole("option").filter({ hasText: name! }).first().click();
  }
  await page.locator(".slot-button:not([disabled])").first().click();
  await page.getByLabel("Motivo").fill("Consulta de seguimiento");
  await page.getByRole("button", { name: "Guardar cita", exact: true }).click();
  await expect(page.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  await expect(page.locator("#form-error")).toContainText("ya tiene una cita");
  await expect(page.getByLabel("Motivo")).toHaveValue(
    "Consulta de seguimiento",
  );
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.route("**/api/notifications/run", (route) =>
    route.fulfill({ json: { sent: 3 } }),
  );
  await page
    .getByRole("button", { name: "Recordatorios", exact: true })
    .click();
  await page.getByRole("button", { name: "Simular recordatorios" }).click();
  await expect(page.locator("#notice")).toContainText(
    "3 recordatorios simulados",
  );
  await page.getByRole("button", { name: "Cerrar aviso" }).click();
  await expect(page.locator("#notice")).not.toBeVisible();
});
test("una respuesta antigua no reemplaza el historial recién seleccionado", async ({
  page,
}) => {
  await fixture(page);
  let first = true;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/pets/pet-luna/medical-records", async (route) => {
    const old = first;
    first = false;
    if (old) await gate;
    await route.fulfill({
      json: [
        {
          id: old ? "old" : "new",
          petId: "pet-luna",
          veterinarianId: "vet-elena",
          recordedAt: "2026-11-01T17:00:00Z",
          clinicalNote: old
            ? "Nota antigua recibida tarde"
            : "Nota actual de Luna",
        },
      ],
    });
  });
  await page
    .getByRole("button", { name: "Historial médico", exact: true })
    .click();
  await expect(page.locator("#history-list")).toContainText("Cargando");
  await selectPatient(page, "Milo");
  await selectPatient(page, "Luna");
  await expect(page.locator("#history-list")).toContainText(
    "Nota actual de Luna",
  );
  const oldResponse = page.waitForResponse((response) =>
    response.url().endsWith("/pets/pet-luna/medical-records"),
  );
  release();
  await oldResponse;
  await expect(page.locator("#history-list")).not.toContainText(
    "Nota antigua recibida tarde",
  );
});
test("móvil: navegación completa, agenda legible y selector sin desbordamiento", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await expect(page.locator("#appointments-body")).toContainText(
    "Consulta de seguimiento preventivo",
  );
  expect(
    await page
      .locator("#appointments-body")
      .evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Historial médico", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Selecciona un paciente", exact: true })
    .click();
  const popup = page.locator(".select-popup:not([hidden])");
  await expect(popup).toBeVisible();
  const box = await popup.boundingBox();
  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() =>
    window.addEventListener(
      "resize",
      () => {
        document.documentElement.dataset.resized = "true";
      },
      { once: true },
    ),
  );
  await page.setViewportSize({ width: 430, height: 900 });
  await page.waitForFunction(
    () => document.documentElement.dataset.resized === "true",
  );
  await expect(popup).toBeVisible();
});
