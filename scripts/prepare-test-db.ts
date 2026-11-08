import { execFileSync } from "node:child_process";
// Base exclusiva de pruebas; nunca elimina ni modifica la base de demostración.
execFileSync(
  "docker",
  [
    "compose",
    "exec",
    "-T",
    "-e",
    "MYSQL_PWD=vetsync_root_local_only",
    "mysql",
    "mysql",
    "-uroot",
    "-e",
    "CREATE DATABASE IF NOT EXISTS vetsync_test; GRANT ALL PRIVILEGES ON vetsync_test.* TO 'vetsync'@'%';",
  ],
  { stdio: "inherit" },
);
execFileSync(
  process.execPath,
  ["node_modules/tsx/dist/cli.mjs", "scripts/migrate.ts"],
  { stdio: "inherit", env: { ...process.env, DB_NAME: "vetsync_test" } },
);
