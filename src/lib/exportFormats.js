// exportFormats.js — builds the deliverables: a universal CSV row and
// copy-paste submission sheets shaped around the fields Artlist- and
// Musicbed-style libraries ask for in their artist portals.

function tempoWord(bpm) {
  if (!bpm) return '';
  if (bpm < 90) return 'Slow';
  if (bpm <= 120) return 'Mid';
  return 'Fast';
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function buildCSV(meta) {
  const headers = [
    'Title', 'Artist', 'Duration', 'BPM', 'Tempo', 'Key', 'Energy', 'Genre',
    'Vocals', 'Instruments', 'Moods', 'Use Cases', 'Keywords', 'Description',
  ];
  const row = [
    meta.title, meta.artist, meta.durationLabel, meta.bpm,
    tempoWord(meta.bpm), meta.keyLabel, meta.energy, meta.genre,
    meta.vocals, meta.instruments.join('; '), meta.moods.join('; '),
    meta.useCases.join('; '), meta.keywords.join('; '), meta.description,
  ];
  return headers.map(csvEscape).join(',') + '\n' + row.map(csvEscape).join(',') + '\n';
}

export function buildArtlistSheet(meta) {
  return [
    `TITLE: ${meta.title}`,
    `ARTIST: ${meta.artist}`,
    `GENRE: ${meta.genre}`,
    `MOODS: ${meta.moods.join(', ')}`,
    `VIDEO THEMES: ${meta.useCases.join(', ')}`,
    `INSTRUMENTS: ${meta.instruments.join(', ')}`,
    `VOCALS: ${meta.vocals}`,
    `TEMPO: ${meta.bpm ? `${meta.bpm} BPM (${tempoWord(meta.bpm)})` : ''}`,
    `KEY: ${meta.keyLabel}`,
    `DURATION: ${meta.durationLabel}`,
    `DESCRIPTION: ${meta.description}`,
    `KEYWORDS: ${meta.keywords.join(', ')}`,
  ].join('\n');
}

export function buildMusicbedSheet(meta) {
  return [
    `TITLE: ${meta.title}`,
    `ARTIST: ${meta.artist}`,
    `GENRE: ${meta.genre}`,
    `CHARACTERISTICS: ${meta.moods.join(', ')}`,
    `INSTRUMENTATION: ${meta.instruments.join(', ')}`,
    `VOCALS: ${meta.vocals}`,
    `ENERGY: ${meta.energy}`,
    `TEMPO: ${meta.bpm ? `${meta.bpm} BPM (${tempoWord(meta.bpm)})` : ''}`,
    `KEY: ${meta.keyLabel}`,
    `DURATION: ${meta.durationLabel}`,
    `BEST FOR: ${meta.useCases.join(', ')}`,
    `DESCRIPTION: ${meta.description}`,
    `KEYWORDS: ${meta.keywords.join(', ')}`,
  ].join('\n');
}

export function downloadText(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
