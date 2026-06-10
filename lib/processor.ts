// Orchestrator: analyze the input, run the WASM engine, and transparently
// fall back to the native Web Audio engine if WASM is unavailable or fails.
// Everything here runs client-side; no file ever leaves the browser.

import { analyzeBuffer, decodeAudioFile, type AudioStats } from "./audio-analysis";
import {
  isWasmSupported,
  processWithFFmpeg,
  type ProgressCallback,
} from "./ffmpeg-processor";
import { processWithWebAudio } from "./webaudio-processor";

export type Engine = "wasm" | "webaudio";

export interface ProcessOutcome {
  blob: Blob;
  url: string;
  extension: string;
  mimeType: string;
  engine: Engine;
  before: AudioStats;
  after: AudioStats | null;
  outputName: string;
}

export interface ProcessHooks {
  onStage?: (stage: string) => void;
  onProgress?: ProgressCallback;
}

function baseName(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(0, dot) : filename;
}

/** Analyze + auto-process a single file, returning levels and a ready blob. */
export async function processFile(
  file: File,
  hooks: ProcessHooks = {}
): Promise<ProcessOutcome> {
  const { onStage, onProgress } = hooks;

  onStage?.("Analyzing levels");
  const inputBuffer = await decodeAudioFile(file);
  const before = analyzeBuffer(inputBuffer);

  let blob: Blob;
  let extension: string;
  let mimeType: string;
  let engine: Engine;

  if (isWasmSupported()) {
    try {
      onStage?.("Enhancing with WebAssembly engine");
      const result = await processWithFFmpeg(file, onProgress);
      blob = result.blob;
      extension = result.extension;
      mimeType = result.mimeType;
      engine = "wasm";
    } catch (err) {
      console.warn("WASM engine failed, falling back to Web Audio:", err);
      onStage?.("Enhancing with native engine (fallback)");
      const result = await processWithWebAudio(inputBuffer);
      blob = result.blob;
      extension = result.extension;
      mimeType = result.mimeType;
      engine = "webaudio";
    }
  } else {
    onStage?.("Enhancing with native engine");
    const result = await processWithWebAudio(inputBuffer);
    blob = result.blob;
    extension = result.extension;
    mimeType = result.mimeType;
    engine = "webaudio";
  }

  // Measure the result so we can show a real before/after comparison.
  onStage?.("Measuring result");
  let after: AudioStats | null = null;
  try {
    const outBuffer = await decodeAudioFile(await blob.arrayBuffer());
    after = analyzeBuffer(outBuffer);
  } catch {
    after = null;
  }

  return {
    blob,
    url: URL.createObjectURL(blob),
    extension,
    mimeType,
    engine,
    before,
    after,
    outputName: `${baseName(file.name)}-clear.${extension}`,
  };
}
