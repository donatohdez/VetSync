const paths = {
  calendar:
    "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 10h2m4 0h2m-8 4h2",
  paw: "M8 14c1-4 7-4 8 0 1 2 4 4 2 6-2 2-4-1-6-1s-4 3-6 1c-2-2 1-4 2-6ZM6 6c-2-2-4 2-2 4s4-2 2-4Zm5-3c-2-2-4 2-2 4s4-2 2-4Zm5 0c-2-2-4 2-2 4s4-2 2-4Zm4 4c-2-2-4 2-2 4s4-2 2-4Z",
  clipboard:
    "M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3M9 2h6v4H9V2Zm-1 9h8m-8 4h8m-8 4h5",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 13h4",
  chevron: "m6 9 6 6 6-6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  plus: "M12 5v14M5 12h14",
  close: "m6 6 12 12M18 6 6 18",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  check: "m5 12 4 4L19 6",
  clock: "M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  mail: "m3 5 9 7 9-7M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  user: "M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 22v-3a8 8 0 0 1 16 0v3",
  medical: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z",
  info: "M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  warning:
    "M12 8v5m0 4h.01M10 3 1 19a1 1 0 0 0 1 2h20a1 1 0 0 0 1-2L14 3a2 2 0 0 0-4 0Z",
  refresh: "M20 11a8 8 0 1 0-2 7M20 3v8h-8",
  shield: "m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4Zm-4 10 3 3 5-6",
  spinner: "M22 12a10 10 0 1 1-10-10",
} as const;
export type IconName = keyof typeof paths;
export function icon(name: IconName, className = ""): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.7");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("icon");
  if (className) svg.classList.add(className);
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", paths[name]);
  svg.append(path);
  return svg;
}
export function hydrateIcons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-icon]").forEach((node) => {
    const name = node.dataset.icon;
    if (name && name in paths) node.replaceChildren(icon(name as IconName));
    node.setAttribute("aria-hidden", "true");
  });
}
