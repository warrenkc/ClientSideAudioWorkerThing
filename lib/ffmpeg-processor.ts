// Primary engine: FFmpeg compiled to WebAssembly, running entirely in the
// browser. We use FFmpeg's broadcast-grade `loudnorm` (EBU R128) plus a
// vocal-tuned compressor + limiter so quiet, distorted speech comes out at a
// consistent, car-friendly level.

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

// Single-threaded core: no SharedArrayBuffer / COOP-COEP headers needed, and
// it loads its wasm + worker from same-origin blob URLs.
const CORE_VERSION = "0.12.6";
const BASE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

/**
 * Vocal-optimized, fully automatic chain:
 *  - highpass 80 Hz   → strip rumble / handling / HVAC noise
 *  - acompressor      → even out level swings so quiet words stay intelligible
 *  - loudnorm         → EBU R128 normalize to a loud, consistent target
 *  - alimiter         → catch peaks / tame existing distortion, no hard clip
 */
const VOCAL_FILTER =
  "highpass=f=80," +
  "acompressor=threshold=0.05:ratio=4:attack=20:release=250," +
  "loudnorm=I=-14:TP=-1.5:LRA=11," +
  "alimiter=limit=0.95";

export type ProgressCallback = (ratio: number) => void;

/** Whether this browser can run the WASM engine at all. */
export function isWasmSupported(): boolean {
  return typeof WebAssembly === "object";
}

async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const instance = new FFmpeg();
    if (onLog) {
      instance.on("log", ({ message }) => onLog(message));
    }
    await instance.load({
      coreURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${BASE_URL}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });
    ffmpeg = instance;
    return instance;
  })();

  return loadPromise;
}

/** Kick off loading the WASM core ahead of time (e.g. on first interaction). */
export function preloadFFmpeg(): void {
  void getFFmpeg().catch(() => {
    /* surfaced later when the user actually processes */
  });
}

export interface FFmpegResult {
  blob: Blob;
  extension: "mp3";
  mimeType: string;
}

/**
 * Process a file with the vocal chain and return an MP3 blob (192 kbps —
 * transparent for speech and universally car-stereo compatible).
 */
export async function processWithFFmpeg(
  file: File,
  onProgress?: ProgressCallback
): Promise<FFmpegResult> {
  const instance = await getFFmpeg();

  const progressHandler = ({ progress }: { progress: number }) => {
    if (onProgress) onProgress(Math.max(0, Math.min(1, progress)));
  };
  instance.on("progress", progressHandler);

  const inputName = "input_audio";
  const outputName = "output.mp3";

  try {
    await instance.writeFile(inputName, await fetchFile(file));
    await instance.exec([
      "-i",
      inputName,
      "-af",
      VOCAL_FILTER,
      "-c:a",
      "libmp3lame",
      "-b:a",
      "192k",
      "-ar",
      "44100",
      outputName,
    ]);

    const data = await instance.readFile(outputName);
    // data is a Uint8Array; wrap a fresh copy so the blob owns its memory.
    const bytes = data instanceof Uint8Array ? data : new Uint8Array();
    const blob = new Blob([new Uint8Array(bytes)], { type: "audio/mpeg" });

    return { blob, extension: "mp3", mimeType: "audio/mpeg" };
  } finally {
    instance.off("progress", progressHandler);
    // Best-effort cleanup of the virtual FS so repeated runs don't accumulate.
    await instance.deleteFile(inputName).catch(() => {});
    await instance.deleteFile(outputName).catch(() => {});
  }
}
