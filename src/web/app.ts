import { icon, hydrateIcons, type IconName } from "./components/icons.js";
import {
  enhanceSelects,
  syncSelect,
  closeSelects,
} from "./components/select.js";
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
interface AppointmentSlot {
  time: string;
  startsAt: string;
  endsAt: string;
  available: boolean;
  reason: "past" | "occupied" | null;
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
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
function clearNotice(): void {
  if (noticeTimer) clearTimeout(noticeTimer);
  q("#notice").hidden = true;
}
function notice(message: string, error = false): void {
  clearNotice();
  const box = q("#notice");
  const copy = element("span", "notice-copy", message);
  const close = element("button", "icon-button");
  close.type = "button";
  close.setAttribute("aria-label", "Cerrar aviso");
  close.append(icon("close"));
  close.addEventListener("click", clearNotice);
  box.classList.toggle("error", error);
  box.replaceChildren(icon(error ? "warning" : "check"), copy, close);
  box.hidden = false;
  if (!error) noticeTimer = setTimeout(clearNotice, 7000);
}
function buttonContents(
  button: HTMLButtonElement,
  label: string,
  name: IconName,
  loading = false,
): void {
  button.replaceChildren(
    icon(loading ? "spinner" : name, loading ? "spinning" : ""),
    element("span", "", label),
  );
}
function emptyState(
  title: string,
  message: string,
  name: IconName,
  action?: { label: string; run: () => void },
): HTMLElement {
  const box = element("div", "empty-state"),
    mark = element("span", "empty-icon");
  mark.append(icon(name));
  box.append(mark, element("h3", "", title), element("p", "", message));
  if (action) {
    const button = element("button", "button secondary", action.label);
    button.type = "button";
    button.addEventListener("click", action.run);
    box.append(button);
  }
  return box;
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
    ...(withTime
      ? { year: "numeric", hour: "2-digit", minute: "2-digit" }
      : {}),
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
  items: { id: string; name: string; description?: string }[],
  selected?: string,
  placeholder?: string,
): void {
  select.replaceChildren(
    ...items.map((item) => {
      const option = element("option", "", item.name);
      option.value = item.id;
      if (item.description) option.dataset.description = item.description;
      return option;
    }),
  );
  if (placeholder) {
    const empty = element("option", "", placeholder);
    empty.value = "";
    empty.disabled = true;
    select.prepend(empty);
    select.value = "";
  }
  if (selected && items.some((item) => item.id === selected))
    select.value = selected;
  syncSelect(select);
}
function petChoices() {
  return state.pets.map((p) => ({
    ...p,
    description: `${p.species} · ${state.owners.find((o) => o.id === p.ownerId)?.name ?? "Dueño"}`,
  }));
}
function petAvatar(pet: Pet): HTMLElement {
  const mark = element(
    "span",
    `pet-avatar ${pet.species === "Gato" ? "cat" : ""}`,
  );
  mark.append(icon("paw"));
  return mark;
}
function renderAppointments(): void {
  const now = Date.now();
  const appointments = state.appointments.filter(
    (a) => !state.upcomingOnly || new Date(a.startsAt).getTime() > now,
  );
  q("#appointment-count").textContent =
    `${appointments.length} ${appointments.length === 1 ? "cita" : "citas"} ${state.upcomingOnly ? "próximas" : "registradas"}`;
  q("#zone-label").textContent = state.config.timeZone;
  const empty = q("#agenda-empty");
  empty.hidden = appointments.length !== 0;
  if (!appointments.length)
    empty.replaceChildren(
      emptyState(
        "Tu agenda tiene espacio",
        "Agenda una cita para acompañar a tu próximo paciente.",
        "calendar",
        { label: "Crear primera cita", run: () => openForm("appointment") },
      ),
    );
  q("#appointments-body").replaceChildren(
    ...appointments.map((a) => {
      const pet = state.pets.find((p) => p.id === a.petId),
        owner = state.owners.find((o) => o.id === pet?.ownerId),
        vet = state.vets.find((v) => v.id === a.veterinarianId);
      const row = element("tr"),
        patient = element("td", "patient-column"),
        cell = element("div", "patient-cell"),
        details = element("div");
      if (pet) cell.append(petAvatar(pet));
      details.append(
        element("strong", "", pet?.name ?? "Paciente"),
        element("small", "", owner?.name ?? ""),
      );
      cell.append(details);
      patient.append(cell);
      const schedule = element("td", "date-column");
      schedule.dataset.label = "Fecha y hora";
      schedule.append(
        element("span", "date-primary", date(a.startsAt)),
        element(
          "span",
          "date-secondary",
          `${time(a.startsAt)} – ${time(a.endsAt)}`,
        ),
      );
      const vetCell = element(
        "td",
        "vet-column",
        vet?.name ?? "Veterinario no activo",
      );
      vetCell.dataset.label = "Veterinario";
      const reason = element("td", "reason-column", a.reason);
      reason.dataset.label = "Motivo";
      const status = element("td", "status-column"),
        past = new Date(a.startsAt).getTime() <= now;
      status.append(
        element(
          "span",
          `badge${past ? " past" : ""}`,
          past ? "Fecha transcurrida" : "Programada",
        ),
      );
      row.append(patient, schedule, vetCell, reason, status);
      return row;
    }),
  );
}
function renderPatients(): void {
  const query = q<HTMLInputElement>("#patient-search")
    .value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const pets = state.pets.filter((p) =>
    `${p.name} ${p.species} ${state.owners.find((o) => o.id === p.ownerId)?.name ?? ""}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .includes(query),
  );
  q("#patient-count").textContent =
    `${pets.length} ${pets.length === 1 ? "paciente" : "pacientes"}`;
  const cards = pets.map((p) => {
    const card = element("article", "patient-card"),
      owner = state.owners.find((o) => o.id === p.ownerId),
      header = element("div", "patient-card-header"),
      title = element("div");
    title.append(
      element("h3", "", p.name),
      element("span", "species-tag", p.species),
    );
    header.append(petAvatar(p), title);
    const details = element("div", "patient-card-details");
    details.append(
      element("p", "patient-breed", p.breed ?? "Raza no especificada"),
    );
    const ownerRow = element("p", "patient-owner");
    ownerRow.append(
      icon("user"),
      element("span", "", owner?.name ?? "Sin dueño registrado"),
    );
    details.append(ownerRow);
    const button = element("button", "button patient-history");
    button.type = "button";
    buttonContents(button, "Ver historial", "arrow");
    button.addEventListener("click", () => {
      const select = q<HTMLSelectElement>("#history-pet");
      select.value = p.id;
      syncSelect(select);
      void switchView("history");
    });
    card.append(header, details, button);
    return card;
  });
  const grid = q("#patients-grid");
  grid.replaceChildren(...cards);
  if (!cards.length)
    grid.append(
      emptyState(
        query
          ? "No encontramos ese paciente"
          : "Cada historia empieza por un nombre",
        query
          ? "Prueba con el nombre de la mascota o de su dueño."
          : "Registra un dueño y su mascota para comenzar.",
        "paw",
        query
          ? undefined
          : { label: "Registrar dueño", run: () => openForm("owner") },
      ),
    );
}
let historyRequest = 0;
async function renderHistory(): Promise<void> {
  const request = ++historyRequest,
    select = q<HTMLSelectElement>("#history-pet"),
    petId = select.value,
    list = q("#history-list"),
    profile = q("#history-patient");
  const pet = state.pets.find((p) => p.id === petId),
    owner = state.owners.find((o) => o.id === pet?.ownerId);
  if (!pet) {
    profile.hidden = true;
    list.removeAttribute("aria-busy");
    list.replaceChildren(
      emptyState(
        "Un expediente para cada paciente",
        "Registra una mascota para comenzar su historial.",
        "clipboard",
      ),
    );
    return;
  }
  profile.hidden = false;
  const details = element("div", "history-patient-copy");
  details.append(
    element("h3", "", pet.name),
    element("p", "", `${pet.species}${pet.breed ? ` · ${pet.breed}` : ""}`),
    element("span", "", `Dueño: ${owner?.name ?? "—"}`),
  );
  profile.replaceChildren(petAvatar(pet), details);
  list.setAttribute("aria-busy", "true");
  const loading = element("div", "loading-state");
  loading.append(
    icon("spinner", "spinning"),
    element("span", "", "Cargando historial…"),
  );
  list.replaceChildren(loading);
  try {
    const records = await api<MedicalRecord[]>(
      `/pets/${encodeURIComponent(petId)}/medical-records`,
    );
    if (request !== historyRequest) return;
    profile.append(
      element(
        "span",
        "record-count",
        `${records.length} ${records.length === 1 ? "nota clínica" : "notas clínicas"}`,
      ),
    );
    list.replaceChildren(
      ...records.map((r) => {
        const item = element("article", "timeline-entry"),
          marker = element("span", "timeline-marker");
        marker.append(icon("clipboard"));
        const content = element("div", "timeline-card"),
          header = element("div", "timeline-heading");
        header.append(
          element("strong", "", date(r.recordedAt, true)),
          element("span", "badge", "Atención registrada"),
        );
        const clinician = element("p", "timeline-clinician");
        clinician.append(
          icon("medical"),
          element(
            "span",
            "",
            state.vets.find((v) => v.id === r.veterinarianId)?.name ??
              "Veterinario",
          ),
        );
        content.append(
          header,
          clinician,
          element("p", "clinical-note", r.clinicalNote),
        );
        item.append(marker, content);
        return item;
      }),
    );
    if (!records.length)
      list.append(
        emptyState(
          "Sin notas clínicas todavía",
          "Aquí aparecerán las atenciones y el seguimiento de este paciente.",
          "clipboard",
          { label: "Agregar primera nota", run: () => openForm("record") },
        ),
      );
  } catch (error) {
    if (request !== historyRequest) return;
    list.replaceChildren(
      emptyState(
        "No se pudo cargar el historial",
        "Intenta consultar de nuevo en unos momentos.",
        "warning",
        {
          label: "Volver a intentar",
          run: () => {
            void renderHistory();
          },
        },
      ),
    );
    report(error);
  } finally {
    if (request === historyRequest) list.removeAttribute("aria-busy");
  }
}
function renderReminders(): void {
  const cards = state.reminders.map((r) => {
    const appointment = state.appointments.find(
        (a) => a.id === r.appointmentId,
      ),
      pet = state.pets.find((p) => p.id === appointment?.petId);
    const card = element("article", "notification"),
      header = element("div", "notification-heading"),
      mark = element("span", "notification-mark");
    mark.append(icon("mail"));
    const heading = element("div", "notification-title");
    heading.append(
      element(
        "h3",
        "",
        pet ? `Recordatorio para ${pet.name}` : "Recordatorio de cita",
      ),
      element("p", "", `Para: ${r.recipient}`),
    );
    header.append(
      mark,
      heading,
      element("span", "badge simulated", "Simulado"),
    );
    const footer = element("div", "notification-footer");
    footer.append(
      icon("clock"),
      element("span", "", `Registrado el ${date(r.simulatedAt, true)}`),
      element("span", "delivery-note", "Sin envío real"),
    );
    card.append(
      header,
      element("p", "notification-message", r.message),
      footer,
    );
    return card;
  });
  const list = q("#notifications-list");
  list.replaceChildren(...cards);
  if (!cards.length)
    list.append(
      emptyState(
        "Todo listo para el próximo aviso",
        "Simula los recordatorios de las citas próximas. Los mensajes aparecerán aquí.",
        "mail",
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
  options(historySelect, petChoices(), historySelect.value);
  renderAppointments();
  renderPatients();
  renderReminders();
  q("#today-label").textContent = new Intl.DateTimeFormat("es-MX", {
    timeZone: config.timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
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
  clearNotice();
  closeSelects();
  if (state.view === "history" && view !== "history") historyRequest++;
  state.view = view;
  window.scrollTo({ top: 0, behavior: "auto" });
  const [name, title, subtitle] = titles[view];
  q("#breadcrumb-current").textContent = name;
  q("#page-title").textContent = title;
  q("#page-subtitle").textContent = subtitle;
  document.querySelectorAll<HTMLElement>(".view").forEach((node) => {
    node.hidden = node.id !== `view-${view}`;
  });
  document.querySelectorAll<HTMLElement>("[data-view]").forEach((node) => {
    node.classList.toggle("active", node.dataset.view === view);
    if (node.dataset.view === view) node.setAttribute("aria-current", "page");
    else node.removeAttribute("aria-current");
  });
  if (view === "history") await renderHistory();
}
const dialog = q<HTMLDialogElement>("#form-dialog");
let saving = false;
type FormKind = "appointment" | "owner" | "pet" | "record";
let activeKind: FormKind = "appointment";
const formStack: { kind: FormKind; values: Record<string, string> }[] = [];
let slots: AppointmentSlot[] = [];
let availabilityRequest = 0;
function clinicDay(value = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: state.config.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(value)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function selectedSlot(): AppointmentSlot | undefined {
  return slots.find(
    (slot) =>
      slot.time === q<HTMLInputElement>("#appointment-time").value &&
      slot.available,
  );
}
function updateBookingButton(): void {
  const form = q<HTMLFormElement>("#appointment-form");
  q<HTMLButtonElement>("#appointment-form .submit-button").disabled =
    saving ||
    !field(form, "petId").value ||
    !field(form, "veterinarianId").value ||
    !selectedSlot();
}
function renderSlots(): void {
  const group = q("#appointment-slots");
  group.replaceChildren(
    ...slots.map((slot) => {
      const label = new Intl.DateTimeFormat("es-MX", {
        timeZone: state.config.timeZone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(slot.startsAt));
      const button = element("button", "slot-button");
      button.type = "button";
      button.dataset.time = slot.time;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-label", label);
      button.setAttribute(
        "aria-checked",
        String(slot.time === q<HTMLInputElement>("#appointment-time").value),
      );
      button.disabled = !slot.available;
      button.append(element("span", "", label));
      if (slot.reason)
        button.append(
          element(
            "small",
            "",
            slot.reason === "occupied" ? "Ocupado" : "Ya pasó",
          ),
        );
      button.addEventListener("click", () => {
        q<HTMLInputElement>("#appointment-time").value = slot.time;
        q("#form-error").hidden = true;
        renderSlots();
        q<HTMLButtonElement>(`.slot-button[data-time="${slot.time}"]`).focus();
        updateBookingButton();
      });
      button.addEventListener("keydown", (event) => {
        if (
          ![
            "ArrowRight",
            "ArrowLeft",
            "ArrowUp",
            "ArrowDown",
            "Home",
            "End",
          ].includes(event.key)
        )
          return;
        event.preventDefault();
        const enabled = Array.from(
          group.querySelectorAll<HTMLButtonElement>(
            ".slot-button:not(:disabled)",
          ),
        );
        const index = enabled.indexOf(button);
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? enabled.length - 1
              : (index +
                  (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1) +
                  enabled.length) %
                enabled.length;
        enabled[next]?.click();
      });
      return button;
    }),
  );
  if (!slots.some((slot) => slot.available))
    group.append(
      element(
        "p",
        "slots-empty",
        "No hay horarios disponibles para este día. Selecciona otra fecha.",
      ),
    );
}
async function loadAvailability(): Promise<void> {
  const request = ++availabilityRequest,
    form = q<HTMLFormElement>("#appointment-form"),
    dateValue = field(form, "date").value,
    vet = field(form, "veterinarianId").value,
    group = q("#appointment-slots");
  slots = [];
  updateBookingButton();
  if (!dateValue || !vet) {
    group.replaceChildren(
      element(
        "p",
        "slots-empty",
        "Selecciona un veterinario y una fecha para consultar horarios.",
      ),
    );
    return;
  }
  group.setAttribute("aria-busy", "true");
  const loading = element("p", "slots-loading");
  loading.append(
    icon("spinner", "spinning"),
    element("span", "", "Consultando horarios…"),
  );
  group.replaceChildren(loading);
  try {
    const result = await api<AppointmentSlot[]>(
      `/appointments/availability?date=${encodeURIComponent(dateValue)}&veterinarianId=${encodeURIComponent(vet)}`,
    );
    if (request !== availabilityRequest || activeKind !== "appointment") return;
    slots = result;
    if (!selectedSlot()) q<HTMLInputElement>("#appointment-time").value = "";
    renderSlots();
  } catch (error) {
    if (request !== availabilityRequest) return;
    group.replaceChildren(
      element(
        "p",
        "slots-empty",
        error instanceof Error
          ? error.message
          : "No se pudieron consultar los horarios.",
      ),
    );
  } finally {
    if (request === availabilityRequest) {
      group.removeAttribute("aria-busy");
      updateBookingButton();
    }
  }
}
function openForm(kind: FormKind, preset: Record<string, string> = {}): void {
  if (saving) return;
  closeSelects();
  availabilityRequest++;
  activeKind = kind;
  const copy = {
    appointment: [
      "Agendar una cita",
      "Registra una visita desde recepción. Puedes dar de alta al dueño y a la mascota sin salir de este flujo.",
    ],
    owner: [
      "Registrar dueño",
      "Registra a la persona responsable de la mascota.",
    ],
    pet: [
      "Registrar mascota",
      "Selecciona a su dueño o registra uno nuevo para completar el expediente.",
    ],
    record: [
      "Agregar nota clínica",
      "Documenta la atención y el seguimiento del paciente.",
    ],
  }[kind];
  q("#dialog-title").textContent = copy[0] ?? "";
  q("#dialog-description").textContent = copy[1] ?? "";
  q("#form-error").hidden = true;
  q("#form-flow-message").hidden = true;
  document.querySelectorAll<HTMLFormElement>("dialog form").forEach((form) => {
    form.hidden = form.id !== `${kind}-form`;
    if (!form.hidden) form.reset();
  });
  options(
    q<HTMLSelectElement>("#appointment-pet"),
    petChoices(),
    preset.petId,
    "Selecciona una mascota",
  );
  options(
    q<HTMLSelectElement>("#appointment-vet"),
    state.vets,
    preset.veterinarianId,
    "Selecciona un veterinario",
  );
  options(
    q<HTMLSelectElement>("#record-pet"),
    petChoices(),
    preset.petId ?? q<HTMLSelectElement>("#history-pet").value,
  );
  options(
    q<HTMLSelectElement>("#record-vet"),
    state.vets,
    preset.veterinarianId,
  );
  options(
    q<HTMLSelectElement>("#pet-owner"),
    state.owners,
    preset.ownerId,
    state.owners.length ? "Selecciona un dueño" : "Registra primero un dueño",
  );
  const form = q<HTMLFormElement>(`#${kind}-form`);
  if (kind === "appointment") {
    field(form, "date").min = clinicDay();
    field(form, "date").value = clinicDay();
    field(form, "time").value = "";
    q("#booking-zone").textContent =
      `Todos los horarios corresponden a la clínica: ${state.config.timeZone}.`;
  }
  if (kind === "record") {
    field(form, "recordedAt").value = localInput(new Date());
    field(form, "recordedAt").max = localInput(new Date());
  }
  q<HTMLInputElement>('#pet-form [name="birthDate"]').max = new Date()
    .toISOString()
    .slice(0, 10);
  for (const [name, value] of Object.entries(preset)) {
    const input = form.elements.namedItem(name);
    if (
      input instanceof HTMLInputElement ||
      input instanceof HTMLTextAreaElement ||
      input instanceof HTMLSelectElement
    )
      input.value = value;
  }
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  document.querySelectorAll<HTMLElement>(".time-hint").forEach((node) => {
    node.textContent =
      deviceZone === state.config.timeZone
        ? `Horario de la clínica: ${state.config.timeZone}.`
        : `Hora de tu dispositivo: ${deviceZone}. La agenda se muestra en ${state.config.timeZone}.`;
  });
  document
    .querySelectorAll<HTMLSelectElement>("dialog select")
    .forEach(syncSelect);
  const back = q("#return-form");
  back.hidden = !formStack.length;
  q("#return-form-label").textContent =
    formStack.at(-1)?.kind === "appointment"
      ? "Volver a la cita"
      : "Volver al registro de mascota";
  q<HTMLButtonElement>("#pet-form .submit-button").disabled =
    !state.owners.length;
  document.body.classList.add("dialog-open");
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  form
    .querySelector<HTMLElement>(
      ".select-trigger:not(:disabled),input:not(.select-search-input):not([type=hidden]),textarea",
    )
    ?.focus();
  if (kind === "appointment") void loadAvailability();
}
function pushForm(kind: FormKind): void {
  formStack.push({
    kind: activeKind,
    values: formValues(q<HTMLFormElement>(`#${activeKind}-form`)),
  });
  openForm(kind);
}
q("#appointment-register-pet").addEventListener("click", () => pushForm("pet"));
q("#pet-register-owner").addEventListener("click", () => pushForm("owner"));
q("#return-form").addEventListener("click", () => {
  if (saving) return;
  const parent = formStack.pop();
  if (parent) openForm(parent.kind, parent.values);
});
q("#appointment-date").addEventListener("change", () => {
  q<HTMLInputElement>("#appointment-time").value = "";
  void loadAvailability();
});
q("#appointment-vet").addEventListener("change", () => {
  q<HTMLInputElement>("#appointment-time").value = "";
  void loadAvailability();
});
q("#appointment-pet").addEventListener("change", updateBookingButton);
for (const kind of ["appointment", "owner", "pet", "record"] as const) {
  q(`#new-${kind}`).addEventListener("click", () => {
    formStack.length = 0;
    openForm(kind);
  });
  q<HTMLFormElement>(`#${kind}-form`).addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement,
      button = q<HTMLButtonElement>(`#${form.id} .submit-button`);
    button.disabled = true;
    saving = true;
    q<HTMLButtonElement>("#close-dialog").disabled = true;
    const originalLabel = button.textContent?.trim() ?? "Guardar";
    buttonContents(button, "Guardando…", "check", true);
    void (async () => {
      try {
        const values = formValues(form);
        let path = "",
          body: unknown;
        if (kind === "appointment") {
          path = "/appointments";
          const slot = selectedSlot();
          if (!slot) throw new Error("Selecciona un horario disponible.");
          body = {
            petId: values.petId,
            veterinarianId: values.veterinarianId,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            reason: values.reason,
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
        const created = await api<{ id: string }>(path, body);
        await refresh();
        if ((kind === "owner" || kind === "pet") && formStack.length) {
          const parent = formStack.pop()!;
          parent.values[kind === "owner" ? "ownerId" : "petId"] = created.id;
          saving = false;
          openForm(parent.kind, parent.values);
          q("#form-flow-message").textContent =
            kind === "owner"
              ? "Dueño registrado. Continúa con los datos de la mascota."
              : "Mascota registrada. Puedes continuar con la cita.";
          q("#form-flow-message").hidden = false;
        } else {
          dialog.close();
          const messages = {
            appointment: "Cita agendada. Todo listo para su próxima visita.",
            owner: "Dueño registrado correctamente.",
            pet: "Mascota registrada. Su historia comienza aquí.",
            record: "Nota clínica guardada en el historial.",
          };
          notice(messages[kind]);
        }
      } catch (error) {
        if (dialog.open) {
          const errorBox = q("#form-error");
          errorBox.replaceChildren(
            icon("warning"),
            element(
              "span",
              "",
              error instanceof Error ? error.message : "No se pudo guardar.",
            ),
          );
          errorBox.hidden = false;
          errorBox.focus();
        } else report(error);
      } finally {
        button.disabled = false;
        saving = false;
        q<HTMLButtonElement>("#close-dialog").disabled = false;
        buttonContents(button, originalLabel, "check");
        if (activeKind === "appointment") updateBookingButton();
      }
    })();
  });
}
q("#close-dialog").addEventListener("click", () => {
  if (!saving) dialog.close();
});
dialog.addEventListener("cancel", (event) => {
  if (saving) event.preventDefault();
});
dialog.addEventListener("close", () => {
  closeSelects();
  document.body.classList.remove("dialog-open");
  formStack.length = 0;
  availabilityRequest++;
});
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog || saving) return;
  const b = dialog.getBoundingClientRect();
  if (
    event.clientX < b.left ||
    event.clientX > b.right ||
    event.clientY < b.top ||
    event.clientY > b.bottom
  )
    dialog.close();
});
q("#filter-upcoming").addEventListener("click", () => {
  state.upcomingOnly = true;
  q("#filter-upcoming").classList.add("selected");
  q("#filter-all").classList.remove("selected");
  q("#filter-upcoming").setAttribute("aria-pressed", "true");
  q("#filter-all").setAttribute("aria-pressed", "false");
  renderAppointments();
});
q("#filter-all").addEventListener("click", () => {
  state.upcomingOnly = false;
  q("#filter-all").classList.add("selected");
  q("#filter-upcoming").classList.remove("selected");
  q("#filter-all").setAttribute("aria-pressed", "true");
  q("#filter-upcoming").setAttribute("aria-pressed", "false");
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
  buttonContents(button, "Preparando avisos…", "mail", true);
  void (async () => {
    try {
      const result = await api<{ sent: number }>("/notifications/run", {});
      notice(
        result.sent
          ? `${result.sent} ${result.sent === 1 ? "recordatorio simulado" : "recordatorios simulados"}. No se enviaron correos reales.`
          : "No hay nuevos recordatorios pendientes.",
      );
      await refresh();
    } catch (error) {
      report(error);
    } finally {
      button.disabled = false;
      buttonContents(button, "Simular recordatorios", "mail");
    }
  })();
});
q("#today-label").textContent = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());
q("#patient-search").addEventListener("input", renderPatients);
hydrateIcons();
enhanceSelects();
void refresh().catch(report);
