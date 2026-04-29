// Copies runtime assets needed by sign-language-recognition into public/ so
// Vite serves them at /wasm/* and /tasks/*. Runs automatically on `npm install`
// via the "postinstall" script in package.json.
//
// Sources:
//   node_modules/@mediapipe/tasks-vision/wasm     -> public/wasm
//   node_modules/sign-language-recognition/demo/public/tasks -> public/tasks
//
// These directories are gitignored; this script is the source of truth.

import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const copies = [
  {
    from: resolve(root, "node_modules/@mediapipe/tasks-vision/wasm"),
    to: resolve(root, "public/wasm"),
    label: "MediaPipe vision WASM runtime",
  },
  {
    from: resolve(root, "node_modules/sign-language-recognition/demo/public/tasks"),
    to: resolve(root, "public/tasks"),
    label: "Hand & pose landmarker task files",
  },
];

for (const { from, to, label } of copies) {
  if (!existsSync(from)) {
    console.warn(
      `[copy-runtime-assets] Skipping ${label}: source not found at ${from}. ` +
        `Did the matching package install correctly?`,
    );
    continue;
  }
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
  console.log(`[copy-runtime-assets] ${label} -> ${to}`);
}
