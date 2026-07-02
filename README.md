# SyncTag ST-1

Sync licensing metadata generator za producente. Uploadaš track → browser lokalno
analizira BPM, tonalitet, energiju i trajanje → uneseš instrumente i opis vibea →
AI generira moods, use cases, keywords i catalog opis → exportaš CSV +
copy-paste sheetove za Artlist/Musicbed style submissione.

## Što je gdje

- `src/` — React frontend (analiza zvuka radi 100% u browseru, fajl ne ide na server)
- `api/generate-tags.js` — serverless funkcija koja zove Anthropic API (key ostaje na serveru)
- `api/verify-license.js` — verifikacija Gumroad license keyeva za Pro tier
- `src/config.js` — JEDINI fajl koji trebaš mijenjati (Gumroad link, free limit)
- `scripts/test-dsp.mjs` — testovi za BPM/key detekciju (`npm run test:dsp`)

## Računi koje trebaš (sve besplatno za start)

1. **GitHub** — github.com (za kod)
2. **Vercel** — vercel.com (hosting, prijavi se preko GitHub računa)
3. **Anthropic Console** — console.anthropic.com (API key za AI tagove)
4. **Gumroad** — gumroad.com (tek kad budeš spreman naplaćivati, može kasnije)

## Deploy — korak po korak

### 1. Kod na GitHub

```bash
cd synctag
git init
git add .
git commit -m "SyncTag ST-1"
```

Na github.com napravi novi repozitorij (npr. `synctag`), pa:

```bash
git remote add origin https://github.com/TVOJ_USERNAME/synctag.git
git branch -M main
git push -u origin main
```

### 2. Anthropic API key

1. Idi na https://console.anthropic.com
2. API Keys → Create Key → kopiraj ga (počinje sa `sk-ant-`)
3. Provjeri billing/credits stranicu za trenutne uvjete — svaki generate poziv
   košta centi, ali prati potrošnju dok ne staviš limit

### 3. Deploy na Vercel

1. Idi na https://vercel.com → Add New → Project
2. Importaj svoj `synctag` GitHub repo
3. Framework preset: Vite (Vercel ga sam prepozna) — ništa ne mijenjaj
4. **Prije klika na Deploy**: otvori "Environment Variables" i dodaj:
   - Name: `ANTHROPIC_API_KEY` / Value: tvoj key iz koraka 2
5. Deploy → za ~1 min stranica je živa na `tvoj-projekt.vercel.app`

### 4. (Kasnije) Gumroad za naplatu

1. Na Gumroadu napravi product "SyncTag Pro" (digitalni proizvod, cijena po želji)
2. U postavkama producta uključi **"Generate a unique license key per sale"**
3. Kopiraj **product ID** (u Gumroad product postavkama)
4. U Vercelu dodaj env varijablu `GUMROAD_PRODUCT_ID` s tim ID-em → Redeploy
5. U `src/config.js` zalijepi svoj Gumroad link u `GUMROAD_URL` → push na GitHub
   (Vercel automatski redeploya)

Kupac dobije license key od Gumroada automatski, zalijepi ga u aplikaciju,
i otključa se Pro (unlimited) na tom browseru.

**Privremena alternativa bez Gumroada:** umjesto `GUMROAD_PRODUCT_ID` postavi
env varijablu `UNLOCK_CODE` na bilo koji tajni kod i šalji ga kupcima ručno.

## Lokalni development

```bash
npm install
npx vercel dev    # pokreće i frontend i /api funkcije
```

Napomena: obični `npm run dev` (Vite) NE servira `/api` funkcije — za testiranje
AI generiranja lokalno koristi `npx vercel dev` (i stavi key u `.env` fajl:
`ANTHROPIC_API_KEY=sk-ant-...`).

## Kako radi freemium

- 3 besplatna generiranja mjesečno, brojač u localStorage (soft limit — tehnički
  zaobilazan brisanjem browser podataka, ali dovoljan za MVP; pravi per-user
  limit zahtijeva login + bazu, što je upgrade za kasnije)
- Pro se otključava license keyem koji server verificira kroz Gumroad API
- Ručno pisanje tagova ("write tags myself") je uvijek besplatno — alat ostaje
  koristan i bez AI-a, što je dobro za povjerenje

## Poznata ograničenja (iskreno)

- BPM detekcija može uhvatiti half/double-time (60 vs 120) — zato su vrijednosti
  editabilne i UI to jasno kaže
- Key detekcija je procjena (Krumhansl-Schmuckler algoritam) — solidna za
  tonalne pjesme, slabija za atonalne/perkusivne stvari
- Artlist i Musicbed su kurirane platforme s vlastitim artist portalima — ovaj
  alat generira sadržaj polja koja njihovi formulari traže, ne uploada direktno
