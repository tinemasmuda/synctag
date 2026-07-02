// api/verify-license.js — unlocks the Pro tier.
// Two modes, both zero-database:
//   1) GUMROAD_PRODUCT_ID env var set  -> verifies real Gumroad license keys
//      (enable "Generate license keys" on your Gumroad product).
//   2) UNLOCK_CODE env var set         -> compares against a single shared code
//      you deliver to buyers manually. Simple fallback for the very first sales.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const licenseKey = String((req.body || {}).licenseKey || '').trim();
  if (!licenseKey) {
    return res.status(400).json({ error: 'License key is required.' });
  }

  const productId = process.env.GUMROAD_PRODUCT_ID;
  const unlockCode = process.env.UNLOCK_CODE;

  if (productId) {
    try {
      const params = new URLSearchParams({
        product_id: productId,
        license_key: licenseKey,
        increment_uses_count: 'false',
      });
      const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const data = await response.json();
      const purchase = data && data.purchase;
      const valid =
        data && data.success === true &&
        purchase && !purchase.refunded && !purchase.disputed && !purchase.chargebacked;
      if (valid) return res.status(200).json({ valid: true });
      return res.status(200).json({ valid: false, error: 'License key not recognized.' });
    } catch (err) {
      console.error('Gumroad verify failed:', err);
      return res.status(502).json({ error: 'Could not reach the license server. Try again.' });
    }
  }

  if (unlockCode) {
    if (licenseKey === unlockCode) return res.status(200).json({ valid: true });
    return res.status(200).json({ valid: false, error: 'License key not recognized.' });
  }

  return res.status(501).json({
    error:
      'License verification is not configured yet. Set GUMROAD_PRODUCT_ID or UNLOCK_CODE in Vercel environment variables.',
  });
}
