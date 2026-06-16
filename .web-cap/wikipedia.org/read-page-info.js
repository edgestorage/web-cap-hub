/**
 * web-cap script
 *
 * @description Read Wikipedia page information, canonical metadata, protection hints, and tool links.
 * @param {object} [input]
 * @param {string} [input.title] Article title.
 * @param {string} [input.url] Article or PageInformation URL to open before reading.
 * @param {string} [input.language=en] Wikipedia language subdomain used with input.title.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, info?: object }}
 * @match https://*.wikipedia.org/wiki/*, https://*.wikipedia.org/w/index.php?title=*&action=info
 */
export default async function (input = {}) {
  const language = String(input.language || location.hostname.split('.')[0] || 'en').replace(/[^a-z0-9-]/gi, '') || 'en';
  if (input.step !== 'read' && (input.url || input.title)) {
    const targetUrl = input.url || `https://${language}.wikipedia.org/wiki/${encodeURIComponent(String(input.title).trim()).replace(/%20/g, '_')}`;
    return cap.goto(targetUrl, { ...input, language, step: 'read' });
  }

  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const absoluteUrl = (href) => {
    if (!href) return '';
    try {
      const url = new URL(href, location.href);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };
  const links = [...document.querySelectorAll('a[href]')];
  const findTool = (pattern) => absoluteUrl(links.find((link) => pattern.test(link.href))?.getAttribute('href'));
  const indicators = [...document.querySelectorAll('.mw-indicators .mw-indicator, .indicator, .protection-icon')]
    .map((item) => normalize(item.textContent || item.getAttribute('title') || item.querySelector('[title]')?.getAttribute('title')))
    .filter(Boolean);
  const tableRows = [...document.querySelectorAll('table.wikitable tr, .mw-page-info tr')]
    .map((row) => ({
      key: normalize(row.querySelector('th')?.textContent),
      value: normalize(row.querySelector('td')?.textContent)
    }))
    .filter((row) => row.key && row.value);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    info: {
      pageTitle: normalize(document.querySelector('#firstHeading, h1')?.textContent),
      language: location.hostname.split('.')[0] || language,
      canonicalUrl: document.querySelector('link[rel="canonical"]')?.href || location.href,
      description: normalize(document.querySelector('meta[name="description"]')?.content),
      lastModified: normalize(document.querySelector('#footer-info-lastmod, li#footer-info-lastmod')?.textContent),
      indicators,
      toolLinks: {
        history: findTool(/action=history/),
        pageInformation: findTool(/action=info|Special:PageInformation/),
        permanentLink: findTool(/oldid=/),
        citeThisPage: findTool(/Special:CiteThisPage/),
        whatLinksHere: findTool(/Special:WhatLinksHere/),
        downloadPdf: findTool(/Special:DownloadAsPdf/)
      },
      pageInfoRows: tableRows
    }
  };
}
