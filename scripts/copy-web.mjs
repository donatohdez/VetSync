import { copyFile, mkdir } from "node:fs/promises";
await mkdir("dist/web", { recursive: true });
for (const file of ["index.html", "styles.css"])
  await copyFile(`src/web/${file}`, `dist/web/${file}`);
