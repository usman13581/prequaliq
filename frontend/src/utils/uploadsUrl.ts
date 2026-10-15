const UPLOADS_BASE = (import.meta.env.VITE_UPLOADS_URL || 'http://localhost:5001/uploads').replace(
  /\/$/,
  ''
);

/** Build authenticated upload URL (JWT query token for <img>/<a> without headers). */
export function uploadsUrl(filePathOrName: string | null | undefined): string | null {
  if (!filePathOrName) return null;
  const filename = String(filePathOrName).replace(/^.*[\\/]/, '').replace(/^\/+/, '');
  if (!filename) return null;
  const url = `${UPLOADS_BASE}/${filename}`;
  const token = localStorage.getItem('token');
  if (!token) return url;
  return `${url}?token=${encodeURIComponent(token)}`;
}

export { UPLOADS_BASE };
