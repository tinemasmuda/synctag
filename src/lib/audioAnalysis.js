// audioAnalysis.js — browser wrapper around the pure DSP core.
import {
  mixToMono,
  biquadLowpass,
  detectBPM,
  computeChromagram,
  detectKey,
  rmsDb,
  energyLabel,
  waveformPeaks,
} from './dsp.js';

let sharedCtx = null;
function getAudioContext() {
  if (!sharedCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    sharedCtx = new Ctx();
  }
  return sharedCtx;
}

/**
 * Analyze an uploaded audio File.
 * Returns { duration, bpm, bpmConfidence, key, mode, energy, waveform }.
 * Fields that could not be detected are null — the UI lets the producer fill them in.
 */
export async function analyzeFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = getAudioContext();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  const channels = [];
  for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
    channels.push(audioBuffer.getChannelData(c));
  }
  const mono = mixToMono(channels);
  const sr = audioBuffer.sampleRate;

  const lowpassed = biquadLowpass(mono, sr, 150);
  const bpmResult = detectBPM(lowpassed, sr);

  const chroma = computeChromagram(mono, sr);
  const keyResult = detectKey(chroma);

  const db = rmsDb(mono);

  return {
    duration: audioBuffer.duration,
    bpm: bpmResult ? bpmResult.bpm : null,
    bpmConfidence: bpmResult ? bpmResult.confidence : 0,
    key: keyResult ? keyResult.key : null,
    mode: keyResult ? keyResult.mode : null,
    energy: energyLabel(db),
    waveform: waveformPeaks(mono, 1000),
  };
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
