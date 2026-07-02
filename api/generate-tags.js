// api/generate-tags.js — Vercel serverless function.
// Keeps the Anthropic API key on the server; the browser never sees it.
// Requires env var: ANTHROPIC_API_KEY (set it in Vercel project settings).

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        'Server is missing ANTHROPIC_API_KEY. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.',
    });
  }

  const {
    bpm, key, mode, energy, duration,
    genre, vocals, instruments, vibe, title,
  } = req.body || {};

  if (!instruments || !Array.isArray(instruments) || instruments.length === 0) {
    return res.status(400).json({ error: 'At least one instrument is required.' });
  }
  const clean = (s, max) => String(s || '').slice(0, max);

  const prompt = `You are a metadata specialist for sync licensing music libraries (Artlist, Musicbed style catalogs). Generate metadata for this track.

Track facts:
- Title: ${clean(title, 120) || 'Untitled'}
- BPM: ${Number(bpm) || 'unknown'}
- Key: ${clean(key, 4)} ${clean(mode, 10)}
- Energy: ${clean(energy, 10)}
- Duration: ${clean(duration, 10)}
- Genre: ${clean(genre, 60) || 'unspecified'}
- Vocals: ${clean(vocals, 30)}
- Instruments: ${instruments.slice(0, 25).map((i) => clean(i, 40)).join(', ')}
- Producer's own description of the vibe: "${clean(vibe, 500)}"

Rules:
- mood_tags: 6 single-word or two-word emotional descriptors buyers actually search for (e.g. "uplifting", "tense", "warm").
- use_cases: 6 video/media contexts this track suits (e.g. "travel vlog", "corporate explainer", "wedding film").
- keywords: 12 search keywords, lowercase, no duplicates of mood_tags, mix of sonic and contextual terms.
- description: 1-2 sentences in neutral catalog style. Describe the sound and feel. No hype words like "amazing", no artist self-promotion, no mention of the title.
- Base everything on the facts given. Do not invent instruments that are not listed.

Respond with ONLY a JSON object, no markdown fences, no commentary:
{"mood_tags":[...],"use_cases":[...],"keywords":[...],"description":"..."}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Anthropic API error:', response.status, detail);
      return res.status(502).json({
        error: `AI service returned ${response.status}. Check your API key and credit balance at console.anthropic.com.`,
      });
    }

    const data = await response.json();
    const text = (data.content || [])
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .replace(/```json|```/g, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: 'AI returned an unexpected format. Try again.' });
    }

    const asStringArray = (v, max) =>
      Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, max) : [];

    return res.status(200).json({
      mood_tags: asStringArray(parsed.mood_tags, 10),
      use_cases: asStringArray(parsed.use_cases, 10),
      keywords: asStringArray(parsed.keywords, 20),
      description: typeof parsed.description === 'string' ? parsed.description.slice(0, 600) : '',
    });
  } catch (err) {
    console.error('generate-tags failed:', err);
    return res.status(500).json({ error: 'Tag generation failed. Try again in a moment.' });
  }
}
