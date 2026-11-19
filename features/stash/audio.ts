"use client";

/**
 * Everything Pause makes is synthesized on the fly with Web Audio — no audio
 * files, no network, no AI. Starts only from user gestures; stopping always
 * fades rather than cuts, so nothing clicks.
 */

export type BrainwaveBand = "delta" | "theta" | "alpha" | "beta";
export type NoiseType = "brown" | "pink" | "white";

const BEAT: Record<BrainwaveBand, number> = {
  delta: 2,
  theta: 6,
  alpha: 10,
  beta: 20,
};
const CARRIER_HZ = 200;
const MAX_GAIN = { brainwave: 0.4, noise: 0.6, drone: 0.5 } as const;

function makeNoiseBuffer(ctx: AudioContext, type: NoiseType): AudioBuffer {
  const size = Math.floor(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === "white") {
    for (let i = 0; i < size; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
  if (type === "brown") {
    let last = 0;
    for (let i = 0; i < size; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    return buffer;
  }
  // Pink — Paul Kellet's filtered approximation.
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < size; i += 1) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

type Running = {
  gain: GainNode;
  nodes: AudioNode[];
};

class PauseAudioEngine {
  private ctx: AudioContext | null = null;
  private brainwave: Running | null = null;
  private noise: (Running & { type: NoiseType }) | null = null;
  private drone: Running | null = null;

  private ensure(): AudioContext {
    this.ctx ??= new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private fadeIn(gain: GainNode, target: number): void {
    if (!this.ctx) return;
    gain.gain.cancelScheduledValues(this.ctx.currentTime);
    gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.3);
  }

  private fadeOut(running: Running | null): void {
    if (running && this.ctx) {
      const { gain, nodes } = running;
      gain.gain.cancelScheduledValues(this.ctx.currentTime);
      gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
      window.setTimeout(() => {
        for (const node of nodes) {
          try {
            (node as OscillatorNode).stop?.();
          } catch {
            // already stopped
          }
          node.disconnect();
        }
        gain.disconnect();
      }, 500);
    }
  }

  rideBrainwave(volume: number): void {
    if (this.ctx && this.brainwave) {
      this.brainwave.gain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.brainwave.gain.gain.setTargetAtTime(
        (volume / 100) * MAX_GAIN.brainwave,
        this.ctx.currentTime,
        0.15,
      );
    }
  }

  rideDrone(volume: number): void {
    if (this.ctx && this.drone) {
      this.drone.gain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.drone.gain.gain.setTargetAtTime(
        (volume / 100) * MAX_GAIN.drone,
        this.ctx.currentTime,
        0.15,
      );
    }
  }

  setBrainwave(next: {
    on: boolean;
    band: BrainwaveBand;
    isochronic: boolean;
    volume: number;
  }): void {
    const ctx = this.ensure();
    this.fadeOut(this.brainwave);
    this.brainwave = null;
    if (!next.on) return;

    const beat = BEAT[next.band];
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(ctx.destination);
    const nodes: AudioNode[] = [out];

    if (next.isochronic) {
      // Single tone pulsed at the beat frequency — works on speakers.
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = CARRIER_HZ;
      const pulse = ctx.createGain();
      pulse.gain.value = 0.5;
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = beat;
      const depth = ctx.createGain();
      depth.gain.value = 0.5;
      lfo.connect(depth);
      depth.connect(pulse.gain);
      osc.connect(pulse);
      pulse.connect(out);
      osc.start();
      lfo.start();
      nodes.push(osc, lfo, pulse, depth);
    } else {
      // Binaural — two carriers, one per ear. Headphones required.
      const merger = ctx.createChannelMerger(2);
      const left = ctx.createOscillator();
      left.type = "sine";
      left.frequency.value = CARRIER_HZ;
      const right = ctx.createOscillator();
      right.type = "sine";
      right.frequency.value = CARRIER_HZ + beat;
      left.connect(merger, 0, 0);
      right.connect(merger, 0, 1);
      merger.connect(out);
      left.start();
      right.start();
      nodes.push(left, right, merger);
    }

    this.fadeIn(out, (next.volume / 100) * MAX_GAIN.brainwave);
    this.brainwave = { gain: out, nodes };
  }

  setNoise(next: { on: boolean; type: NoiseType; volume: number }): void {
    const ctx = this.ensure();
    if (this.noise?.type === next.type) {
      // Same color — just ride the fader.
      if (next.on) {
        this.fadeIn(this.noise.gain, (next.volume / 100) * MAX_GAIN.noise);
      } else {
        this.fadeOut(this.noise);
        this.noise = null;
      }
      return;
    }
    this.fadeOut(this.noise);
    this.noise = null;
    if (!next.on) return;

    const source = ctx.createBufferSource();
    source.buffer = makeNoiseBuffer(ctx, next.type);
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    this.fadeIn(gain, (next.volume / 100) * MAX_GAIN.noise);
    this.noise = { gain, nodes: [source], type: next.type };
  }

  setDrone(next: { on: boolean; volume: number }): void {
    const ctx = this.ensure();
    this.fadeOut(this.drone);
    this.drone = null;
    if (!next.on) return;

    // Slow breathing pad: low root, an octave, a fifth — gently filtered.
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;
    filter.Q.value = 0.7;
    const out = ctx.createGain();
    out.gain.value = 0;
    filter.connect(out);
    out.connect(ctx.destination);

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.05;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 280;
    lfo.connect(lfoDepth);
    lfoDepth.connect(filter.frequency);
    lfo.start();

    const layers: Array<[number, number]> = [
      [55, 0.5],
      [110, 0.32],
      [164.81, 0.18],
    ];
    const oscillators = layers.map(([frequency, level]) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency;
      osc.detune.value = Math.random() * 6 - 3;
      const gain = ctx.createGain();
      gain.gain.value = level;
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      return osc;
    });

    this.fadeIn(out, (next.volume / 100) * MAX_GAIN.drone);
    this.drone = { gain: out, nodes: [...oscillators, lfo, lfoDepth, filter] };
  }

  stopAll(): void {
    this.fadeOut(this.brainwave);
    this.fadeOut(this.noise);
    this.fadeOut(this.drone);
    this.brainwave = null;
    this.noise = null;
    this.drone = null;
  }
}

export const pauseAudio = new PauseAudioEngine();
