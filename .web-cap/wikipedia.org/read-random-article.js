/**
 * web-cap script
 *
 * @description Open a random Wikipedia article and read a compact summary.
 * @param {object} [input]
 * @param {string} [input.language=en] Wikipedia language subdomain.
 * @param {number} [input.leadLimit=2000] Maximum lead characters.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, article?: object }}
 * @match https://*.wikipedia.org/wiki/Special:Random, https://*.wikipedia.org/wiki/*
 */
export default async function (input = {}) {
  const language = String(input.language || location.hostname.split('.')[0] || 'en').replace(/[^a-z0-9-]/gi, '') || 'en';
  if (input.step !== 'read') {
    return cap.goto(`https://${language}.wikipedia.org/wiki/Special:Random`, { ...input, language, step: 'read' });
  }

  const leadLimit = Math.max(200, Math.min(Number(input.leadLimit ?? 2000), 10000));
  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const root = [...document.querySelectorAll('.mw-parser-output, #mw-content-text, #bodyContent')]
    .sort((a, b) => b.querySelectorAll('p').length - a.querySelectorAll('p').length)[0] || document.body;
  const lead = [...root.querySelectorAll('p')]
    .map((p) => normalize(p.textContent))
    .filter(Boolean)
    .slice(0, 4)
    .join('\n\n')
    .slice(0, leadLimit);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    article: {
      pageTitle: normalize(document.querySelector('#firstHeading, h1')?.textContent),
      language: location.hostname.split('.')[0] || language,
      lead,
      canonicalUrl: document.querySelector('link[rel="canonical"]')?.href || location.href
    }
  };
}
