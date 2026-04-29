import {
  createLandmarker,
  createClassificationWorker,
  createRecognizeHandler,
  onClassificationResult,
  updateDb,
  SignMap,
  isValidDatabaseFile,
  isDatabaseVersionCompatible,
  DB_VERSION,
} from "sign-language-recognition";
import type {
  Sign,
  ClassificationResult,
  MappingDatabaseFile,
} from "sign-language-recognition";

export type RecognizedListener = (result: ClassificationResult) => void;

export interface SignRecognitionService {
  attach(video: HTMLVideoElement, canvas: HTMLCanvasElement): void;
  subscribe(listener: RecognizedListener): () => void;
  addSign(word: string, sign: Sign): void;
  exportDatabase(): MappingDatabaseFile;
}

let instancePromise: Promise<SignRecognitionService> | null = null;

async function loadDatabase(): Promise<SignMap> {
  try {
    const response = await fetch("/MappingDatabase.json");
    if (!response.ok) return new SignMap();

    const data: unknown = await response.json();
    if (isValidDatabaseFile(data) && isDatabaseVersionCompatible(data)) {
      return new SignMap(data.mappings);
    }
    if (isValidDatabaseFile(data)) {
      console.warn(
        `MappingDatabase.json version "${data.version}" is incompatible with library version "${DB_VERSION}". Starting with an empty database.`,
      );
    }
    return new SignMap();
  } catch (err) {
    console.warn(
      "Failed to load MappingDatabase.json — starting with an empty database.",
      err,
    );
    return new SignMap();
  }
}

async function init(): Promise<SignRecognitionService> {
  const signDb = await loadDatabase();

  const landmarker = await createLandmarker({
    wasmPath: "/wasm",
    handTaskPath: "/tasks/hand_landmarker.task",
    poseTaskPath: "/tasks/pose_landmarker_lite.task",
  });

  const worker = createClassificationWorker(
    new URL("sign-language-recognition/worker", import.meta.url),
    signDb.map,
  );

  // The library implements onClassificationResult via `worker.onmessage = ...`,
  // which means a second subscriber would clobber the first. Register a single
  // internal listener and fan results out to all callers.
  const listeners = new Set<RecognizedListener>();
  onClassificationResult(worker, (result) => {
    for (const listener of listeners) listener(result);
  });

  let attached = false;

  return {
    attach(video, canvas) {
      if (attached) return;
      attached = true;
      const recognize = createRecognizeHandler(worker);
      landmarker.watchWebcam(video, canvas, (sign) => {
        recognize(sign);
      });
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    addSign(word, sign) {
      signDb.addSignToMap({ vectors: sign.vectors, word });
      updateDb(worker, signDb.map);
    },

    exportDatabase() {
      return { version: DB_VERSION, mappings: signDb.map };
    },
  };
}

export function getSignRecognition(): Promise<SignRecognitionService> {
  instancePromise ??= init();
  return instancePromise;
}
