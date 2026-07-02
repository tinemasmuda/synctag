// usage.js — freemium counter in localStorage.
// Soft gate: honest users see the limit; the paid tier is verified
// server-side through /api/verify-license (Gumroad license keys).
import { CONFIG } from '../config.js';

function monthKey() {
  return 'synctag_uses_' + new Date().toISOString().slice(0, 7);
}

export function getUsage() {
  const isPro = !!localStorage.getItem('synctag_license');
  const used = parseInt(localStorage.getItem(monthKey()) || '0', 10);
  const left = Math.max(0, CONFIG.FREE_GENERATIONS_PER_MONTH - used);
  return { isPro, used, left };
}

export function recordUse() {
  const key = monthKey();
  const used = parseInt(localStorage.getItem(key) || '0', 10);
  localStorage.setItem(key, String(used + 1));
}

export function saveLicense(licenseKey) {
  localStorage.setItem('synctag_license', licenseKey);
}

export function getLicense() {
  return localStorage.getItem('synctag_license') || '';
}
