// Lightweight loudness/level analysis used both to drive the automatic
// processing decisions and to show the user before/after numbers.
// All measurement happens in the browser on a decoded AudioBuffer.

export interface AudioStats {
  /** Sample peak in dBFS (0 = full scale). */
  peakDb: number;
  /** Integrated RMS level in dBFS — a stand-in for perceived loudness. */
  rmsDb: number;
  /** Approximate integrated loudness in LUFS (RMS-derived estimate). */
  lufs: number;
  /** Fraction of samples at/near full scale — a clipping/distortion hint. */
  clippedRatio: number;
  /** Channels and duration for display. */
  channels: number;
  sampleRate: number;
  durationSec: number;
}

const MIN_DB = -100;

function toDb(amplitude: number): number {
  if (amplitude <= 0) return MIN_DB;
  return Math.max(MIN_DB, 20 * Math.log10(amplitude));
}

/**
 * Decode an arbitrary audio file (mp3/wav/m4a/ogg/…) into a raw AudioBuffer
 * using the browser's own decoders. Throws if the format is unsupported.
 */
export async function decodeAudioFile(
  file: File | ArrayBuffer
): Promise<AudioBuffer> {
  const arrayBuffer =
    file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  // A throwaway context just for decoding. Safari needs webkit prefix.
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new Ctx();
  try {
    // decodeAudioData wants its own copy; slice to avoid detaching the source.
    return await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    void ctx.close();
  }
}

/** Measure peak, RMS, an LUFS estimate, and a clipping ratio from a buffer. */
export function analyzeBuffer(buffer: AudioBuffer): AudioStats {
  let sumSquares = 0;
  let peak = 0;
  let clipped = 0;
  let totalSamples = 0;

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const s = data[i];
      const a = Math.abs(s);
      if (a > peak) peak = a;
      if (a >= 0.999) clipped++;
      sumSquares += s * s;
    }
    totalSamples += data.length;
  }

  const rms = totalSamples > 0 ? Math.sqrt(sumSquares / totalSamples) : 0;
  const rmsDb = toDb(rms);

  // Rough LUFS estimate. True LUFS uses K-weighting + gating; for an
  // automatic gain decision the RMS level with a small correction is close
  // enough and stays fully client-side without a heavy meter implementation.
  const lufs = rmsDb - 3;

  return {
    peakDb: toDb(peak),
    rmsDb,
    lufs,
    clippedRatio: totalSamples > 0 ? clipped / totalSamples : 0,
    channels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate,
    durationSec: buffer.duration,
  };
}
