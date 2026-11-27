/**
 * Small in-memory limiter for sign-in style endpoints (per address + account + path).
 * Enough to slow password guessing on one instance; it resets when the process restarts.
 */
function rateLimit({ windowMs, max, message }) {
  const hits = new Map();
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs);
  sweep.unref();

  return (req, res, next) => {
    const now = Date.now();
    // Keyed on address + account, so users behind one proxy address do not share a budget.
    const account = String(req.body?.email || '').trim().toLowerCase().slice(0, 200);
    const key = `${req.ip}|${req.baseUrl}${req.path}|${account}`;
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ message: message || 'Too many attempts. Try again in a few minutes.' });
    }
    return next();
  };
}

module.exports = { rateLimit };
