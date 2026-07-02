import { useState } from 'react';
import {
  buildCSV, buildArtlistSheet, buildMusicbedSheet, downloadText,
} from '../lib/exportFormats.js';

function Sheet({ title, text }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — user can select manually */
    }
  };

  return (
    <div className="sheet">
      <div className="sheet-head">
        <span className="sheet-title">{title}</span>
        <button className="copy-btn" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre>{text}</pre>
    </div>
  );
}

export default function ExportPanel({ meta }) {
  const csv = buildCSV(meta);
  const safeName = (meta.title || 'track').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <div>
      <Sheet title="Artlist submission sheet" text={buildArtlistSheet(meta)} />
      <Sheet title="Musicbed submission sheet" text={buildMusicbedSheet(meta)} />
      <div className="actions">
        <button
          className="btn"
          onClick={() => downloadText(`${safeName}-metadata.csv`, csv, 'text/csv')}
        >
          Download CSV
        </button>
        <span className="module-hint">
          One row per track — build a catalog spreadsheet as you go.
        </span>
      </div>
    </div>
  );
}
