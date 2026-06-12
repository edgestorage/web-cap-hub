/**
 * web-cap script
 *
 * @description Apply one or more Amazon search filters by visible filter text.
 * @param {object} input
 * @param {string} [input.query] Optional search query to open before applying filters.
 * @param {string[]} input.filters Visible filter labels to apply in order.
 * @param {"includes"|"exact"} [input.matchMode=includes] How to match filter labels.
 * @param {string} [input.step] Internal continuation step.
 * @param {Array<object>} [input.applied] Internal list of applied filters.
 * @returns {{ ok: boolean, url: string, title: string, applied: Array<object>, remaining?: string[], error?: string, available?: Array<object> }}
 * @match https://www.amazon.com/s*, https://www.amazon.co.jp/s*, https://www.amazon.co.uk/s*, https://www.amazon.de/s*
 */
export default async function (input = {}) {
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
  const labels = Array.isArray(input.filters) ? input.filters.map(normalize).filter(Boolean) : [];
  const applied = Array.isArray(input.applied) ? input.applied : [];
  const matchMode = input.matchMode === 'exact' ? 'exact' : 'includes';

  if (input.step === 'done') {
    return {
      ok: true,
      url: location.href,
      title: document.title,
      applied
    };
  }

  if (!labels.length) {
    return {
      ok: false,
      error: 'filters must contain at least one visible filter label',
      url: location.href,
      title: document.title,
      applied
    };
  }

  if (input.query && !input.step) {
    const searchUrl = new URL('/s', location.origin);
    searchUrl.searchParams.set('k', input.query);
    return cap.goto(searchUrl.href, {
      ...input,
      step: 'apply',
      applied
    });
  }

  const target = labels[0];
  const links = [...document.querySelectorAll('#s-refinements a[href], [data-component-type="s-search-refinements"] a[href]')]
    .filter(visible)
    .map((link) => ({
      label: normalize(link.textContent),
      href: absoluteUrl(link.getAttribute('href'))
    }))
    .filter((item) => item.label && item.href);

  const lowerTarget = target.toLowerCase();
  const matched = links.find((item) => {
    const label = item.label.toLowerCase();
    return matchMode === 'exact' ? label === lowerTarget : label.includes(lowerTarget);
  });

  if (!matched) {
    return {
      ok: false,
      error: `Filter not found: ${target}`,
      url: location.href,
      title: document.title,
      applied,
      remaining: labels,
      available: links.slice(0, 80)
    };
  }

  const nextApplied = [...applied, matched];
  const remaining = labels.slice(1);
  if (remaining.length) {
    return cap.goto(matched.href, {
      filters: remaining,
      matchMode,
      step: 'apply',
      applied: nextApplied
    });
  }

  return cap.goto(matched.href, {
    filters: [],
    matchMode,
    step: 'done',
    applied: nextApplied
  });
}
