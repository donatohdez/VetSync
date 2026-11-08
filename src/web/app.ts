interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}
interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: string;
  breed: string | null;
  birthDate: string | null;
}
interface Veterinarian {
  id: string;
  name: string;
}
interface Appointment {
  id: string;
  petId: string;
  veterinarianId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
}
interface Reminder {
  id: string;
  appointmentId: string;
  recipient: string;
  simulatedAt: string;
  message: string;
}
interface MedicalRecord {
  id: string;
  veterinarianId: string;
  recordedAt: string;
  clinicalNote: string;
}
interface ClinicConfig {
  timeZone: string;
  reminderHours: number;
}
type View = "agenda" | "patients" | "history" | "notifications";
const state = {
  owners: [] as Owner[],
  pets: [] as Pet[],
  vets: [] as Veterinarian[],
  appointments: [] as Appointment[],
  reminders: [] as Reminder[],
  config: { timeZone: "America/Hermosillo", reminderHours: 24 } as ClinicConfig,
  view: "agenda" as View,
  upcomingOnly: true,
};
function q<T extends Element = HTMLElement>(selector: string): T {
  const result = document.querySelector<T>(selector);
  if (!result) throw new Error(`No se encontró ${selector}`);
  return result;
}
function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}
async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...(body === undefined
      ? {}
      : { method: "POST", body: JSON.stringify(body) }),
  });
  const result: unknown = await response.json();
  if (!response.ok) {
    const error = result as { error?: { message?: string } };
    throw new Error(
      error.error?.message ?? "No se pudo completar la solicitud.",
    );
  }
  return result as T;
}
function notice(message: string, error = false): void {
  const node = q("#notice");
  node.textContent = message;
  node.classList.toggle("error", error);
  node.hidden = false;
}
function report(error: unknown): void {
  notice(
    error instanceof Error ? error.message : "No se pudo conectar con VetSync.",
    true,
  );
}
function date(value: string, withTime = false): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: state.config.timeZone,
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}
function time(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: state.config.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
function localInput(value: Date): string {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function formValues(form: HTMLFormElement): Record<string, string> {
  return Object.fromEntries(
    Array.from(new FormData(form), ([key, value]) => [
      key,
      String(value).trim(),
    ]),
  );
}
function field(form: HTMLFormElement, name: string): HTMLInputElement {
  return q<HTMLInputElement>(`#${form.id} [name="${name}"]`);
}
function options(
  select: HTMLSelectElement,
  items: { id: string; name: string }[],
  selected?: string,
): void {
  select.replaceChildren(
    ...items.map((item) => {
      const option = element("option", "", item.name);
      option.value = item.id;
      return option;
    }),
  );
  if (selected && items.some((item) => item.id === selected))
    select.value = selected;
}
function petAvatar(pet: Pet): HTMLElement {
  return element(
    "span",
    `pet-avatar ${pet.species === "Gato" ? "cat" : ""}`,
    pet.species === "Gato" ? "🐈" : pet.species === "Perro" ? "🐕" : "🐾",
  );
}
function renderAppointments(): void {
  const now = Date.now();
  const appointments = state.appointments.filter(
    (a) => !state.upcomingOnly || new Date(a.startsAt).getTime() > now,
  );
  q("#appointment-count").textContent =
    `${appointments.length} ${appointments.length === 1 ? "cita" : "citas"} ${state.upcomingOnly ? "próximas" : "registradas"}`;
  q("#zone-label").textContent = state.config.timeZone;
  q("#agenda-empty").hidden = appointments.length !== 0;
  q("#appointments-body").replaceChildren(
    ...appointments.map((a) => {
      const pet = state.pets.find((p) => p.id === a.petId),
        owner = state.owners.find((o) => o.id === pet?.ownerId),
        vet = state.vets.find((v) => v.id === a.veterinarianId);
      const row = element("tr"),
        patient = element("td"),
        cell = element("div", "patient-cell"),
        details = element("div");
      if (pet) cell.append(petAvatar(pet));
      details.append(
        element("strong", "", pet?.name ?? "Paciente"),
        element("small", "", owner?.name ?? ""),
      );
      cell.append(details);
      patient.append(cell);
      const schedule = element("td");
      schedule.append(
        element("span", "date-primary", date(a.startsAt)),
        element(
          "span",
          "date-secondary",
          `${time(a.startsAt)} – ${time(a.endsAt)}`,
        ),
      );
      const status = element("td"),
        isPast = new Date(a.startsAt).getTime() <= now;
      status.append(
        element(
          "span",
          `badge${isPast ? " past" : ""}`,
          isPast ? "Fecha transcurrida" : "Programada",
        ),
      );
      row.append(
        patient,
        schedule,
        element("td", "", vet?.name ?? "Veterinario no activo"),
        element("td", "", a.reason),
        status,
      );
      return row;
    }),
  );
}
function renderPatients(): void {
  const cards = state.pets.map((p) => {
    const card = element("article", "patient-card"),
      owner = state.owners.find((o) => o.id === p.ownerId),
      button = element("button", "button secondary", "Ver historial ↗");
    button.addEventListener("click", () => {
      q<HTMLSelectElement>("#history-pet").value = p.id;
      void switchView("history");
    });
    card.append(
      petAvatar(p),
      element("h3", "", p.name),
      element("p", "", `${p.species}${p.breed ? ` · ${p.breed}` : ""}`),
      element("p", "", `Dueño: ${owner?.name ?? "—"}`),
      button,
    );
    return card;
  });
  q("#patients-grid").replaceChildren(...cards);
  if (!cards.length)
    q("#patients-grid").append(
      element(
        "p",
        "empty",
        "Aún no hay pacientes. Registra un dueño y su mascota para comenzar.",
      ),
    );
}
async function renderHistory(): Promise<void> {
  const select = q<HTMLSelectElement>("#history-pet"),
    petId = select.value,
    list = q("#history-list");
  if (!petId) {
    list.replaceChildren(
      element("p", "empty", "Registra una mascota para comenzar su historial."),
    );
    return;
  }
  list.replaceChildren(element("p", "empty", "Cargando historial…"));
  try {
    const records = await api<MedicalRecord[]>(
      `/pets/${encodeURIComponent(petId)}/medical-records`,
    );
    if (select.value !== petId) return;
    list.replaceChildren(
      ...records.map((r) => {
        const item = element("article");
        item.append(
          element("strong", "", date(r.recordedAt, true)),
          element(
            "small",
            "",
            state.vets.find((v) => v.id === r.veterinarianId)?.name ??
              "Veterinario",
          ),
          element("p", "", r.clinicalNote),
        );
        return item;
      }),
    );
    if (!records.length)
      list.append(
        element(
          "p",
          "empty",
          "Su historia empieza aquí. Agrega la primera nota clínica.",
        ),
      );
  } catch (error) {
    list.replaceChildren(
      element("p", "empty", "No se pudo cargar el historial."),
    );
    report(error);
  }
}
function renderReminders(): void {
  const cards = state.reminders.map((r) => {
    const card = element("article", "notification");
    card.append(
      element("strong", "", `Para: ${r.recipient}`),
      element("p", "", r.message),
      element(
        "small",
        "",
        `Simulado el ${date(r.simulatedAt, true)} · Sin envío real`,
      ),
    );
    return card;
  });
  q("#notifications-list").replaceChildren(...cards);
  if (!cards.length)
    q("#notifications-list").append(
      element(
        "p",
        "empty",
        "Todavía no hay recordatorios. Ejecuta la simulación para revisar las citas próximas.",
      ),
    );
}
async function refresh(): Promise<void> {
  const [owners, pets, vets, appointments, reminders, config] =
    await Promise.all([
      api<Owner[]>("/owners"),
      api<Pet[]>("/pets"),
      api<Veterinarian[]>("/veterinarians"),
      api<Appointment[]>("/appointments"),
      api<Reminder[]>("/notifications"),
      api<ClinicConfig>("/config"),
    ]);
  Object.assign(state, { owners, pets, vets, appointments, reminders, config });
  const now = Date.now();
  q("#stat-appointments").textContent = String(
    appointments.filter(
      (a) =>
        new Date(a.startsAt).getTime() > now &&
        new Date(a.startsAt).getTime() <= now + 86400000,
    ).length,
  );
  q("#stat-pets").textContent = String(pets.length);
  q("#stat-vets").textContent = String(vets.length);
  q("#stat-reminders").textContent = String(reminders.length);
  q("#reminder-window").textContent = String(config.reminderHours);
  const historySelect = q<HTMLSelectElement>("#history-pet");
  options(historySelect, pets, historySelect.value);
  renderAppointments();
  renderPatients();
  renderReminders();
  if (state.view === "history") await renderHistory();
}
const titles: Record<View, [string, string, string]> = {
  agenda: [
    "Agenda",
    "Cada cita, un mejor cuidado.",
    "Tu agenda y tus pacientes, en un mismo lugar.",
  ],
  patients: [
    "Pacientes",
    "Pequeñas grandes historias.",
    "Toda su información, siempre cerca de ti.",
  ],
  history: [
    "Historial médico",
    "Cuidar también es recordar.",
    "Un seguimiento claro para cada paciente.",
  ],
  notifications: [
    "Recordatorios",
    "Siempre un paso más cerca.",
    "Un pequeño aviso para un cuidado continuo.",
  ],
};
async function switchView(view: View): Promise<void> {
  state.view = view;
  const [name, title, subtitle] = titles[view];
  q("#breadcrumb-current").textContent = name;
  q("#page-title").textContent = title;
  q("#page-subtitle").textContent = subtitle;
  document.querySelectorAll<HTMLElement>(".view").forEach((node) => {
    node.hidden = node.id !== `view-${view}`;
  });
  document.querySelectorAll<HTMLElement>("[data-view]").forEach((node) => {
    node.classList.toggle("active", node.dataset.view === view);
  });
  if (view === "history") await renderHistory();
}
const dialog = q<HTMLDialogElement>("#form-dialog");
function openForm(kind: "appointment" | "owner" | "pet" | "record"): void {
  if (
    (kind === "appointment" || kind === "record") &&
    (!state.pets.length || !state.vets.length)
  ) {
    notice(
      "Primero registra una mascota y carga los veterinarios de demostración.",
      true,
    );
    return;
  }
  if (kind === "pet" && !state.owners.length) {
    notice("Primero registra al dueño de la mascota.", true);
    return;
  }
  const copy = {
    appointment: [
      "Agendar una cita",
      "Un espacio en la agenda para cuidar de su salud.",
    ],
    owner: ["Registrar dueño", "El primer paso para acompañar a su mascota."],
    pet: ["Registrar mascota", "Queremos conocer a nuestro nuevo paciente."],
    record: [
      "Agregar nota clínica",
      "Documenta la atención y el seguimiento del paciente.",
    ],
  }[kind];
  q("#dialog-title").textContent = copy[0] ?? "";
  q("#dialog-description").textContent = copy[1] ?? "";
  q("#form-error").hidden = true;
  document.querySelectorAll<HTMLFormElement>("dialog form").forEach((form) => {
    form.hidden = form.id !== `${kind}-form`;
    if (!form.hidden) form.reset();
  });
  document
    .querySelectorAll<HTMLSelectElement>('dialog [name="petId"]')
    .forEach((select) =>
      options(select, state.pets, q<HTMLSelectElement>("#history-pet").value),
    );
  document
    .querySelectorAll<HTMLSelectElement>('dialog [name="veterinarianId"]')
    .forEach((select) => options(select, state.vets));
  options(q<HTMLSelectElement>('#pet-form [name="ownerId"]'), state.owners);
  const future = new Date(Date.now() + 3600000);
  future.setMinutes(Math.ceil(future.getMinutes() / 30) * 30, 0, 0);
  field(q("#appointment-form"), "startsAt").value = localInput(future);
  field(q("#appointment-form"), "endsAt").value = localInput(
    new Date(future.getTime() + 1800000),
  );
  field(q("#record-form"), "recordedAt").value = localInput(new Date());
  q<HTMLInputElement>('#pet-form [name="birthDate"]').max = localInput(
    new Date(),
  ).slice(0, 10);
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  document.querySelectorAll<HTMLElement>(".time-hint").forEach((node) => {
    node.textContent = `Ingresa la hora de tu dispositivo (${deviceZone}). La agenda se muestra en ${state.config.timeZone}.`;
  });
  dialog.showModal();
}
for (const kind of ["appointment", "owner", "pet", "record"] as const) {
  q(`#new-${kind}`).addEventListener("click", () => openForm(kind));
  q<HTMLFormElement>(`#${kind}-form`).addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement,
      button = q<HTMLButtonElement>(`#${form.id} .submit-button`);
    button.disabled = true;
    void (async () => {
      try {
        const values = formValues(form);
        let path = "",
          body: unknown;
        if (kind === "appointment") {
          path = "/appointments";
          body = {
            ...values,
            startsAt: new Date(values.startsAt ?? "").toISOString(),
            endsAt: new Date(values.endsAt ?? "").toISOString(),
          };
        }
        if (kind === "owner") {
          path = "/owners";
          body = { ...values, phone: values.phone || null };
        }
        if (kind === "pet") {
          path = "/pets";
          body = {
            ...values,
            breed: values.breed || null,
            birthDate: values.birthDate || null,
          };
        }
        if (kind === "record") {
          path = `/pets/${encodeURIComponent(values.petId ?? "")}/medical-records`;
          body = {
            veterinarianId: values.veterinarianId,
            recordedAt: new Date(values.recordedAt ?? "").toISOString(),
            clinicalNote: values.clinicalNote,
          };
        }
        await api(path, body);
        dialog.close();
        notice("Información guardada correctamente.");
        await refresh();
      } catch (error) {
        if (dialog.open) {
          q("#form-error").textContent =
            error instanceof Error ? error.message : "No se pudo guardar.";
          q("#form-error").hidden = false;
        } else report(error);
      } finally {
        button.disabled = false;
      }
    })();
  });
}
q("#close-dialog").addEventListener("click", () => dialog.close());
q<HTMLInputElement>('#appointment-form [name="startsAt"]').addEventListener(
  "change",
  (event) => {
    const value = (event.target as HTMLInputElement).value;
    if (value)
      q<HTMLInputElement>('#appointment-form [name="endsAt"]').value =
        localInput(new Date(new Date(value).getTime() + 1800000));
  },
);
q("#filter-upcoming").addEventListener("click", () => {
  state.upcomingOnly = true;
  q("#filter-upcoming").classList.add("selected");
  q("#filter-all").classList.remove("selected");
  renderAppointments();
});
q("#filter-all").addEventListener("click", () => {
  state.upcomingOnly = false;
  q("#filter-all").classList.add("selected");
  q("#filter-upcoming").classList.remove("selected");
  renderAppointments();
});
q("#history-pet").addEventListener("change", () => {
  void renderHistory();
});
document.querySelectorAll<HTMLElement>("[data-view]").forEach((button) =>
  button.addEventListener("click", () => {
    void switchView(button.dataset.view as View);
  }),
);
q("#run-reminders").addEventListener("click", (event) => {
  const button = event.currentTarget as HTMLButtonElement;
  button.disabled = true;
  void (async () => {
    try {
      const result = await api<{ sent: number }>("/notifications/run", {});
      notice(
        result.sent
          ? `${result.sent} recordatorio(s) simulado(s). No se enviaron correos reales.`
          : "No hay nuevos recordatorios pendientes.",
      );
      await refresh();
    } catch (error) {
      report(error);
    } finally {
      button.disabled = false;
    }
  })();
});
q("#today-label").textContent = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());
void refresh().catch(report);
