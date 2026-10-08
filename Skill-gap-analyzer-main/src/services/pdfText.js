/**
 * Extract text from a PDF in the browser with pdf.js. The file never leaves
 * the user's device. pdf.js is loaded on demand so it doesn't weigh down the
 * main bundle.
 */

const MAX_PAGES = 6;

const linesFromItems = (items) => {
  // Group text runs into lines by their vertical position.
  const rows = new Map();
  for (const item of items) {
    if (!item.str?.trim()) continue;
    const y = Math.round(item.transform[5]);
    const key = [...rows.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push({ x: item.transform[4], text: item.str });
  }
  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, parts]) =>
      parts
        .sort((a, b) => a.x - b.x)
        .map((p) => p.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    );
};

export const extractPdfText = async (file) => {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data });
  try {
    const doc = await task.promise;
    const pages = Math.min(doc.numPages, MAX_PAGES);
    const lines = [];
    for (let n = 1; n <= pages; n += 1) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      lines.push(...linesFromItems(content.items));
    }
    return lines.join('\n');
  } finally {
    // Releases the worker and memory (lives on the loading task in pdf.js 4+).
    await task.destroy?.();
  }
};

/** Read a resume file: PDF via pdf.js, plain text directly. */
export const readResumeFile = async (file) => {
  if (!file) throw new Error('No file selected.');
  if (file.size > 5 * 1024 * 1024) throw new Error('That file is over 5 MB. Upload a smaller PDF.');
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (isPdf) {
    const text = await extractPdfText(file);
    if (text.replace(/\s/g, '').length < 50) {
      throw new Error('No selectable text found in this PDF — it may be a scanned image. Export it as a text-based PDF or paste the text instead.');
    }
    return text;
  }
  if (/\.(txt|md)$/i.test(file.name) || file.type.startsWith('text/')) return file.text();
  throw new Error('Unsupported file type. Upload a PDF or a .txt file, or paste your resume text.');
};
