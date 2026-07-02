import { useState } from 'react';

const INSTRUMENTS = [
  'Piano', 'Acoustic Guitar', 'Electric Guitar', 'Bass', 'Drums', 'Percussion',
  'Synth', 'Strings', 'Brass', 'Woodwinds', 'Pads', 'Organ', 'Bells',
  'Ukulele', 'Banjo', 'Mandolin', 'Harp', 'Whistling', 'Claps & Snaps', 'Sound FX',
];

const VOCAL_OPTIONS = [
  'Instrumental', 'Female Vocals', 'Male Vocals', 'Male & Female Vocals', 'Vocal Textures (oohs & ahs)',
];

const GENRES = [
  'Cinematic', 'Indie Pop', 'Folk', 'Acoustic', 'Hip Hop', 'Lo-fi', 'Electronic',
  'House', 'Ambient', 'Rock', 'Corporate', 'Jazz', 'Classical', 'R&B', 'Country', 'World',
];

export default function SourceForm({ source, onChange }) {
  const [customInstrument, setCustomInstrument] = useState('');

  const set = (patch) => onChange({ ...source, ...patch });

  const toggleInstrument = (name) => {
    const has = source.instruments.includes(name);
    set({
      instruments: has
        ? source.instruments.filter((i) => i !== name)
        : [...source.instruments, name],
    });
  };

  const addCustom = () => {
    const name = customInstrument.trim();
    if (!name) return;
    if (!source.instruments.includes(name)) {
      set({ instruments: [...source.instruments, name] });
    }
    setCustomInstrument('');
  };

  const customOnes = source.instruments.filter((i) => !INSTRUMENTS.includes(i));

  return (
    <div className="field-grid">
      <div className="field">
        <label htmlFor="title">Track title</label>
        <input
          id="title"
          value={source.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Morning Light"
        />
      </div>

      <div className="field">
        <label htmlFor="artist">Artist name</label>
        <input
          id="artist"
          value={source.artist}
          onChange={(e) => set({ artist: e.target.value })}
          placeholder="Your artist name"
        />
      </div>

      <div className="field">
        <label htmlFor="genre">Genre</label>
        <input
          id="genre"
          list="genre-list"
          value={source.genre}
          onChange={(e) => set({ genre: e.target.value })}
          placeholder="Cinematic"
        />
        <datalist id="genre-list">
          {GENRES.map((g) => <option key={g} value={g} />)}
        </datalist>
      </div>

      <div className="field">
        <label htmlFor="vocals">Vocals</label>
        <select
          id="vocals"
          value={source.vocals}
          onChange={(e) => set({ vocals: e.target.value })}
        >
          {VOCAL_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div className="field full">
        <label>Instruments in the track</label>
        <div className="chip-row">
          {INSTRUMENTS.map((name) => (
            <button
              key={name}
              type="button"
              className={
                'chip-toggle' + (source.instruments.includes(name) ? ' active' : '')
              }
              onClick={() => toggleInstrument(name)}
            >
              {name}
            </button>
          ))}
          {customOnes.map((name) => (
            <button
              key={name}
              type="button"
              className="chip-toggle active"
              onClick={() => toggleInstrument(name)}
            >
              {name} ×
            </button>
          ))}
          <input
            className="chip-add"
            value={customInstrument}
            placeholder="+ add other"
            onChange={(e) => setCustomInstrument(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
            onBlur={addCustom}
          />
        </div>
      </div>

      <div className="field full">
        <label htmlFor="vibe">Describe the vibe in your own words</label>
        <textarea
          id="vibe"
          value={source.vibe}
          onChange={(e) => set({ vibe: e.target.value })}
          placeholder="e.g. Warm fingerpicked guitar builds into a hopeful, driving second half. Feels like a road trip at sunrise."
        />
      </div>
    </div>
  );
}
