"use client";

/**
 * Offline speech-to-text via transformers.js + Whisper tiny model.
 * Runs fully in-browser — no network, no keys, no Google service.
 * First use downloads the model (~40 MB) and caches it.
 */
import { pipeline } from "@huggingface/transformers";

// Module-scope singleton — lazy, one-time load.
type AnyPipeline = (...args: unknown[]) => Promise<unknown>;

let ready: Promise<AnyPipeline> | null = null;

export function whisperPipeline(): Promise<AnyPipeline> {
  if (!ready) {
    ready = (pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny.en",
    )) as unknown as Promise<AnyPipeline>;
  }
  return ready;
}

/** Decode arbitrary browser audio blobs into 16 kHz mono Float32Array. */
export async function blobToPcm16k(blob: Blob): Promise<Float32Array> {
  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new AudioContextCtor();
  const bytes = await blob.arrayBuffer();
  const decoded = await ctx.decodeAudioData(bytes);
  await ctx.close();

  // Downmix to mono and resample to 16 kHz by linear interpolation.
  const source = decoded.getChannelData(0);
  const ratio = decoded.sampleRate / 16000;
  const outLength = Math.max(1, Math.floor(source.length / ratio));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    const src = i * ratio;
    const idx = Math.floor(src);
    const frac = src - idx;
    const a = source[idx] ?? 0;
    const b = source[idx + 1] ?? a;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

/** Transcribe recorded PCM. */
export async function transcribePcm(pcm: Float32Array): Promise<string> {
  const asr = await whisperPipeline();
  const raw = (await asr(pcm, { sampling_rate: 16000 })) as
    | { text?: string }
    | Array<{ text?: string }>;
  if (Array.isArray(raw)) {
    return raw.map((chunk) => chunk?.text ?? "").join("").trim();
  }
  return String(raw?.text ?? "").trim();
}
