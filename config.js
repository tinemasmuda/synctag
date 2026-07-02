// config.js — the only file you need to touch to customize the business side.

export const CONFIG = {
  // Set to true once ANTHROPIC_API_KEY is configured in Vercel.
  // While false, the app runs in analysis-only mode: local BPM/key/energy
  // analysis plus manual tagging — no AI calls, no usage limits.
  AI_ENABLED: false,

  // How many AI tag generations are free per month, per browser.
  FREE_GENERATIONS_PER_MONTH: 3,

  // Paste your Gumroad product link here once you create it,
  // e.g. 'https://yourname.gumroad.com/l/synctag-pro'
  GUMROAD_URL: '',

  // Product name shown in the UI.
  PRODUCT_NAME: 'SyncTag',
  MODEL_LABEL: 'ST-1',
};
