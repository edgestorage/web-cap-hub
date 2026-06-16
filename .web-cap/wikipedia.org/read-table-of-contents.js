/**
 * web-cap script
 *
 * @description Read the visible and article-derived table of contents for a Wikipedia page.
 * @param {object} [input]
 * @param {string} [input.title] Article title to open before reading.
 * @param {string} [input.url] Wikipedia article URL to open before reading.
 * @param {string} [input.language=en] Wikipedia language subdomain used with input.title.
 * @param {number} [input.limit=80] Maximum headings to return.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, count?: number, sections?: Array<object> }}
 * @match https://*.wikipedia.org/wiki/*
 */
export default async function (input = {}) {
  const language = String(input.language || location.hostname.split('.')[0] || 'en').replace(/[^a-z0-9-]/gi, '') || 'en';

  if (input.step !== 'read' && (input.url || input.title)) {
    let targetUrl = input.url;
    if (!targetUrl && input.title) {
      targetUrl = `https://${language}.wikipedia.org/wiki/${encodeURIComponent(String(input.title).trim()).replace(/%20/g, '_')}`;
    }
    return cap.goto(targetUrl, { ...input, language, step: 'read' });
  }

  const limit = Math.max(1, Math.min(Number(input.limit ?? 80), 300));
  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const contentCandidates = [
    ...document.querySelectorAll('#mw-content-text, #bodyContent, main, article, .mw-body-content, .mw-parser-output')
  ];
  const contentScore = (element) => {
    const base = element.querySelectorAll('h2, h3, h4').length;
    const parserBonus = element.classList?.contains('mw-parser-output') && base ? 1000 : 0;
    return base + parserBonus;
  };
  const content = contentCandidates
    .sort((a, b) => contentScore(b) - contentScore(a))[0] || document.body;
  const sections = [];

  for (const heading of content.querySelectorAll('h2, h3, h4')) {
    if (sections.length >= limit) break;
    const clone = heading.cloneNode(true);
    clone.querySelectorAll('.mw-editsection').forEach((item) => item.remove());
    const text = normalize(clone.textContent);
    if (!text || /^(Contents|References|External links)$/i.test(text) && heading.tagName === 'H2') {
      continue;
    }
    const id = heading.id || heading.querySelector('[id]')?.id || '';
    sections.push({
      level: Number(heading.tagName.slice(1)),
      title: text,
      id,
      href: id ? `${location.origin}${location.pathname}#${encodeURIComponent(id)}` : ''
    });
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    pageTitle: normalize(document.querySelector('#firstHeading, h1')?.textContent),
    count: sections.length,
    sections
  };
}
