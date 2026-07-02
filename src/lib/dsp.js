// dsp.js — pure DSP utilities. No browser APIs, so everything here
// can be unit-tested in Node (see scripts/test-dsp.mjs).

export const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Krumhansl-Schmuckler key profiles
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/** Mix an array of Float32Array channels down to one mono Float32Array. */
export function mixToMono(channels) {
  if (channels.length === 1) return channels[0];
  const n = channels[0].length;
  const out = new Float32Array(n);
  for (let c = 0; c < channels.length; c++) {
    const ch = channels[c];
    for (let i = 0; i < n; i++) out[i] += ch[i];
  }
  const inv = 1 / channels.length;
  for (let i = 0; i < n; i++) out[i] *= inv;
  return out;
}

/** RBJ cookbook biquad low-pass filter. Returns a new Float32Array. */
export function biquadLowpass(input, sampleRate, cutoff = 150, Q = 0.707) {
  const w0 = (2 * Math.PI * cutoff) / sampleRate;
  const alpha = Math.sin(w0) / (2 * Q);
  const cosw0 = Math.cos(w0);
  const b0 = (1 - cosw0) / 2;
  const b1 = 1 - cosw0;
  const b2 = (1 - cosw0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;

  const out = new Float32Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x0 = input[i];
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    out[i] = y0;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;
  }
  return out;
}

/** Overall RMS level in dBFS. */
export function rmsDb(channel) {
  let sum = 0;
  for (let i = 0; i < channel.length; i++) sum += channel[i] * channel[i];
  const rms = Math.sqrt(sum / channel.length);
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
}

/** Map an RMS dBFS reading to a coarse energy label. */
export function energyLabel(db) {
  if (db > -14) return 'High';
  if (db > -22) return 'Medium';
  return 'Low';
}

/**
 * Tempo detection.
 * Expects a (preferably low-pass filtered) mono channel.
 * Returns { bpm, confidence } or null if no stable pulse was found.
 */
export function detectBPM(channel, sampleRate, { maxSeconds = 90 } = {}) {
  const maxSamples = Math.min(channel.length, Math.floor(maxSeconds * sampleRate));
  const CHUNK = 512;
  const nChunks = Math.floor(maxSamples / CHUNK);
  if (nChunks < 32) return null;

  // Envelope: max |x| per chunk, lightly smoothed.
  const env = new Float32Array(nChunks);
  for (let c = 0; c < nChunks; c++) {
    let m = 0;
    const base = c * CHUNK;
    for (let i = 0; i < CHUNK; i++) {
      const v = Math.abs(channel[base + i]);
      if (v > m) m = v;
    }
    env[c] = m;
  }
  const smooth = new Float32Array(nChunks);
  for (let i = 0; i < nChunks; i++) {
    const a = env[Math.max(0, i - 1)];
    const b = env[i];
    const c = env[Math.min(nChunks - 1, i + 1)];
    smooth[i] = (a + b + c) / 3;
  }

  let maxEnv = 0;
  for (let i = 0; i < nChunks; i++) if (smooth[i] > maxEnv) maxEnv = smooth[i];
  if (maxEnv <= 0) return null;

  const chunkDur = CHUNK / sampleRate;
  const minGapChunks = Math.max(1, Math.round((60 / 190) / chunkDur)); // no peaks closer than 190 BPM apart
  const durationSec = nChunks * chunkDur;
  const targetPeaks = Math.max(8, Math.floor(durationSec * 0.9));

  let peaks = [];
  for (let t = 0.9; t >= 0.28; t -= 0.05) {
    const thr = maxEnv * t;
    peaks = [];
    let last = -minGapChunks;
    for (let i = 1; i < nChunks - 1; i++) {
      if (smooth[i] >= thr && smooth[i] >= smooth[i - 1] && smooth[i] >= smooth[i + 1]) {
        if (i - last >= minGapChunks) {
          peaks.push(i);
          last = i;
        }
      }
    }
    if (peaks.length >= targetPeaks) break;
  }
  if (peaks.length < 6) return null;

  // Intervals -> candidate BPMs, folded into [70, 180).
  const candidates = [];
  for (let i = 1; i < peaks.length; i++) {
    const dt = (peaks[i] - peaks[i - 1]) * chunkDur;
    if (dt <= 0) continue;
    let bpm = 60 / dt;
    while (bpm < 70) bpm *= 2;
    while (bpm >= 180) bpm /= 2;
    if (bpm >= 70 && bpm < 180) candidates.push(bpm);
  }
  if (candidates.length < 5) return null;

  // Score each candidate by how many others sit within 3.5% of it.
  let best = null;
  let bestCount = 0;
  for (const c of candidates) {
    let count = 0;
    for (const o of candidates) {
      if (Math.abs(o - c) / c < 0.035) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      best = c;
    }
  }
  if (!best || bestCount < candidates.length * 0.3) {
    return null;
  }

  // Refine: median of matching intervals.
  const matching = candidates.filter((o) => Math.abs(o - best) / best < 0.035).sort((a, b) => a - b);
  const median = matching[Math.floor(matching.length / 2)];

  return {
    bpm: Math.round(median),
    confidence: Math.min(1, bestCount / candidates.length),
  };
}

/** Iterative radix-2 FFT. `re` length must be a power of two; `im` is zeroed in place. */
function fftInPlace(re, im) {
  const n = re.length;
  // Bit reversal
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k];
        const uIm = im[i + k];
        const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + len / 2] = uRe - vRe;
        im[i + k + len / 2] = uIm - vIm;
        const nRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nRe;
      }
    }
  }
}

/**
 * 12-bin chromagram accumulated across FFT frames.
 * Returns a normalized Float32Array(12), index 0 = C.
 */
export function computeChromagram(
  channel,
  sampleRate,
  { frameSize = 4096, hop = 16384, maxSeconds = 60 } = {}
) {
  const chroma = new Float32Array(12);
  const maxSamples = Math.min(channel.length, Math.floor(maxSeconds * sampleRate));
  if (maxSamples < frameSize) return chroma;

  const window = new Float32Array(frameSize);
  for (let i = 0; i < frameSize; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frameSize - 1))); // Hann
  }

  const re = new Float32Array(frameSize);
  const im = new Float32Array(frameSize);
  const binHz = sampleRate / frameSize;
  const minBin = Math.max(1, Math.floor(60 / binHz));
  const maxBin = Math.min(frameSize / 2 - 1, Math.ceil(2200 / binHz));

  for (let start = 0; start + frameSize <= maxSamples; start += hop) {
    for (let i = 0; i < frameSize; i++) {
      re[i] = channel[start + i] * window[i];
      im[i] = 0;
    }
    fftInPlace(re, im);
    for (let b = minBin; b <= maxBin; b++) {
      const mag = Math.sqrt(re[b] * re[b] + im[b] * im[b]);
      if (mag <= 0) continue;
      const freq = b * binHz;
      const midi = 69 + 12 * Math.log2(freq / 440);
      const pc = ((Math.round(midi) % 12) + 12) % 12;
      chroma[pc] += mag;
    }
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) sum += chroma[i];
  if (sum > 0) for (let i = 0; i < 12; i++) chroma[i] /= sum;
  return chroma;
}

function pearson(a, b) {
  const n = a.length;
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den > 0 ? num / den : 0;
}

/**
 * Estimate musical key from a chromagram using Krumhansl-Schmuckler profiles.
 * Returns { key: 'A', mode: 'Major', confidence } or null.
 */
export function detectKey(chroma) {
  let total = 0;
  for (let i = 0; i < 12; i++) total += chroma[i];
  if (total <= 0) return null;

  let best = null;
  const rotated = new Float32Array(12);
  for (let tonic = 0; tonic < 12; tonic++) {
    for (let i = 0; i < 12; i++) rotated[i] = chroma[(tonic + i) % 12];
    const scoreMajor = pearson(rotated, MAJOR_PROFILE);
    const scoreMinor = pearson(rotated, MINOR_PROFILE);
    if (!best || scoreMajor > best.score) {
      best = { key: PITCH_CLASSES[tonic], mode: 'Major', score: scoreMajor };
    }
    if (scoreMinor > best.score) {
      best = { key: PITCH_CLASSES[tonic], mode: 'Minor', score: scoreMinor };
    }
  }
  if (!best || best.score < 0.35) return null;
  return { key: best.key, mode: best.mode, confidence: best.score };
}

/**
 * Waveform peaks for drawing: `columns` pairs of [min, max] over the channel.
 */
export function waveformPeaks(channel, columns = 1000) {
  const out = new Float32Array(columns * 2);
  const step = channel.length / columns;
  for (let c = 0; c < columns; c++) {
    const start = Math.floor(c * step);
    const end = Math.min(channel.length, Math.floor((c + 1) * step));
    let lo = 0, hi = 0;
    for (let i = start; i < end; i++) {
      const v = channel[i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    out[c * 2] = lo;
    out[c * 2 + 1] = hi;
  }
  return out;
}
