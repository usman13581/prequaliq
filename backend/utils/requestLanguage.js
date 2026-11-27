const SUPPORTED = ['en', 'sv'];

/**
 * Language the signed-in user is working in. The web app sends it on every request
 * (Accept-Language), and AI screens may also pass it explicitly. AI text is written in it.
 */
function requestLanguage(req) {
  const candidates = [req.body?.language, req.query?.language, req.headers?.['accept-language']];
  for (const raw of candidates) {
    const code = String(raw || '').trim().slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(code)) return code;
  }
  return 'en';
}

module.exports = { requestLanguage };
