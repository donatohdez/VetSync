// Normaliza al español los mensajes de validación (zod) y de red que llegan a
// la interfaz. Es defensivo: solo traduce patrones conocidos y conserva el
// resto sin añadir detalles internos.
const fieldLabels: Record<string, string> = {
  name: "Nombre",
  email: "Correo electrónico",
  phone: "Teléfono",
  species: "Especie",
  breed: "Raza",
  birthDate: "Fecha de nacimiento",
  ownerId: "Dueño",
  petId: "Mascota",
  veterinarianId: "Veterinario",
  startsAt: "Inicio de la cita",
  endsAt: "Fin de la cita",
  reason: "Motivo",
  recordedAt: "Fecha de la atención",
  clinicalNote: "Nota clínica",
  datos: "Datos",
};
export const networkMessage =
  "No se pudo conectar con VetSync. Revisa tu conexión e inténtalo de nuevo.";
export const genericMessage = "No se pudo completar la solicitud.";
function translateIssue(message: string): string | undefined {
  const text = message.trim();
  if (/^Invalid email address$/i.test(text)) return "no es un correo válido.";
  const small = /^Too small: expected string to have >=(\d+) characters?$/.exec(
    text,
  );
  if (small)
    return small[1] === "1"
      ? "es obligatorio."
      : `debe tener al menos ${small[1]} caracteres.`;
  const big = /^Too big: expected string to have <=(\d+) characters?$/.exec(
    text,
  );
  if (big) return `no puede superar ${big[1]} caracteres.`;
  const received = /^Invalid input: expected \w+, received (\w+)$/.exec(text);
  if (received)
    return received[1] === "undefined" ? "es obligatorio." : "no es válido.";
  if (/^Invalid ISO (date|datetime|time)/i.test(text))
    return "no es una fecha u hora válida.";
  if (/^Invalid option/i.test(text)) return "no es una opción válida.";
  if (/^Unrecognized keys?:/i.test(text))
    return "contiene un campo que no se esperaba.";
  if (/^Invalid input$/i.test(text) || /^Invalid\b/i.test(text))
    return "no es válido.";
  return undefined;
}
export function localizeServerMessage(message: string): string {
  let changed = false;
  const parts = message.split("; ").map((part) => {
    const match = /^([A-Za-z0-9_.]+): (.+)$/.exec(part);
    const translated = translateIssue(match ? (match[2] ?? "") : part);
    if (!translated) return part;
    changed = true;
    if (!match) return `Dato ${translated}`;
    const key = (match[1] ?? "").split(".").pop() ?? "";
    return `${fieldLabels[key] ?? "Dato"} ${translated}`;
  });
  if (!changed) return message;
  return parts
    .map((part) => (/[.!?]$/.test(part) ? part : `${part}.`))
    .join(" ");
}
export function isNetworkFailure(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof Error &&
      /failed to fetch|networkerror|load failed|network request failed/i.test(
        error.message,
      ))
  );
}
