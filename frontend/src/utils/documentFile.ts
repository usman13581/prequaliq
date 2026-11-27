import api from '../services/api';

const VIEWABLE = ['application/pdf', 'image/png', 'image/jpeg'];

function saveBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

/**
 * Open or download a stored document through the API. The server checks that the signed-in
 * user may see it, and the login token travels in the header, never in the address bar.
 * PDFs and images open in a new tab; other formats (Word, Excel) are downloaded.
 */
export async function openDocumentFile(
  documentId: string,
  fileName: string,
  mode: 'view' | 'download'
): Promise<void> {
  // The tab is opened before the request so the browser does not treat it as a pop-up.
  const tab = mode === 'view' ? window.open('', '_blank') : null;
  if (tab) tab.opener = null;
  try {
    const res = await api.get(`/documents/${documentId}/download`, {
      params: mode === 'view' ? { inline: '1' } : undefined,
      responseType: 'blob',
      silentBusy: true
    });
    const type = String(res.headers['content-type'] || '').split(';')[0].trim();
    const blob = new Blob([res.data], { type: type || 'application/octet-stream' });
    if (tab && VIEWABLE.includes(type)) {
      const url = window.URL.createObjectURL(blob);
      tab.location.href = url;
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      return;
    }
    tab?.close();
    saveBlob(blob, fileName);
  } catch (error) {
    tab?.close();
    throw error;
  }
}
