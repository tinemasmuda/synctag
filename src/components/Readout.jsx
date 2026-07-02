import { useEffect, useRef } from 'react';
import { PITCH_CLASSES } from '../lib/dsp.js';
import { formatDuration } from '../lib/audioAnalysis.js';

export default function Readout({ analysis, analyzing, onChange }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const mid = rect.height / 2;

    if (!analysis || !analysis.waveform) {
      ctx.strokeStyle = 'rgba(139, 149, 160, 0.35)';
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(rect.width, mid);
      ctx.stroke();
      return;
    }

    const peaks = analysis.waveform;
    const columns = peaks.length / 2;
    const colWidth = rect.width / columns;
    ctx.fillStyle = 'rgba(224, 168, 60, 0.85)';
    for (let c = 0; c < columns; c++) {
      const lo = peaks[c * 2];
      const hi = peaks[c * 2 + 1];
      const y1 = mid - hi * (mid - 4);
      const y2 = mid - lo * (mid - 4);
      ctx.fillRect(c * colWidth, y1, Math.max(1, colWidth * 0.7), Math.max(1, y2 - y1));
    }
  }, [analysis]);

  const set = (patch) => onChange({ ...analysis, ...patch });

  return (
    <div>
      <div className="wave-frame">
        <canvas ref={canvasRef} />
        {analyzing && <div className="scan" />}
      </div>

      {analysis && (
        <>
          <div className="readout-grid">
            <div className="window">
              <input
                type="number"
                min="30"
                max="300"
                value={analysis.bpm ?? ''}
                placeholder="—"
                aria-label="BPM"
                onChange={(e) => set({ bpm: e.target.value ? Number(e.target.value) : null })}
              />
              <div className="window-label">BPM</div>
            </div>

            <div className="window">
              <div className="key-pair">
                <select
                  value={analysis.key ?? ''}
                  aria-label="Key"
                  onChange={(e) => set({ key: e.target.value || null })}
                >
                  <option value="">—</option>
                  {PITCH_CLASSES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <select
                  value={analysis.mode ?? ''}
                  aria-label="Mode"
                  onChange={(e) => set({ mode: e.target.value || null })}
                >
                  <option value="">—</option>
                  <option value="Major">Maj</option>
                  <option value="Minor">Min</option>
                </select>
              </div>
              <div className="window-label">Key</div>
            </div>

            <div className="window">
              <div className="seg" role="group" aria-label="Energy">
                {['Low', 'Medium', 'High'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={analysis.energy === level ? 'active' : ''}
                    onClick={() => set({ energy: level })}
                  >
                    {level === 'Medium' ? 'Med' : level}
                  </button>
                ))}
              </div>
              <div className="window-label">Energy</div>
            </div>

            <div className="window">
              <div className="window-value">{formatDuration(analysis.duration)}</div>
              <div className="window-label">Duration</div>
            </div>
          </div>

          <p className="detected-note">
            Detected values are estimates — half/double-time tempos are a known ambiguity.
            Click any value to correct it; you know your track best.
          </p>
        </>
      )}
    </div>
  );
}
