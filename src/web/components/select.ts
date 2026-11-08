import { icon } from "./icons.js";
const controls = new Map<HTMLSelectElement, SelectControl>();
const focusScheduled = new WeakSet<HTMLFormElement>();
function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text = "",
): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag);
  result.className = className;
  result.textContent = text;
  return result;
}
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
class SelectControl {
  private readonly wrapper = node("div", "select-control");
  readonly trigger = node("button", "select-trigger");
  private readonly value = node("span", "select-value");
  private readonly popup = node("div", "select-popup");
  private readonly search = node("input", "select-search-input");
  private readonly list = node("div", "select-options");
  private readonly error = node("p", "form-error field-error");
  private readonly name: string;
  private active = 0;
  private matches: HTMLOptionElement[] = [];
  private opened = false;
  constructor(private readonly select: HTMLSelectElement) {
    const label = select.labels?.item(0);
    const name =
      select.dataset.label ??
      label?.textContent?.trim() ??
      "Seleccionar opción";
    this.name = name;
    this.trigger.id = `${select.id}-control`;
    this.error.id = `${select.id}-error`;
    this.error.setAttribute("role", "alert");
    this.error.hidden = true;
    this.trigger.type = "button";
    this.trigger.setAttribute("role", "combobox");
    this.trigger.setAttribute("aria-label", name);
    this.trigger.setAttribute("aria-haspopup", "listbox");
    this.trigger.setAttribute("aria-expanded", "false");
    this.value.id = `${select.id}-value`;
    this.trigger.setAttribute("aria-describedby", this.value.id);
    this.list.id = `${select.id}-list`;
    this.list.setAttribute("role", "listbox");
    this.list.setAttribute("aria-label", name);
    this.trigger.setAttribute("aria-controls", this.list.id);
    this.popup.hidden = true;
    const searchRow = node("div", "select-search");
    this.search.type = "search";
    this.search.placeholder = "Buscar…";
    this.search.autocomplete = "off";
    this.search.setAttribute("aria-label", `Buscar ${name.toLowerCase()}`);
    this.search.setAttribute("aria-controls", this.list.id);
    searchRow.append(icon("search"), this.search);
    this.popup.append(searchRow, this.list);
    this.trigger.append(this.value, icon("chevron"));
    select.before(this.wrapper);
    this.wrapper.append(select, this.trigger, this.popup, this.error);
    select.classList.add("native-select");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");
    if (label) label.htmlFor = this.trigger.id;
    this.trigger.addEventListener("click", () =>
      this.opened ? this.close() : this.open(),
    );
    this.trigger.addEventListener("keydown", (event) => {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        this.open();
      }
    });
    this.search.addEventListener("input", () => {
      this.active = 0;
      this.render();
    });
    this.popup.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        this.close(true);
      }
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        if (!this.matches.length) return;
        this.active =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? this.matches.length - 1
              : (this.active +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  this.matches.length) %
                this.matches.length;
        this.highlight();
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const selected = this.matches[this.active];
        if (selected) this.choose(selected);
      }
      if (event.key === "Tab") this.close();
    });
    select.addEventListener("change", () => this.sync());
    select.addEventListener("invalid", (event) => {
      event.preventDefault();
      this.showError();
      this.focusFirstInvalid();
    });
    document.addEventListener("pointerdown", (event) => {
      if (event.target instanceof Node && !this.wrapper.contains(event.target))
        this.close();
    });
    window.addEventListener("resize", () => {
      if (this.opened) this.position();
    });
    this.sync();
  }
  // Mensaje visible y asociado al control cuando falta una opción requerida.
  private showError(): void {
    this.error.textContent = `Selecciona una opción en «${this.name}».`;
    this.error.hidden = false;
    this.trigger.setAttribute("aria-invalid", "true");
    this.trigger.setAttribute(
      "aria-describedby",
      `${this.value.id} ${this.error.id}`,
    );
  }
  clearError(): void {
    this.error.hidden = true;
    this.error.textContent = "";
    this.trigger.removeAttribute("aria-invalid");
    this.trigger.setAttribute("aria-describedby", this.value.id);
  }
  // El navegador dispara un evento invalid por cada campo; el foco debe ir al
  // primero del formulario en orden del documento, sea un select mejorado o no.
  private focusFirstInvalid(): void {
    const form = this.select.form;
    if (!form || focusScheduled.has(form)) return;
    focusScheduled.add(form);
    setTimeout(() => {
      focusScheduled.delete(form);
      const first = form.querySelector<HTMLElement>(":invalid");
      if (first instanceof HTMLSelectElement)
        (controls.get(first)?.trigger ?? first).focus();
      else first?.focus();
    }, 0);
  }
  sync(): void {
    if (this.select.validity.valid) this.clearError();
    const selected = this.select.selectedOptions.item(0);
    this.value.textContent =
      selected?.textContent ?? "Sin opciones disponibles";
    this.trigger.disabled =
      this.select.disabled ||
      Array.from(this.select.options).every((option) => option.disabled);
    if (this.opened) this.render();
  }
  close(focus = false): void {
    this.opened = false;
    this.popup.hidden = true;
    this.trigger.setAttribute("aria-expanded", "false");
    this.trigger.removeAttribute("aria-activedescendant");
    this.search.removeAttribute("aria-activedescendant");
    if (focus) this.trigger.focus();
  }
  private open(): void {
    if (this.trigger.disabled) return;
    closeSelects();
    this.opened = true;
    this.search.value = "";
    this.active = Math.max(
      0,
      Array.from(this.select.options)
        .filter((option) => !option.disabled)
        .findIndex((option) => option.selected),
    );
    this.position();
    this.popup.hidden = false;
    this.trigger.setAttribute("aria-expanded", "true");
    this.render();
    this.search.focus();
  }
  private position(): void {
    const bounds = this.trigger.getBoundingClientRect();
    const dialog = this.select.closest("dialog");
    const frame = dialog?.getBoundingClientRect();
    const below = (frame?.bottom ?? innerHeight) - bounds.bottom - 16;
    const above = bounds.top - (frame?.top ?? 0) - 16;
    const aboveMenu = below < 240 && above > below;
    this.popup.classList.toggle("above", aboveMenu);
    this.popup.style.maxHeight = `${Math.max(130, Math.min(320, aboveMenu ? above : below))}px`;
  }
  private render(): void {
    const query = normalize(this.search.value);
    this.matches = Array.from(this.select.options).filter(
      (option) =>
        !option.disabled &&
        normalize(
          `${option.textContent} ${option.dataset.description ?? ""}`,
        ).includes(query),
    );
    this.active = Math.min(this.active, Math.max(0, this.matches.length - 1));
    const buttons = this.matches.map((option, index) => {
      const button = node("button", "select-option");
      button.type = "button";
      button.tabIndex = -1;
      button.id = `${this.select.id}-option-${index}`;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(option.selected));
      const text = node("span", "option-copy");
      text.append(node("span", "option-title", option.textContent ?? ""));
      if (option.dataset.description)
        text.append(
          node("span", "option-description", option.dataset.description),
        );
      button.append(text);
      if (option.selected) button.append(icon("check"));
      button.addEventListener("click", () => this.choose(option));
      return button;
    });
    this.list.replaceChildren(...buttons);
    if (!buttons.length)
      this.list.append(
        node(
          "div",
          "select-empty",
          "Sin coincidencias. Prueba con otro nombre.",
        ),
      );
    this.highlight(false);
  }
  private highlight(scroll = true): void {
    const buttons = this.list.querySelectorAll<HTMLElement>('[role="option"]');
    buttons.forEach((button, index) =>
      button.classList.toggle("highlighted", index === this.active),
    );
    const active = buttons.item(this.active);
    if (active) {
      this.trigger.setAttribute("aria-activedescendant", active.id);
      this.search.setAttribute("aria-activedescendant", active.id);
      if (scroll) active.scrollIntoView({ block: "nearest" });
    } else {
      this.search.removeAttribute("aria-activedescendant");
      this.trigger.removeAttribute("aria-activedescendant");
    }
  }
  private choose(option: HTMLOptionElement): void {
    this.select.value = option.value;
    this.sync();
    this.close(true);
    this.select.dispatchEvent(new Event("change", { bubbles: true }));
  }
}
export function enhanceSelects(): void {
  document.querySelectorAll<HTMLSelectElement>("select").forEach((select) => {
    if (!controls.has(select)) controls.set(select, new SelectControl(select));
  });
}
export function syncSelect(select: HTMLSelectElement): void {
  controls.get(select)?.sync();
}
export function closeSelects(): void {
  controls.forEach((control) => control.close());
}
export function clearSelectErrors(): void {
  controls.forEach((control) => control.clearError());
}
