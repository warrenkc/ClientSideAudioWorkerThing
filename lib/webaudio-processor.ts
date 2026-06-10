// Fallback engine: the browser's native Web Audio API. Used when the WASM
// core can't load (no WebAssembly, blocked CDN, etc.). Renders offline through
// a vocal-tuned graph, then peak-normalizes and encodes to WAV.

import { audioBufferToWav } from "./wav-encoder";

export interface WebAudioResult {
  blob: Blob;
  extension: "wav";
  mimeType: string;
}

const TARGET_PEAK = 0.89; // ≈ -1 dBFS of headroom after normalization

/**
 * Process an already-decoded buffer:
 *  highpass 80 Hz → dynamics compressor → makeup gain, rendered offline,
 *  then the result is peak-normalized so speech lands loud and consistent.
 */
export async function processWithWebAudio(
  buffer: AudioBuffer
): Promise<WebAudioResult> {
  const OfflineCtx =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;

  const ctx = new OfflineCtx(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Remove low rumble that wastes headroom and muddies speech.
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 80;

  // Even out level swings so quiet passages stay intelligible without
  // letting loud ones distort.
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 30;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.25;

  // A little makeup gain before the final normalization pass.
  const makeup = ctx.createGain();
  makeup.gain.value = 1.5;

  source.connect(highpass);
  highpass.connect(compressor);
  compressor.connect(makeup);
  makeup.connect(ctx.destination);

  source.start(0);
  const rendered = await ctx.startRendering();

  // Peak-normalize the rendered audio to a consistent loud target.
  let peak = 0;
  for (let ch = 0; ch < rendered.numberOfChannels; ch++) {
    const data = rendered.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i]);
      if (a > peak) peak = a;
    }
  }
  if (peak > 0) {
    const gain = TARGET_PEAK / peak;
    for (let ch = 0; ch < rendered.numberOfChannels; ch++) {
      const data = rendered.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.max(-1, Math.min(1, data[i] * gain));
      }
    }
  }

  return {
    blob: audioBufferToWav(rendered),
    extension: "wav",
    mimeType: "audio/wav",
  };
}
