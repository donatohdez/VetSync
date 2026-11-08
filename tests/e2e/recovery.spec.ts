import { test, expect, type Page, type Route } from "@playwright/test";
// Estas pruebas usan respuestas HTTP controladas (page.route): no tocan MySQL.
// Comprueban la interfaz ante fallos parciales, conflictos y validaciones.
type Json = Record<string, unknown>;
interface Slot {
  time: string;
  startsAt: string;
  endsAt: string;
  available: boolean;
  reason: "past" | "occupied" | null;
}
interface Mock {
  owners: Json[];
  pets: Json[];
  appointments: Json[];
  vets: Json[];
  failGet: Set<string>;
  posts: Record<string, Json[]>;
  occupied: Set<string>;
  availabilityCalls: number;
  availabilityFail: (call: number) => boolean;
  availabilityAbort: (call: number) => boolean;
  config: Json;
  post: Record<
    string,
    (
      body: Json,
      count: number,
      route: Route,
    ) => Promise<{ status: number; json: unknown } | "abort" | undefined>
  >;
}
const conflict = {
  status: 409,
  json: {
    error: {
      code: "APPOINTMENT_CONFLICT",
      message: "El veterinario ya tiene una cita en ese intervalo.",
    },
  },
};
function tomorrow(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Hermosillo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + 86400000));
}
function buildSlots(day: string, mock: Mock): Slot[] {
  const hours = (mock.config.bookingHours as
    { opensAt: string; closesAt: string; slotMinutes: number } | undefined) ?? {
    opensAt: "10:00",
    closesAt: "18:00",
    slotMinutes: 30,
  };
  const toMinutes = (value: string) =>
    Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  const slots: Slot[] = [];
  for (
    let minute = toMinutes(hours.opensAt);
    minute + hours.slotMinutes <= toMinutes(hours.closesAt);
    minute += hours.slotMinutes
  ) {
    const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    const start = new Date(`${day}T${time}:00-07:00`);
    const occupied = mock.occupied.has(time);
    slots.push({
      time,
      startsAt: start.toISOString(),
      endsAt: new Date(
        start.getTime() + hours.slotMinutes * 60000,
      ).toISOString(),
      available: !occupied && start.getTime() > Date.now(),
      reason: occupied
        ? "occupied"
        : start.getTime() > Date.now()
          ? null
          : "past",
    });
  }
  return slots;
}
async function setup(page: Page, overrides: Partial<Mock> = {}): Promise<Mock> {
  const mock: Mock = {
    owners: [
      {
        id: "owner-ana",
        name: "Ana Martínez",
        email: "ana@example.test",
        phone: null,
      },
    ],
    pets: [
      {
        id: "pet-luna",
        ownerId: "owner-ana",
        name: "Luna",
        species: "Perro",
        breed: null,
        birthDate: null,
      },
    ],
    appointments: [],
    vets: [
      { id: "vet-elena", name: "Dra. Elena Ruiz" },
      { id: "vet-mateo", name: "Dr. Mateo Vega" },
    ],
    failGet: new Set(),
    posts: {},
    occupied: new Set(),
    availabilityCalls: 0,
    availabilityFail: () => false,
    availabilityAbort: () => false,
    config: { timeZone: "America/Hermosillo", reminderHours: 24 },
    post: {},
    ...overrides,
  };
  await page.route("**/api/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      pathname = url.pathname;
    if (request.method() === "POST") {
      const body = (request.postDataJSON() ?? {}) as Json;
      const list = (mock.posts[pathname] ??= []);
      list.push(body);
      const custom = await mock.post[pathname]?.(body, list.length, route);
      if (custom === "abort") {
        await route.abort("failed");
        return;
      }
      if (custom) {
        await route.fulfill({ status: custom.status, json: custom.json });
        return;
      }
      const id = `${pathname.split("/")[2] ?? "x"}-new-${list.length}`;
      if (pathname === "/api/owners") mock.owners.push({ id, ...body });
      if (pathname === "/api/pets") mock.pets.push({ id, ...body });
      if (pathname === "/api/appointments")
        mock.appointments.push({ id, ...body });
      await route.fulfill({ status: 201, json: { id, ...body } });
      return;
    }
    if (mock.failGet.has(pathname)) {
      await route.fulfill({
        status: 500,
        json: { error: { code: "INTERNAL", message: "Actualización fallida" } },
      });
      return;
    }
    if (pathname === "/api/appointments/availability") {
      const call = ++mock.availabilityCalls;
      if (mock.availabilityAbort(call)) {
        await route.abort("failed");
        return;
      }
      if (mock.availabilityFail(call)) {
        await route.fulfill({
          status: 500,
          json: { error: { code: "INTERNAL", message: "Consulta fallida" } },
        });
        return;
      }
      await route.fulfill({
        json: buildSlots(url.searchParams.get("date") ?? tomorrow(), mock),
      });
      return;
    }
    const data: Record<string, unknown> = {
      "/api/owners": mock.owners,
      "/api/pets": mock.pets,
      "/api/veterinarians": mock.vets,
      "/api/appointments": mock.appointments,
      "/api/notifications": [],
      "/api/config": mock.config,
    };
    if (pathname in data) {
      await route.fulfill({ json: data[pathname] });
      return;
    }
    if (/^\/api\/pets\/[^/]+\/medical-records$/.test(pathname)) {
      await route.fulfill({ json: [] });
      return;
    }
    await route.fulfill({ status: 404, json: { error: { message: "x" } } });
  });
  await page.goto("/");
  await expect(page.locator("#stat-pets")).toHaveText(String(mock.pets.length));
  return mock;
}
async function choose(page: Page, name: string, label: string): Promise<void> {
  await page
    .locator("#form-dialog")
    .getByRole("combobox", { name, exact: true })
    .click();
  await page
    .locator(".select-popup:not([hidden])")
    .getByRole("searchbox")
    .fill(label);
  await page.getByRole("option").filter({ hasText: label }).first().click();
}
async function openBooking(page: Page): Promise<void> {
  await page.locator("#new-appointment").click();
  await choose(page, "Mascota", "Luna");
  await choose(page, "Veterinario", "Elena");
  await page.locator("#appointment-date").fill(tomorrow());
  await page.locator("#appointment-reason").fill("Control anual");
  await expect(page.locator(".slot-button")).toHaveCount(16);
}
const slot = (page: Page, time: string) =>
  page.locator(`.slot-button[data-time="${time}"]`);
async function fillOwner(page: Page, name = "Nuevo dueño"): Promise<void> {
  await page.locator("#owner-form").getByLabel("Nombre completo").fill(name);
  await page
    .locator("#owner-form")
    .getByLabel("Correo electrónico")
    .fill("nuevo@example.test");
}
async function openOwnerFromPatients(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Pacientes", exact: true }).click();
  await page.locator("#new-owner").click();
}
// ---------------------------------------------------------------- F-01
test.describe("F-01 guardado confirmado y refresco fallido", () => {
  test("mascota: no se repite el alta y la lista muestra el registro guardado", async ({
    page,
  }) => {
    const mock = await setup(page);
    await page.getByRole("button", { name: "Pacientes", exact: true }).click();
    await page.locator("#new-pet").click();
    await page
      .locator("#pet-form")
      .getByLabel("Nombre", { exact: true })
      .fill("Rocky");
    await choose(page, "Dueño", "Ana");
    mock.failGet.add("/api/pets");
    await page.locator("#pet-form .submit-button").click();
    await expect(page.locator("#form-dialog")).not.toBeVisible();
    await expect(page.locator("#notice")).toContainText("guardada");
    await expect(page.locator("#notice")).toContainText(
      "No se pudo actualizar",
    );
    await expect(page.locator("#patients-grid")).toContainText("Rocky");
    expect(mock.posts["/api/pets"]).toHaveLength(1);
  });
  test("nota clínica: aviso de guardado y un solo POST", async ({ page }) => {
    const mock = await setup(page);
    await page
      .getByRole("button", { name: "Historial médico", exact: true })
      .click();
    await page.locator("#new-record").click();
    await page.locator("#record-note").fill("Revisión sin hallazgos.");
    mock.failGet.add("/api/owners");
    await page.locator("#record-form .submit-button").click();
    await expect(page.locator("#form-dialog")).not.toBeVisible();
    await expect(page.locator("#notice")).toContainText("guardada");
    expect(mock.posts["/api/pets/pet-luna/medical-records"]).toHaveLength(1);
  });
  test("cita: aviso de guardado, diálogo cerrado y la cita visible sin repetir el POST", async ({
    page,
  }) => {
    const mock = await setup(page);
    await openBooking(page);
    await slot(page, "10:00").click();
    mock.failGet.add("/api/appointments");
    await page.locator("#appointment-form .submit-button").click();
    await expect(page.locator("#form-dialog")).not.toBeVisible();
    await expect(page.locator("#notice")).toContainText("guardada");
    await expect(page.locator("#appointments-body")).toContainText("Luna");
    expect(mock.posts["/api/appointments"]).toHaveLength(1);
  });
  test("fallo parcial: /owners responde y /appointments falla sin duplicar al dueño nuevo", async ({
    page,
  }) => {
    const mock = await setup(page);
    await openOwnerFromPatients(page);
    await fillOwner(page);
    mock.failGet.add("/api/appointments");
    await page.locator("#owner-form .submit-button").click();
    await expect(page.locator("#form-dialog")).not.toBeVisible();
    await expect(page.locator("#notice")).toContainText("guardado");
    await page.locator("#new-pet").click();
    await page.locator("#pet-owner-control").click();
    await expect(
      page
        .locator(".select-popup:not([hidden]) [role=option]")
        .filter({ hasText: "Nuevo dueño" }),
    ).toHaveCount(1);
    expect(mock.posts["/api/owners"]).toHaveLength(1);
  });
  test("cadena cita > mascota > dueño con refrescos fallidos conserva borradores y no duplica altas", async ({
    page,
  }) => {
    const mock = await setup(page);
    await openBooking(page);
    await page.locator("#appointment-register-pet").click();
    await page
      .locator("#pet-form")
      .getByLabel("Nombre", { exact: true })
      .fill("Rocky");
    await page.locator("#pet-register-owner").click();
    await fillOwner(page);
    mock.failGet.add("/api/owners");
    await page.locator("#owner-form .submit-button").click();
    await expect(page.locator("#pet-form")).toBeVisible();
    await expect(page.locator("#form-flow-message")).toContainText(
      "Dueño registrado",
    );
    await expect(page.locator("#pet-owner")).toHaveValue("owners-new-1");
    await expect(
      page.locator("#pet-form").getByLabel("Nombre", { exact: true }),
    ).toHaveValue("Rocky");
    await page.locator("#pet-form .submit-button").click();
    await expect(page.locator("#appointment-form")).toBeVisible();
    await expect(page.locator("#form-flow-message")).toContainText(
      "Mascota registrada",
    );
    await expect(page.locator("#appointment-pet")).toHaveValue("pets-new-1");
    await expect(page.locator("#appointment-reason")).toHaveValue(
      "Control anual",
    );
    await expect(page.locator(".slot-button")).toHaveCount(16);
    await slot(page, "11:00").click();
    await page.locator("#appointment-form .submit-button").click();
    await expect(page.locator("#form-dialog")).not.toBeVisible();
    expect(mock.posts["/api/owners"]).toHaveLength(1);
    expect(mock.posts["/api/pets"]).toHaveLength(1);
    expect(mock.posts["/api/appointments"]).toHaveLength(1);
    expect(mock.posts["/api/pets"]?.[0]?.ownerId).toBe("owners-new-1");
    expect(mock.posts["/api/appointments"]?.[0]?.petId).toBe("pets-new-1");
  });
  test("un fallo real del POST sí permite reintentar y conserva los datos", async ({
    page,
  }) => {
    const mock = await setup(page, {
      post: {
        "/api/owners": async (_body, count) =>
          count === 1
            ? {
                status: 500,
                json: {
                  error: {
                    code: "INTERNAL",
                    message: "Error interno simulado",
                  },
                },
              }
            : undefined,
      },
    });
    await openOwnerFromPatients(page);
    await fillOwner(page);
    await page.locator("#owner-form .submit-button").click();
    await expect(page.locator("#form-error")).toContainText(
      "Error interno simulado",
    );
    await expect(
      page.locator("#owner-form").getByLabel("Nombre completo"),
    ).toHaveValue("Nuevo dueño");
    await page.locator("#owner-form .submit-button").click();
    await expect(page.locator("#form-dialog")).not.toBeVisible();
    expect(mock.posts["/api/owners"]).toHaveLength(2);
    expect(mock.owners).toHaveLength(2);
  });
});
// ---------------------------------------------------------------- F-08
test.describe("F-08 conflicto 409 de cita", () => {
  test("vuelve a consultar, libera el bloque ocupado y permite elegir otro", async ({
    page,
  }) => {
    const mock = await setup(page, {
      post: {
        "/api/appointments": async (_b, count) => {
          if (count === 1) {
            mock.occupied.add("10:00");
            return conflict;
          }
          return undefined;
        },
      },
    });
    await openBooking(page);
    await slot(page, "10:00").click();
    await page.locator("#appointment-form .submit-button").click();
    await expect(page.locator("#form-error")).toContainText(
      "ya tiene una cita",
    );
    await expect(slot(page, "10:00")).toBeDisabled();
    await expect(slot(page, "10:00")).toContainText("Ocupado");
    await expect(slot(page, "10:00")).toHaveAttribute("aria-checked", "false");
    await expect(
      page.locator("#appointment-form .submit-button"),
    ).toBeDisabled();
    await expect(page.locator("#appointment-reason")).toHaveValue(
      "Control anual",
    );
    await expect(page.locator("#appointment-pet")).toHaveValue("pet-luna");
    await expect(page.locator("#appointment-vet")).toHaveValue("vet-elena");
    await expect(page.locator("#appointment-date")).toHaveValue(tomorrow());
    await slot(page, "10:30").click();
    await expect(
      page.locator("#appointment-form .submit-button"),
    ).toBeEnabled();
    await page.locator("#appointment-form .submit-button").click();
    await expect(page.locator("#form-dialog")).not.toBeVisible();
    expect(mock.posts["/api/appointments"]).toHaveLength(2);
    expect(mock.posts["/api/appointments"]?.[1]?.startsAt).not.toBe(
      mock.posts["/api/appointments"]?.[0]?.startsAt,
    );
  });
  test("si la nueva consulta falla no habilita una reserva obsoleta y permite reintentar", async ({
    page,
  }) => {
    let failed = false;
    const mock = await setup(page, {
      // Solo falla la primera consulta posterior al POST en conflicto.
      availabilityFail: () => {
        if (failed || !mock.posts["/api/appointments"]?.length) return false;
        failed = true;
        return true;
      },
      post: {
        "/api/appointments": async (_b, count) => {
          if (count === 1) {
            mock.occupied.add("10:00");
            return conflict;
          }
          return undefined;
        },
      },
    });
    await openBooking(page);
    await slot(page, "10:00").click();
    await page.locator("#appointment-form .submit-button").click();
    await expect(page.locator("#appointment-slots")).toContainText(
      "No se pudieron consultar",
    );
    await expect(
      page.locator("#appointment-form .submit-button"),
    ).toBeDisabled();
    await expect(page.locator(".slot-button")).toHaveCount(0);
    await page.getByRole("button", { name: "Reintentar consulta" }).click();
    await expect(page.locator(".slot-button")).toHaveCount(16);
    await expect(slot(page, "10:00")).toBeDisabled();
    await expect(
      page.locator("#appointment-form .submit-button"),
    ).toBeDisabled();
    await slot(page, "11:30").click();
    await expect(
      page.locator("#appointment-form .submit-button"),
    ).toBeEnabled();
    expect(mock.posts["/api/appointments"]).toHaveLength(1);
  });
});
// ---------------------------------------------------------------- F-09 / F-14
test.describe("F-09 selector requerido y F-14 mensajes en español", () => {
  test("un selector requerido sin elegir muestra un error asociado y lo limpia al elegir", async ({
    page,
  }) => {
    const mock = await setup(page);
    await page.getByRole("button", { name: "Pacientes", exact: true }).click();
    await page.locator("#new-pet").click();
    await page
      .locator("#pet-form")
      .getByLabel("Nombre", { exact: true })
      .fill("Rocky");
    await page.locator("#pet-form .submit-button").click();
    const trigger = page.locator("#pet-owner-control");
    const error = page.locator("#pet-owner-error");
    await expect(error).toBeVisible();
    await expect(error).toContainText("Selecciona");
    await expect(error).toHaveAttribute("role", "alert");
    await expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(await trigger.getAttribute("aria-describedby")).toContain(
      "pet-owner-error",
    );
    await expect(trigger).toBeFocused();
    expect(mock.posts["/api/pets"]).toBeUndefined();
    await choose(page, "Dueño", "Ana");
    await expect(error).toBeHidden();
    await expect(trigger).not.toHaveAttribute("aria-invalid", "true");
    expect(
      (await trigger.getAttribute("aria-describedby")) ?? "",
    ).not.toContain("pet-owner-error");
  });
  test("con varios campos inválidos el foco va al primero del formulario", async ({
    page,
  }) => {
    await setup(page);
    await page.getByRole("button", { name: "Pacientes", exact: true }).click();
    await page.locator("#new-pet").click();
    await page.locator("#pet-form .submit-button").click();
    await expect(page.locator("#pet-owner-control")).toBeFocused();
    await expect(page.locator("#pet-owner-error")).toBeVisible();
  });
  test("errores de validación de zod y de red llegan en español", async ({
    page,
  }) => {
    await setup(page, {
      post: {
        "/api/owners": async (_b, count) =>
          count === 1
            ? {
                status: 400,
                json: {
                  error: {
                    code: "VALIDATION_ERROR",
                    message:
                      "email: Invalid email address; name: Too small: expected string to have >=1 characters",
                  },
                },
              }
            : count === 2
              ? "abort"
              : undefined,
      },
    });
    await openOwnerFromPatients(page);
    await fillOwner(page);
    await page.locator("#owner-form .submit-button").click();
    const box = page.locator("#form-error");
    await expect(box).toContainText("Correo electrónico");
    await expect(box).toContainText("no es un correo válido");
    await expect(box).toContainText("Nombre");
    await expect(box).toContainText("obligatorio");
    await expect(box).not.toContainText("Invalid");
    await expect(box).not.toContainText("Too small");
    await page.locator("#owner-form .submit-button").click();
    await expect(box).toContainText("No se pudo conectar");
    await expect(box).not.toContainText("Failed to fetch");
  });
  test("la consulta de horarios fallida por red se muestra en español", async ({
    page,
  }) => {
    await setup(page, { availabilityAbort: (call) => call >= 1 });
    await page.locator("#new-appointment").click();
    await choose(page, "Veterinario", "Elena");
    await expect(page.locator("#appointment-slots")).toContainText(
      "No se pudo conectar",
    );
    await expect(page.locator("#appointment-slots")).not.toContainText(
      "Failed to fetch",
    );
  });
});
// ---------------------------------------------------------------- F-15 / F-16
test.describe("F-15 teclado de horarios y F-16 estado durante el guardado", () => {
  test("el grupo de horarios tiene una sola parada de Tab y las flechas saltan bloques ocupados", async ({
    page,
  }) => {
    await setup(page, { occupied: new Set(["10:30"]) });
    await openBooking(page);
    const tabStops = () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLButtonElement>(".slot-button"))
          .filter((b) => !b.disabled && b.tabIndex >= 0)
          .map((b) => b.dataset.time),
      );
    expect(await tabStops()).toEqual(["10:00"]);
    // El campo de fecha tiene segmentos internos de Tab; se entra al grupo
    // desde el campo siguiente (Motivo) con Shift+Tab.
    await page.locator("#appointment-reason").focus();
    await page.keyboard.press("Shift+Tab");
    await expect(slot(page, "10:00")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    expect(
      await page.evaluate(
        () => document.activeElement?.closest(".slot-button") ?? null,
      ),
    ).toBeNull();
    await slot(page, "10:00").focus();
    await page.keyboard.press("Tab");
    await expect(page.locator("#appointment-reason")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(slot(page, "10:00")).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(slot(page, "11:00")).toBeFocused();
    await expect(slot(page, "11:00")).toHaveAttribute("aria-checked", "true");
    expect(await tabStops()).toEqual(["11:00"]);
    await page.keyboard.press("End");
    await expect(slot(page, "17:30")).toBeFocused();
    await page.keyboard.press("Home");
    await expect(slot(page, "10:00")).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(slot(page, "17:30")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("#appointment-reason")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(slot(page, "17:30")).toBeFocused();
  });
  test("durante el guardado se bloquean acciones incompatibles y no queda «Volver» residual", async ({
    page,
  }) => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const mock = await setup(page, {
      post: {
        "/api/appointments": async (_b, count) => {
          if (count !== 1) return undefined;
          await gate;
          return conflict;
        },
      },
    });
    await openBooking(page);
    await slot(page, "10:00").click();
    await page.locator("#appointment-form .submit-button").click();
    await expect(
      page.locator("#appointment-form .submit-button"),
    ).toContainText("Guardando");
    for (const selector of [
      "#appointment-register-pet",
      "#close-dialog",
      "#appointment-date",
      "#appointment-vet-control",
      "#appointment-pet-control",
      "#appointment-reason",
      '.slot-button[data-time="10:30"]',
      "#return-form",
    ])
      await expect(page.locator(selector)).toBeDisabled();
    await page
      .locator("#appointment-register-pet")
      .click({ force: true, timeout: 2000 })
      .catch(() => undefined);
    await expect(page.locator("#pet-form")).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(page.locator("#form-dialog")).toBeVisible();
    release();
    await expect(page.locator("#form-error")).toContainText(
      "ya tiene una cita",
    );
    await expect(page.locator("#return-form")).toBeHidden();
    await expect(page.locator("#appointment-form")).toBeVisible();
    // Se abre y se vuelve de la cadena sin residuos.
    await page.locator("#appointment-register-pet").click();
    await expect(page.locator("#return-form")).toBeVisible();
    await page.locator("#return-form").click();
    await expect(page.locator("#appointment-form")).toBeVisible();
    await expect(page.locator("#return-form")).toBeHidden();
    await page.locator("#close-dialog").click();
    await expect(page.locator("#form-dialog")).not.toBeVisible();
    expect(mock.posts["/api/appointments"]).toHaveLength(1);
    await openOwnerFromPatients(page);
    await expect(page.locator("#return-form")).toBeHidden();
    await expect(page.locator("#owner-form")).toBeVisible();
    await expect(page.locator("#appointment-form")).toBeHidden();
    await expect(page.locator("#owner-form .submit-button")).toBeEnabled();
    await expect(
      page.locator("#owner-form").getByLabel("Nombre completo"),
    ).toBeEnabled();
  });
});
// ---------------------------------------------------------------- F-19 / F-21 (UI)
test.describe("F-19/F-21 horario de clínica desde /config", () => {
  test("la UI muestra el horario y la duración que entrega /config", async ({
    page,
  }) => {
    await setup(page, {
      config: {
        timeZone: "America/Hermosillo",
        reminderHours: 24,
        bookingHours: { opensAt: "09:00", closesAt: "13:00", slotMinutes: 20 },
      },
    });
    await page.locator("#new-appointment").click();
    const hint = page.locator("#booking-hours-hint");
    await expect(hint).toContainText("09:00 a 13:00");
    await expect(hint).toContainText("20 minutos");
    await expect(hint).toContainText("12:40");
  });
  test("sin bookingHours usa los valores por defecto seguros", async ({
    page,
  }) => {
    await setup(page);
    await page.locator("#new-appointment").click();
    const hint = page.locator("#booking-hours-hint");
    await expect(hint).toContainText("10:00 a 18:00");
    await expect(hint).toContainText("30 minutos");
    await expect(hint).toContainText("17:30");
  });
});

test.describe("contraste de estados interactivos", () => {
  // Cálculo propio (razón WCAG 2.x sobre colores computados); no es una herramienta certificada.
  const contrast = (page: Page, selector: string, onWhite = false) =>
    page.evaluate(
      ([sel, white]) => {
        const channels = (value: string) =>
          (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        const luminance = (rgb: number[]) => {
          const [r = 0, g = 0, b = 0] = rgb.map((c) => {
            const s = c / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const element = document.querySelector(sel as string);
        if (!element) throw new Error(`No existe ${String(sel)}`);
        const style = getComputedStyle(element);
        const fg = luminance(channels(style.color));
        const bg = luminance(
          white ? [255, 255, 255] : channels(style.backgroundColor),
        );
        return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      },
      [selector, onWhite] as const,
    );
  test("el horario seleccionado conserva el contraste con el puntero encima", async ({
    page,
  }) => {
    await setup(page);
    await openBooking(page);
    await slot(page, "10:00").click();
    await slot(page, "10:00").hover();
    await expect(slot(page, "10:00")).toHaveAttribute("aria-checked", "true");
    expect(
      await contrast(page, '.slot-button[data-time="10:00"]'),
    ).toBeGreaterThanOrEqual(4.5);
  });
  test("la etiqueta «(opcional)» alcanza 4.5:1 sobre fondo blanco", async ({
    page,
  }) => {
    await setup(page);
    await page.getByRole("button", { name: "Pacientes", exact: true }).click();
    await page.locator("#new-owner").click();
    expect(
      await contrast(page, "#owner-form .optional", true),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
