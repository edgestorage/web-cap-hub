/**
 * web-cap script
 *
 * @description Read a Wikipedia article title, lead text, sections, infobox, categories, and selected links.
 * @param {object} [input]
 * @param {string} [input.title] Article title to open before reading.
 * @param {string} [input.url] Wikipedia article URL to open before reading.
 * @param {string} [input.language=en] Wikipedia language subdomain used with input.title.
 * @param {number} [input.leadLimit=5000] Maximum lead characters.
 * @param {number} [input.sectionLimit=20] Maximum sections to return.
 * @param {number} [input.sectionTextLimit=2500] Maximum characters per section.
 * @param {number} [input.linkLimit=80] Maximum article links to return.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, article?: object }}
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

  const sectionLimit = Math.max(0, Math.min(Number(input.sectionLimit ?? 20), 80));
  const leadLimit = Math.max(500, Math.min(Number(input.leadLimit ?? 5000), 30000));
  const sectionTextLimit = Math.max(200, Math.min(Number(input.sectionTextLimit ?? 2500), 20000));
  const linkLimit = Math.max(0, Math.min(Number(input.linkLimit ?? 80), 500));
  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const absoluteUrl = (href) => {
    if (!href) return '';
    try {
      const url = new URL(href, location.origin);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };
  const cloneWithoutNoise = (node) => {
    const clone = node.cloneNode(true);
    clone.querySelectorAll('.mw-editsection, sup.reference, .reference, .noprint, style, script').forEach((item) => item.remove());
    return clone;
  };

  const contentCandidates = [
    ...document.querySelectorAll('#mw-content-text, #bodyContent, main, article, .mw-body-content, .mw-parser-output')
  ];
  const contentScore = (element) => {
    const base = element.querySelectorAll('p').length + element.querySelectorAll('h2').length * 2;
    const parserBonus = element.classList?.contains('mw-parser-output') && element.querySelector('p') ? 1000 : 0;
    return base + parserBonus;
  };
  const content = contentCandidates
    .sort((a, b) => contentScore(b) - contentScore(a))[0] || document.body;
  const pageTitle = normalize(document.querySelector('#firstHeading, h1')?.textContent) || document.title;
  const disambiguation = Boolean(document.querySelector('#disambigbox, table.disambigbox, body.mw-disambig'));
  const getHeading = (node) => {
    const heading = node.matches?.('h2') ? node : node.querySelector?.(':scope > h2');
    if (!heading) return null;
    const clone = cloneWithoutNoise(heading);
    return {
      title: normalize(clone.textContent),
      id: heading.id || node.id || heading.querySelector('[id]')?.id || ''
    };
  };

  const topLevelNodes = [...content.children];
  const leadParts = [];
  for (const node of topLevelNodes) {
    if (getHeading(node)) break;
    if (node.matches?.('p')) {
      const text = normalize(cloneWithoutNoise(node).textContent);
      if (text) leadParts.push(text);
    }
  }

  const sections = [];
  let current = null;
  for (const node of topLevelNodes) {
    const heading = getHeading(node);
    if (heading) {
      if (current && current.text) sections.push(current);
      if (sections.length >= sectionLimit) break;
      current = {
        title: heading.title,
        id: heading.id,
        text: ''
      };
      continue;
    }
    if (!current || sections.length >= sectionLimit) continue;
    if (/^(P|UL|OL)$/i.test(node.tagName)) {
      const text = normalize(cloneWithoutNoise(node).textContent);
      if (text) current.text = normalize(`${current.text} ${text}`).slice(0, sectionTextLimit);
    }
  }
  if (current && current.text && sections.length < sectionLimit) sections.push(current);

  const infobox = {};
  const infoboxRoot = document.querySelector('.infobox, table.infobox');
  if (infoboxRoot) {
    for (const row of infoboxRoot.querySelectorAll('tr')) {
      const key = normalize(cloneWithoutNoise(row.querySelector('th') || row).textContent);
      const value = normalize(cloneWithoutNoise(row.querySelector('td') || row).textContent);
      if (key && value && Object.keys(infobox).length < 60) infobox[key] = value;
    }
  }

  const links = [...content.querySelectorAll('a[href^="/wiki/"]')]
    .map((link) => ({
      text: normalize(link.textContent),
      href: absoluteUrl(link.getAttribute('href')),
      title: normalize(link.getAttribute('title'))
    }))
    .filter((link) => link.text && !/\/wiki\/(Help|Special|File|Template|Category|Portal|Talk):/i.test(link.href))
    .slice(0, linkLimit);

  const categories = [...document.querySelectorAll('#mw-normal-catlinks a[href*="/wiki/Category:"], .catlinks a[href*="/wiki/Category:"]')]
    .map((link) => normalize(link.textContent))
    .filter((text) => text && text !== 'Categories');

  return {
    ok: true,
    url: location.href,
    title: document.title,
    article: {
      pageTitle,
      language: location.hostname.split('.')[0] || language,
      canonicalUrl: document.querySelector('link[rel="canonical"]')?.href || location.href,
      description: normalize(document.querySelector('meta[name="description"]')?.content),
      disambiguation,
      lead: leadParts.join('\n\n').slice(0, leadLimit),
      infobox,
      sectionCount: sections.length,
      sections,
      categories,
      links,
      lastModified: normalize(document.querySelector('#footer-info-lastmod, li#footer-info-lastmod')?.textContent)
    }
  };
}
