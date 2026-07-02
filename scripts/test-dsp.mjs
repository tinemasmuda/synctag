// Verifies the DSP core with synthetic signals.
// Run: npm run test:dsp
import {
  detectBPM,
  computeChromagram,
  detectKey,
  biquadLowpass,
  rmsDb,
  energyLabel,
} from '../src/lib/dsp.js';

const SR = 44100;
let failures = 0;

function check(name, cond, detail) {
  if (cond) {
    console.log(`  OK   ${name}${detail ? ' — ' + detail : ''}`);
  } else {
    failures++;
    console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`);
  }
}

// ---- Test 1: BPM detection on a 120 BPM kick-like pulse train ----
{
  const seconds = 30;
  const n = SR * seconds;
  const signal = new Float32Array(n);
  const interval = SR * 0.5; // 120 BPM
  for (let beat = 0; beat * interval < n; beat++) {
    const start = Math.floor(beat * interval);
    // Short decaying 60 Hz burst — a crude kick drum.
    for (let i = 0; i < 2000 && start + i < n; i++) {
      signal[start + i] += Math.sin((2 * Math.PI * 60 * i) / SR) * Math.exp(-i / 500);
    }
  }
  const filtered = biquadLowpass(signal, SR, 150);
  const result = detectBPM(filtered, SR);
  check(
    'BPM ~120 on synthetic kick pattern',
    result && Math.abs(result.bpm - 120) <= 2,
    result ? `got ${result.bpm} (conf ${result.confidence.toFixed(2)})` : 'got null'
  );
}

// ---- Test 2: BPM detection at 95 BPM ----
{
  const seconds = 30;
  const n = SR * seconds;
  const signal = new Float32Array(n);
  const interval = SR * (60 / 95);
  for (let beat = 0; beat * interval < n; beat++) {
    const start = Math.floor(beat * interval);
    for (let i = 0; i < 2000 && start + i < n; i++) {
      signal[start + i] += Math.sin((2 * Math.PI * 55 * i) / SR) * Math.exp(-i / 500);
    }
  }
  const result = detectBPM(biquadLowpass(signal, SR, 150), SR);
  check(
    'BPM ~95 on synthetic kick pattern',
    result && Math.abs(result.bpm - 95) <= 2,
    result ? `got ${result.bpm}` : 'got null'
  );
}

// ---- Test 3: Key detection on an A major triad ----
{
  const seconds = 8;
  const n = SR * seconds;
  const signal = new Float32Array(n);
  const freqs = [220, 440, 554.37, 659.25, 880]; // A3, A4, C#5, E5, A5
  for (const f of freqs) {
    for (let i = 0; i < n; i++) {
      signal[i] += 0.2 * Math.sin((2 * Math.PI * f * i) / SR);
    }
  }
  const chroma = computeChromagram(signal, SR);
  const key = detectKey(chroma);
  check(
    'Key = A Major on A major triad',
    key && key.key === 'A' && key.mode === 'Major',
    key ? `got ${key.key} ${key.mode} (conf ${key.confidence.toFixed(2)})` : 'got null'
  );
}

// ---- Test 4: Key detection on a D minor triad ----
{
  const seconds = 8;
  const n = SR * seconds;
  const signal = new Float32Array(n);
  const freqs = [146.83, 293.66, 349.23, 440]; // D3, D4, F4, A4
  for (const f of freqs) {
    for (let i = 0; i < n; i++) {
      signal[i] += 0.25 * Math.sin((2 * Math.PI * f * i) / SR);
    }
  }
  const key = detectKey(computeChromagram(signal, SR));
  check(
    'Key = D Minor on D minor triad',
    key && key.key === 'D' && key.mode === 'Minor',
    key ? `got ${key.key} ${key.mode}` : 'got null'
  );
}

// ---- Test 5: Energy label sanity ----
{
  const n = SR * 3;
  const loud = new Float32Array(n);
  const quiet = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    loud[i] = 0.5 * Math.sin((2 * Math.PI * 200 * i) / SR);
    quiet[i] = 0.02 * Math.sin((2 * Math.PI * 200 * i) / SR);
  }
  check('Loud signal -> High energy', energyLabel(rmsDb(loud)) === 'High', energyLabel(rmsDb(loud)));
  check('Quiet signal -> Low energy', energyLabel(rmsDb(quiet)) === 'Low', energyLabel(rmsDb(quiet)));
}

console.log('');
if (failures > 0) {
  console.log(`${failures} test(s) failed.`);
  process.exit(1);
} else {
  console.log('All DSP tests passed.');
}
