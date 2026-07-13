const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const MAX_CHARS = 12000;
const MIN_TEXT_CHARS = 20;

let pdfjsModulePromise = null;

function getPdfJsPackageRoot() {
  return path.dirname(require.resolve('pdfjs-dist/package.json'));
}

function loadPdfJs() {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = import('pdfjs-dist/legacy/build/pdf.mjs').then((mod) => {
      const pdfjs = mod.default ?? mod;
      const packageRoot = getPdfJsPackageRoot();
      pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
        path.join(packageRoot, 'legacy/build/pdf.worker.mjs')
      ).href;
      return pdfjs;
    });
  }
  return pdfjsModulePromise;
}

function normalizePdfText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function isRecoverablePdfError(err) {
  const msg = (err?.message || String(err)).toLowerCase();
  return /xref|invalid pdf|corrupt|illegal|format error|bad encrypt|startxref|pdf structure|unexpected/i.test(
    msg
  );
}

function friendlyPdfError(err) {
  const raw = err?.message || String(err);
  const lower = raw.toLowerCase();

  if (/xref|startxref|bad pdf|invalid pdf structure/i.test(lower)) {
    return (
      'This PDF appears damaged or was saved in an unsupported format. ' +
      'Open it in Preview or Adobe Acrobat, choose File → Export as PDF (or Print → Save as PDF), then upload the new file.'
    );
  }
  if (/password|encrypted|needs a password/i.test(lower)) {
    return 'This PDF is password-protected. Remove the password and upload an unlocked copy.';
  }
  if (/not enough text|too-short|image-only|scanned/i.test(lower)) {
    return 'Could not extract enough text from this PDF. It may be a scanned image — use a text-based PDF or re-scan with OCR.';
  }
  if (isRecoverablePdfError(err)) {
    return (
      'Could not read this PDF. Try re-saving it as a new PDF from Preview/Adobe, or upload a different export of the same document.'
    );
  }
  return raw;
}

async function extractWithPdfParse(buffer) {
  let pdfParse;
  try {
    pdfParse = require('pdf-parse');
  } catch {
    throw new Error('pdf-parse is not installed. Run npm install in backend.');
  }
  const data = await pdfParse(buffer);
  return data.text || '';
}

async function extractWithPdfJs(buffer) {
  const pdfjs = await loadPdfJs();
  const packageRoot = getPdfJsPackageRoot();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    stopAtErrors: true,
    verbosity: pdfjs.VerbosityLevel?.ERRORS ?? 0,
    standardFontDataUrl: pathToFileURL(path.join(packageRoot, 'standard_fonts/')).href,
  });
  const pdf = await loadingTask.promise;
  const chunks = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    chunks.push(content.items.map((item) => (typeof item.str === 'string' ? item.str : '')).join(' '));
  }

  return chunks.join('\n');
}

async function extractWithPdftotext(filePath) {
  try {
    const { stdout } = await execFileAsync(
      'pdftotext',
      ['-layout', '-enc', 'UTF-8', filePath, '-'],
      { maxBuffer: 20 * 1024 * 1024, timeout: 30000 }
    );
    return stdout || '';
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

function assertEnoughText(text) {
  const normalized = normalizePdfText(text);
  if (normalized.length < MIN_TEXT_CHARS) {
    const err = new Error(
      'Could not extract enough text from PDF. The file may be scanned/image-only.'
    );
    err.code = 'PDF_TEXT_TOO_SHORT';
    throw err;
  }
  return normalized.slice(0, MAX_CHARS);
}

/**
 * Extract plain text from a PDF file on disk.
 * Tries pdf-parse first, then pdf.js (more tolerant of damaged XRef tables), then pdftotext if installed.
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function extractTextFromPdf(filePath) {
  const buffer = fs.readFileSync(filePath);
  const errors = [];

  try {
    return assertEnoughText(await extractWithPdfParse(buffer));
  } catch (err) {
    errors.push(err);
    if (!isRecoverablePdfError(err) && err.code !== 'PDF_TEXT_TOO_SHORT') {
      // Still attempt fallbacks — many generic parse errors are recoverable with pdf.js.
    }
  }

  try {
    return assertEnoughText(await extractWithPdfJs(buffer));
  } catch (err) {
    errors.push(err);
  }

  try {
    const pdftotextOutput = await extractWithPdftotext(filePath);
    if (pdftotextOutput !== null) {
      return assertEnoughText(pdftotextOutput);
    }
  } catch (err) {
    errors.push(err);
  }

  const bestError = errors.find((err) => isRecoverablePdfError(err)) || errors[0];
  const wrapped = new Error(friendlyPdfError(bestError || new Error('Could not read PDF')));
  wrapped.code = bestError?.code || 'PDF_READ_FAILED';
  throw wrapped;
}

module.exports = { extractTextFromPdf, MAX_CHARS, friendlyPdfError };
