import { cpSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Runs the production build the same way the container does.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const standalone = join(root, ".next", "standalone");
const server = join(standalone, "server.js");

if (!existsSync(server)) {
  console.error("Спершу зберіть застосунок: npm run build");
  process.exit(1);
}

cpSync(join(root, "public"), join(standalone, "public"), { recursive: true });
cpSync(join(root, ".next", "static"), join(standalone, ".next", "static"), { recursive: true });

spawn(process.execPath, [server], { stdio: "inherit", cwd: standalone }).on("exit", (code) => process.exit(code ?? 0));
