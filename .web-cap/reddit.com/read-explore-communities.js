/**
 * web-cap script
 *
 * @description Read and summarize visible communities from Reddit Explore.
 * @param {object} [input]
 * @param {number} [input.limit=80] Maximum communities to return.
 * @param {boolean} [input.groupBySection=true] Group communities by visible Explore section headings.
 * @returns {{ ok: boolean, url: string, title: string, count: number, communities: Array<object>, sections?: Array<object> }}
 * @match https://www.reddit.com/explore/*, https://www.reddit.com/explore
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 80), 200));
  const groupBySection = input.groupBySection !== false;
  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  };
  const subredditFromHref = (href) => {
    try {
      const path = new URL(href, location.origin).pathname;
      return path.match(/^\/r\/([A-Za-z0-9_]+)\/?$/)?.[1] || '';
    } catch {
      return '';
    }
  };
  const findCardText = (link) => {
    const card = link.closest('community-recommendation');
    const cardText = normalize(card?.innerText || card?.textContent);
    if (cardText) return cardText;

    let node = link;
    let best = '';
    const label = normalize(link.textContent);

    for (let depth = 0; depth < 8 && node; depth += 1) {
      const text = normalize(node.innerText || node.textContent);
      if (label && text.includes(label) && text.length > best.length && text.length < 900) {
        best = text;
      }
      node = node.parentElement;
    }

    return best;
  };
  const sectionFor = (link) => {
    let node = link.parentElement;

    for (let depth = 0; depth < 10 && node; depth += 1) {
      let previous = node.previousElementSibling;
      while (previous) {
        const heading = normalize(previous.querySelector?.('h1, h2, h3, [role="heading"]')?.textContent || previous.textContent);
        if (heading && heading.length < 80 && !heading.startsWith('r/')) {
          return heading.replace(/\s*Show more\s*$/i, '');
        }
        previous = previous.previousElementSibling;
      }
      node = node.parentElement;
    }

    return '';
  };

  const seen = new Set();
  const communities = [];
  const links = [...document.querySelectorAll('a[href*="/r/"]')].filter(visible);

  for (const link of links) {
    if (communities.length >= limit) break;

    const href = new URL(link.getAttribute('href'), location.origin).href;
    const subreddit = subredditFromHref(href);
    if (!subreddit || seen.has(subreddit.toLowerCase())) continue;
    seen.add(subreddit.toLowerCase());

    const cardText = findCardText(link);
    const parsed = cardText.match(/^r\/[A-Za-z0-9_]+\s+(.+?)\s+([0-9.]+[KMB]?)\s+weekly visitors\s+([\s\S]*)$/i);
    const name = `r/${subreddit}`;

    communities.push({
      name,
      href,
      section: sectionFor(link),
      displayName: parsed?.[1] || subreddit,
      weeklyVisitors: parsed?.[2] || '',
      description: normalize(parsed?.[3] || '').slice(0, 500)
    });
  }

  const result = {
    ok: true,
    url: location.href,
    title: document.title,
    count: communities.length,
    communities
  };

  if (groupBySection) {
    const sectionMap = new Map();
    for (const community of communities) {
      const section = community.section || 'Uncategorized';
      if (!sectionMap.has(section)) {
        sectionMap.set(section, []);
      }
      sectionMap.get(section).push(community);
    }
    result.sections = [...sectionMap.entries()].map(([section, items]) => ({
      section,
      count: items.length,
      communities: items
    }));
  }

  return result;
}
