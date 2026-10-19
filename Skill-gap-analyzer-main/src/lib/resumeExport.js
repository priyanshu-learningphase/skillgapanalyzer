/**
 * Resume file I/O for the ATS tailor.
 *
 * extractDocxText(buffer) → text from a .docx (word/document.xml)
 * buildDocx(draft)        → Uint8Array of a single-column, ATS-friendly .docx
 * buildPdf(draft)         → ArrayBuffer of a text-based PDF (real, selectable text)
 *
 * Libraries load on demand (JSZip, jsPDF) so they don't weigh down the app.
 */

import { draftSections, headerLines } from './resumeDraft.js';

// ── DOCX reading ───────────────────────────────────────────────────────────

const decodeXml = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');

/** Plain text from a .docx. List paragraphs get a "• " prefix so bullets survive. */
export const extractDocxText = async (buffer) => {
  const { default: JSZip } = await import('jszip');
  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error('That file isn’t a valid .docx document.');
  }
  const file = zip.file('word/document.xml');
  if (!file) throw new Error('That file isn’t a valid .docx document.');
  const xml = await file.async('string');
  const body = xml.split(/<w:body[^>]*>/)[1] || xml;
  const token = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br[^>]*\/>/g;
  return body
    .split(/<\/w:p>/)
    .map((p) => {
      let text = '';
      for (const m of p.matchAll(token)) text += m[1] != null ? decodeXml(m[1]) : m[0].startsWith('<w:tab') ? '\t' : '\n';
      text = text.trim();
      const isList = /<w:numPr>/.test(p);
      return text && isList && !/^[•\-–*]/.test(text) ? `• ${text}` : text;
    })
    .filter(Boolean)
    .join('\n');
};

// ── DOCX writing ───────────────────────────────────────────────────────────

const escapeXml = (s) =>
  String(s ?? '')
    // Characters not allowed in XML 1.0.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const run = (text, { bold, italic, size, color } = {}) =>
  `<w:r><w:rPr>${bold ? '<w:b/>' : ''}${italic ? '<w:i/>' : ''}${color ? `<w:color w:val="${color}"/>` : ''}${size ? `<w:sz w:val="${size}"/>` : ''}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;

const TAB_STOP = 10300; // right edge of the text area on A4 with 0.6" margins
const para = (runs, { after = 40, before = 0, indent, border, rightTab, center } = {}) =>
  `<w:p><w:pPr>${border ? '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="9CA3AF"/></w:pBdr>' : ''}${rightTab ? `<w:tabs><w:tab w:val="right" w:pos="${TAB_STOP}"/></w:tabs>` : ''}<w:spacing w:before="${before}" w:after="${after}"/>${indent ? '<w:ind w:left="360" w:hanging="220"/>' : ''}${center ? '<w:jc w:val="center"/>' : ''}</w:pPr>${runs}</w:p>`;

const documentXml = (draft) => {
  const body = [];
  const [name, contact] = headerLines(draft.header);
  if (name) body.push(para(run(name, { bold: true, size: 34 }), { after: 40, center: true }));
  if (contact) body.push(para(run(contact, { size: 19, color: '374151' }), { after: 120, center: true }));
  for (const section of draftSections(draft)) {
    body.push(para(run(section.title.toUpperCase(), { bold: true, size: 21 }), { before: 160, after: 60, border: true }));
    for (const p of section.paragraphs || []) body.push(para(run(p, { size: 20 })));
    for (const line of section.lines || []) {
      const [group, ...rest] = line.split(': ');
      body.push(rest.length ? para(run(`${group}: `, { bold: true, size: 20 }) + run(rest.join(': '), { size: 20 })) : para(run(line, { size: 20 })));
    }
    for (const entry of section.entries || []) {
      body.push(para(run(entry.heading, { bold: true, size: 20 }) + (entry.dates ? `<w:r><w:tab/></w:r>${run(entry.dates, { size: 19, color: '374151' })}` : ''), { before: 80, after: 20, rightTab: true }));
      if (entry.subheading) body.push(para(run(entry.subheading, { italic: true, size: 19, color: '374151' }), { after: 20 }));
      for (const b of entry.bullets.filter((x) => x.text.trim())) body.push(para(run(`•  ${b.text.trim()}`, { size: 20 }), { indent: true, after: 20 }));
    }
    for (const item of section.items || []) body.push(para(run(`•  ${item}`, { size: 20 }), { indent: true, after: 20 }));
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="864" w:right="864" w:bottom="864" w:left="864" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;
};

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="20"/><w:lang w:val="en-IN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="40" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;

/** A .docx file as bytes. */
export const buildDocx = async (draft) => {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
  );
  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  );
  zip.file('word/styles.xml', STYLES);
  zip.file('word/document.xml', documentXml(draft));
  zip.file(
    'docProps/core.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(`${draft.header.name || 'Resume'} — Resume`)}</dc:title><dc:creator>${escapeXml(draft.header.name || '')}</dc:creator></cp:coreProperties>`,
  );
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
};

// ── PDF writing ────────────────────────────────────────────────────────────

const PDF_REPLACEMENTS = [
  [/[→➢►➔]/g, '->'],
  [/[✓✔✅]/g, ''],
  [/₹/g, 'Rs. '],
  [/[   ]/g, ' '],
];
/** Standard PDF fonts cover Latin-1 plus common typography; strip anything else. */
const ALLOWED_EXTRA = new Set(['‘', '’', '“', '”', '–', '—', '•', '…', '€', '™']);
export const pdfSafe = (text) => {
  let s = String(text ?? '');
  for (const [re, to] of PDF_REPLACEMENTS) s = s.replace(re, to);
  return [...s].filter((ch) => ch.charCodeAt(0) <= 0xff || ALLOWED_EXTRA.has(ch)).join('');
};

/** A text-based PDF (A4) as an ArrayBuffer. */
export const buildPdf = async (draft) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setProperties({ title: `${draft.header.name || 'Resume'} — Resume`, author: draft.header.name || '' });
  const M = 44;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const right = W - M;
  let y = M;

  const ensure = (needed) => {
    if (y + needed > H - M) {
      doc.addPage();
      y = M;
    }
  };
  const write = (text, { size = 10, style = 'normal', color = 17, x = M, width = right - M, gap = 1.28, align } = {}) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(pdfSafe(text), width);
    for (const line of lines) {
      ensure(size * gap);
      y += size;
      doc.text(line, align === 'center' ? W / 2 : x, y, align ? { align } : undefined);
      y += size * (gap - 1);
    }
  };

  const [name, contact] = headerLines(draft.header);
  if (name) write(name, { size: 18, style: 'bold', align: 'center' });
  if (contact) {
    y += 2;
    write(contact, { size: 9.5, color: 60, align: 'center' });
  }
  for (const section of draftSections(draft)) {
    y += 10;
    ensure(30);
    write(section.title.toUpperCase(), { size: 10.5, style: 'bold' });
    doc.setDrawColor(156);
    doc.setLineWidth(0.6);
    doc.line(M, y + 2, right, y + 2);
    y += 7;
    for (const p of section.paragraphs || []) write(p);
    for (const line of section.lines || []) write(line);
    for (const entry of section.entries || []) {
      y += 3;
      ensure(28);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const datesWidth = entry.dates ? doc.getTextWidth(pdfSafe(entry.dates)) + 12 : 0;
      const top = y;
      write(entry.heading, { style: 'bold', width: right - M - datesWidth });
      if (entry.dates) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(60);
        doc.text(pdfSafe(entry.dates), right, top + 10, { align: 'right' });
      }
      if (entry.subheading) write(entry.subheading, { size: 9.5, style: 'italic', color: 60 });
      for (const b of entry.bullets.filter((x) => x.text.trim())) {
        ensure(13);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(17);
        doc.text('•', M + 2, y + 10);
        write(b.text.trim(), { x: M + 12, width: right - M - 12 });
      }
    }
    for (const item of section.items || []) {
      ensure(13);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('•', M + 2, y + 10);
      write(item, { x: M + 12, width: right - M - 12 });
    }
  }
  return doc.output('arraybuffer');
};

export const downloadBytes = (bytes, fileName, type) => {
  const blob = new Blob([bytes], { type });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
