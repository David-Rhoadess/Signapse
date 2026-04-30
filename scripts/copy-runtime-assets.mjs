// Copies/downloads runtime assets needed by sign-language-recognition into
// public/ so Vite serves them at /wasm/* and /tasks/*. Runs automatically on
// `npm install` via the "postinstall" script in package.json.
//
// Sources:
//   node_modules/@mediapipe/tasks-vision/wasm -> public/wasm
//   downloads the .task model files into public/tasks
//
// These directories are gitignored; this script is the source of truth.

import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createWriteStream } from "node:fs";
import https from "node:https";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const copies = [
  {
    from: resolve(root, "node_modules/@mediapipe/tasks-vision/wasm"),
    to: resolve(root, "public/wasm"),
    label: "MediaPipe vision WASM runtime",
  },
];

function downloadFile(url, destPath) {
  return new Promise((resolvePromise, rejectPromise) => {
    const request = https.get(
      url,
      {
        headers: {
          "user-agent": "AcornSL copy-runtime-assets",
        },
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume();
          resolvePromise(downloadFile(res.headers.location, destPath));
          return;
        }

        if (res.statusCode !== 200) {
          res.resume();
          rejectPromise(
            new Error(
              `Failed to download ${url}: HTTP ${res.statusCode ?? "unknown"}`,
            ),
          );
          return;
        }

        const fileStream = createWriteStream(destPath);
        res.pipe(fileStream);
        fileStream.on("finish", () => fileStream.close(() => resolvePromise()));
        fileStream.on("error", rejectPromise);
      },
    );

    request.on("error", rejectPromise);
  });
}

async function ensureTaskFiles() {
  const tasksDir = resolve(root, "public/tasks");
  const want = [
    {
      filename: "hand_landmarker.task",
      url:
        process.env.ACORNSL_HAND_TASK_URL ??
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
    },
    {
      filename: "pose_landmarker_lite.task",
      url:
        process.env.ACORNSL_POSE_TASK_URL ??
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
    },
  ];

  mkdirSync(tasksDir, { recursive: true });

  let downloadedAny = false;
  for (const { filename, url } of want) {
    const dest = resolve(tasksDir, filename);
    if (existsSync(dest)) continue;
    console.log(`[copy-runtime-assets] Downloading ${filename}...`);
    await downloadFile(url, dest);
    downloadedAny = true;
    console.log(`[copy-runtime-assets] Downloaded ${filename} -> ${dest}`);
  }

  if (!downloadedAny) {
    console.log("[copy-runtime-assets] Task files already present.");
  }
}

const warnings = [];

for (const { from, to, label } of copies) {
  if (!existsSync(from)) {
    warnings.push(
      `[copy-runtime-assets] Skipping ${label}: source not found at ${from}.`,
    );
    continue;
  }
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
  console.log(`[copy-runtime-assets] ${label} -> ${to}`);
}

// Fetch the .task files from the official MediaPipe model hosting (the
// sign-language-recognition package intentionally does not bundle them).
if (!existsSync(resolve(root, "public/tasks/hand_landmarker.task"))) {
  try {
    console.log("[copy-runtime-assets] Ensuring .task model files in public/tasks...");
    await ensureTaskFiles();
  } catch (err) {
    console.warn(
      "[copy-runtime-assets] Failed to ensure .task files. " +
        "You can provide ACORNSL_HAND_TASK_URL and ACORNSL_POSE_TASK_URL to override.",
      err,
    );
    process.exitCode = 1;
  }
}

for (const w of warnings) console.warn(w);
