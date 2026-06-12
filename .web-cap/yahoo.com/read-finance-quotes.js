/**
 * web-cap script
 *
 * @description Read visible Yahoo Finance quote tiles or rows from the current page.
 * @param {object} [input]
 * @param {number} [input.limit=30] Maximum quotes to return.
 * @param {boolean} [input.openFinance=false] Open a matching Yahoo Finance page before reading.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, count: number, quotes: Array<object> }}
 * @match https://*.yahoo.com/*
 */
export default async function (input = {}) {
  if (input.openFinance && input.step !== 'read') {
    const host = location.hostname;
    const financeOrigin = host.includes('finance.yahoo.com')
      ? location.origin
      : host.startsWith('uk.')
        ? 'https://uk.finance.yahoo.com'
        : 'https://finance.yahoo.com';
    return cap.goto(`${financeOrigin}/`, { ...input, step: 'read' });
  }

  const limit = Math.max(1, Math.min(Number(input.limit ?? 30), 100));
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
  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  };
  const containers = [...document.querySelectorAll([
    'a[href*="/quote/"]',
    'li[class*="recLinkItem"]',
    'tr'
  ].join(','))].filter(visible);
  const quotes = [];
  const seen = new Set();

  for (const el of containers) {
    if (quotes.length >= limit) break;

    const href = absoluteUrl((el.matches('a[href]') ? el : el.querySelector('a[href*="/quote/"]'))?.getAttribute('href'));
    const text = normalize(el.textContent);
    if (/^Major markets/i.test(text)) continue;
    const symbolFromHref = href.match(/\/quote\/([^/?]+)/)?.[1] || '';
    const symbol = decodeURIComponent(symbolFromHref || text.match(/^[A-Z0-9.^=-]{2,15}/)?.[0] || '');
    const streamers = [...el.querySelectorAll('fin-streamer')].map((node) => normalize(node.textContent)).filter(Boolean);
    const textWithoutPercents = text.replace(/[+-]?[0-9][0-9,.]*\.?\d*%/g, ' ');
    const price = streamers.find((value) => !/%/.test(value) && !/^[+-]/.test(value)) ||
      textWithoutPercents.match(/[0-9][0-9,.]*\.\d+/)?.[0] ||
      '';
    const change = streamers.find((value) => /^[+-]/.test(value) && !/%/.test(value)) ||
      textWithoutPercents.match(/[+-][0-9][0-9,.]*\.\d+/)?.[0] ||
      '';
    const percentChange = streamers.find((value) => /%/.test(value)) || text.match(/[+-]?[0-9][0-9,.]*%/)?.[0] || '';
    const key = symbol || href || text;
    if (!key || seen.has(key) || (!price && !percentChange)) continue;
    seen.add(key);

    quotes.push({
      symbol,
      name: normalize(el.querySelector('[title], .longName, .shortName')?.getAttribute('title') || ''),
      price,
      change,
      percentChange,
      href,
      text: text.slice(0, 240)
    });
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: quotes.length,
    quotes
  };
}
