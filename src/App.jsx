import { useMemo, useRef, useState } from 'react';
import { CONFIG } from './config.js';
import { analyzeFile, formatDuration } from './lib/audioAnalysis.js';
import { getUsage, recordUse } from './lib/usage.js';
import Readout from './components/Readout.jsx';
import SourceForm from './components/SourceForm.jsx';
import TagEditor from './components/TagEditor.jsx';
import ExportPanel from './components/ExportPanel.jsx';

const EMPTY_SOURCE = {
  title: '', artist: '', genre: '', vocals: 'Instrumental', instruments: [], vibe: '',
};

function Module({ label, state, hint, children }) {
  // state: 'idle' | 'busy' | 'done'
  return (
    <section className="module">
      <div className="module-head">
        <span className={'led' + (state === 'done' ? ' on' : state === 'busy' ? ' busy' : '')} />
        <span className="module-label">{label}</span>
        {hint && <span className="module-hint">{hint}</span>}
      </div>
      <div className="module-body">{children}</div>
    </section>
  );
}

export default function App() {
  const [fileName, setFileName] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [source, setSource] = useState(EMPTY_SOURCE);
  const [tags, setTags] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [tagError, setTagError] = useState('');
  const [usage, setUsage] = useState(getUsage());
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > 60 * 1024 * 1024) {
      setAnalysisError('File is larger than 60 MB. Export a smaller MP3 or trim the track.');
      return;
    }
    setFileName(file.name);
    setAnalysis(null);
    setTags(null);
    setTagError('');
    setAnalysisError('');
    setAnalyzing(true);
    try {
      const result = await analyzeFile(file);
      setAnalysis(result);
      const guessTitle = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      setSource((s) => ({ ...s, title: s.title || guessTitle }));
    } catch (err) {
      console.error(err);
      setAnalysisError('Could not decode this file. WAV, MP3, M4A and OGG work best.');
    } finally {
      setAnalyzing(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files && e.dataTransfer.files[0]);
  };

  const generate = async () => {
    if (!analysis) return;
    setGenerating(true);
    setTagError('');
    try {
      const res = await fetch('/api/generate-tags', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          bpm: analysis.bpm,
          key: analysis.key,
          mode: analysis.mode,
          energy: analysis.energy,
          duration: formatDuration(analysis.duration),
          genre: source.genre,
          vocals: source.vocals,
          instruments: source.instruments,
          vibe: source.vibe,
          title: source.title,
        }),
      });
      const isJson = (res.headers.get('content-type') || '').includes('application/json');
      const data = isJson ? await res.json() : null;
      if (!res.ok || !data) {
        throw new Error(
          (data && data.error) ||
            'API not reachable. In local development run `npx vercel dev`; in production check the Vercel deployment.'
        );
      }
      setTags({
        moods: data.mood_tags || [],
        useCases: data.use_cases || [],
        keywords: data.keywords || [],
        description: data.description || '',
      });
      if (!usage.isPro) {
        recordUse();
        setUsage(getUsage());
      }
    } catch (err) {
      setTagError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const startManual = () => {
    setTags({ moods: [], useCases: [], keywords: [], description: '' });
    setTagError('');
  };

  const reset = () => {
    setFileName('');
    setAnalysis(null);
    setSource(EMPTY_SOURCE);
    setTags(null);
    setTagError('');
    setAnalysisError('');
    if (inputRef.current) inputRef.current.value = '';
    window.scrollTo({ top: 0 });
  };

  const meta = useMemo(() => {
    if (!analysis || !tags) return null;
    return {
      title: source.title || 'Untitled',
      artist: source.artist,
      genre: source.genre,
      vocals: source.vocals,
      instruments: source.instruments,
      bpm: analysis.bpm,
      keyLabel: analysis.key ? `${analysis.key} ${analysis.mode || ''}`.trim() : '',
      energy: analysis.energy,
      durationLabel: formatDuration(analysis.duration),
      moods: tags.moods,
      useCases: tags.useCases,
      keywords: tags.keywords,
      description: tags.description,
    };
  }, [analysis, tags, source]);

  const usageChip = usage.isPro
    ? { text: 'PRO · UNLIMITED', cls: 'pro' }
    : usage.left > 0
      ? { text: `FREE · ${usage.left}/${CONFIG.FREE_GENERATIONS_PER_MONTH} LEFT`, cls: '' }
      : { text: 'FREE · 0 LEFT', cls: 'empty' };

  return (
    <div className="shell">
      <header className="plate">
        <div className="plate-id">
          <h1 className="plate-name">{CONFIG.PRODUCT_NAME}</h1>
          <span className="plate-model">{CONFIG.MODEL_LABEL}</span>
          <p className="plate-sub">
            Sync licensing metadata for your tracks — analyzed, tagged, submission-ready.
          </p>
        </div>
        <span className={`meter-chip ${usageChip.cls}`}>{usageChip.text}</span>
      </header>

      <Module
        label="Input"
        state={analyzing ? 'busy' : analysis ? 'done' : 'idle'}
        hint="WAV · MP3 · M4A"
      >
        <div
          className={'drop' + (dragOver ? ' over' : '')}
          onClick={() => inputRef.current && inputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current && inputRef.current.click()}
        >
          <p className="drop-title">Drop your track here</p>
          <p className="drop-sub">or click to browse — the file never leaves your browser</p>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            onChange={(e) => handleFile(e.target.files && e.target.files[0])}
          />
        </div>
        {fileName && (
          <div className="file-line">
            <span className="file-name">{fileName}</span>
            {analysis && <button className="btn-quiet" onClick={reset}>tag another track</button>}
          </div>
        )}
        {analysisError && <p className="status err">{analysisError}</p>}
      </Module>

      {(analyzing || analysis) && (
        <Module
          label="Readout"
          state={analyzing ? 'busy' : analysis ? 'done' : 'idle'}
          hint={analyzing ? 'Analyzing…' : 'Click values to edit'}
        >
          <Readout analysis={analysis} analyzing={analyzing} onChange={setAnalysis} />
        </Module>
      )}

      {analysis && (
        <Module
          label="Source"
          state={source.instruments.length > 0 ? 'done' : 'idle'}
          hint="You know the track — tell the tool"
        >
          <SourceForm source={source} onChange={setSource} />
        </Module>
      )}

      {analysis && (
        <Module label="Tags" state={generating ? 'busy' : tags ? 'done' : 'idle'}>
          <TagEditor
            tags={tags}
            onTagsChange={setTags}
            onGenerate={generate}
            onManual={startManual}
            generating={generating}
            usage={usage}
            onUnlocked={() => setUsage(getUsage())}
            error={tagError}
            canGenerate={source.instruments.length > 0}
          />
        </Module>
      )}

      {meta && (
        <Module label="Export" state="done" hint="Paste into your artist portal">
          <ExportPanel meta={meta} />
        </Module>
      )}

      <footer className="foot">
        {CONFIG.PRODUCT_NAME} {CONFIG.MODEL_LABEL} — audio analysis runs locally in your browser.
      </footer>
    </div>
  );
}
