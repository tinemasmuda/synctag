import { useState } from 'react';
import { CONFIG } from '../config.js';
import { saveLicense } from '../lib/usage.js';

function ChipGroup({ label, items, onChange, addPlaceholder }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    if (!items.includes(value)) onChange([...items, value]);
    setDraft('');
  };

  return (
    <div className="tag-group">
      <p className="tag-group-label">{label}</p>
      <div className="chip-row">
        {items.map((item) => (
          <span className="chip" key={item}>
            {item}
            <button
              type="button"
              aria-label={`Remove ${item}`}
              onClick={() => onChange(items.filter((i) => i !== item))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="chip-add"
          value={draft}
          placeholder={addPlaceholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
        />
      </div>
    </div>
  );
}

function UpgradeGate({ onUnlocked }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const verify = async () => {
    if (!key.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/verify-license', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ licenseKey: key.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.valid) {
        saveLicense(key.trim());
        onUnlocked();
      } else {
        setError(data.error || 'License key not recognized.');
      }
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gate">
      <h3>Free tracks used up for this month</h3>
      <p>
        {CONFIG.PRODUCT_NAME} Pro removes the limit — tag your whole catalog.
        Already bought it? Paste your license key below.
      </p>
      <div className="gate-row">
        {CONFIG.GUMROAD_URL ? (
          <a className="btn" href={CONFIG.GUMROAD_URL} target="_blank" rel="noreferrer">
            Get Pro
          </a>
        ) : null}
        <input
          value={key}
          placeholder="License key"
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && verify()}
        />
        <button className="btn btn-ghost" onClick={verify} disabled={busy}>
          {busy ? 'Checking…' : 'Unlock'}
        </button>
      </div>
      {error && <p className="status err">{error}</p>}
    </div>
  );
}

export default function TagEditor({
  tags, onTagsChange, onGenerate, onManual, generating,
  usage, onUnlocked, error, canGenerate,
}) {
  const locked = CONFIG.AI_ENABLED && !usage.isPro && usage.left <= 0;

  if (!CONFIG.AI_ENABLED && !tags) {
    return (
      <div>
        <p style={{ marginTop: 0, color: 'var(--muted)' }}>
          Build your tag sheet here — moods, use cases and search keywords buyers
          look for. The readout above gives you the technical facts; you add the feel.
        </p>
        <div className="actions">
          <button className="btn" onClick={onManual}>Start tagging</button>
          <span className="module-hint">AI-assisted tagging coming soon</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {tags ? (
        <>
          <ChipGroup
            label="Moods"
            items={tags.moods}
            onChange={(moods) => onTagsChange({ ...tags, moods })}
            addPlaceholder="+ add mood"
          />
          <ChipGroup
            label="Use cases / video themes"
            items={tags.useCases}
            onChange={(useCases) => onTagsChange({ ...tags, useCases })}
            addPlaceholder="+ add use case"
          />
          <ChipGroup
            label="Search keywords"
            items={tags.keywords}
            onChange={(keywords) => onTagsChange({ ...tags, keywords })}
            addPlaceholder="+ add keyword"
          />
          <div className="field full" style={{ marginTop: 4 }}>
            <label htmlFor="description">Catalog description</label>
            <textarea
              id="description"
              value={tags.description}
              onChange={(e) => onTagsChange({ ...tags, description: e.target.value })}
            />
          </div>
          <div className="actions">
            {locked || !CONFIG.AI_ENABLED ? null : (
              <button className="btn btn-ghost" onClick={onGenerate} disabled={generating}>
                {generating ? 'Regenerating…' : 'Regenerate'}
                {!usage.isPro && !generating ? ` (uses 1 of ${usage.left})` : ''}
              </button>
            )}
          </div>
          {locked && (
            <div style={{ marginTop: 16 }}>
              <UpgradeGate onUnlocked={onUnlocked} />
            </div>
          )}
        </>
      ) : locked ? (
        <UpgradeGate onUnlocked={onUnlocked} />
      ) : (
        <>
          <p style={{ marginTop: 0, color: 'var(--muted)' }}>
            The AI drafts moods, use cases, keywords and a catalog description from your
            track's readout and your notes. Everything stays editable.
          </p>
          <div className="actions">
            <button className="btn" onClick={onGenerate} disabled={generating || !canGenerate}>
              {generating ? 'Generating…' : 'Generate tags'}
            </button>
            {!usage.isPro && (
              <span className="module-hint">{usage.left} free this month</span>
            )}
            <button className="btn-quiet" onClick={onManual} disabled={generating}>
              or write tags myself
            </button>
          </div>
          {!canGenerate && (
            <p className="status">Select at least one instrument above first.</p>
          )}
        </>
      )}
      {error && <p className="status err">{error}</p>}
    </div>
  );
}
