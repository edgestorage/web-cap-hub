/**
 * web-cap script
 *
 * @description Search Xiaohongshu results and read visible note or user result cards.
 * @param {object} input
 * @param {string} input.query Search query.
 * @param {number} [input.limit=20] Maximum visible result cards to return.
 * @param {object} [input.filters] Optional search filters. Supports resultType, sort, noteType, publishTime, searchScope, and distance.
 * @param {number} [input.waitMs=2200] Milliseconds to wait after navigation.
 * @returns {{ ok: boolean, url: string, title: string, query?: string, count?: number, notes?: object[], error?: string }}
 * @match https://www.xiaohongshu.com/search_result*, https://www.xiaohongshu.com/explore*
 */
export default async function (input = {}) {
  const query = normalize(input.query);
  const limit = clampNumber(input.limit, 20, 1, 100);
  const waitMs = clampNumber(input.waitMs, 2200, 300, 10000);

  if (!query) {
    return {
      ok: false,
      url: location.href,
      title: document.title,
      error: 'Provide input.query.'
    };
  }

  if (input.step === 'read') {
    await page.waitForTimeout(waitMs);
    const filterResult = await applySearchControls(normalizeFilters(input), waitMs);
    return readSearchResults(query, limit, filterResult);
  }

  const url = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(query)}&source=web_search_result_notes`;
  return cap.goto(url, {
    ...input,
    query,
    step: 'read'
  });
}

async function applySearchControls(filters, waitMs) {
  const resultTypeResult = await applyResultType(filters.resultType, waitMs);
  const filterResult = await applyFilters(filters, waitMs);

  return {
    applied: Boolean(resultTypeResult.applied || filterResult.applied),
    resultType: resultTypeResult,
    filters: filterResult.filters || {},
    errors: [
      ...(resultTypeResult.error ? [resultTypeResult.error] : []),
      ...(filterResult.errors || []),
      ...(filterResult.error ? [filterResult.error] : [])
    ]
  };
}

async function applyResultType(value, waitMs) {
  if (!value) {
    return {
      applied: false
    };
  }

  const labels = {
    all: '全部',
    image: '图文',
    video: '视频',
    user: '用户'
  };
  const label = labels[value];
  if (!label) {
    return {
      applied: false,
      error: `Unsupported resultType: ${value}`
    };
  }

  const tab = findResultTypeTab(label);
  if (!tab) {
    return {
      applied: false,
      value,
      label,
      error: `Result type tab not found: ${label}`
    };
  }

  const alreadyActive = String(tab.className || '').split(/\s+/).includes('active');
  if (!alreadyActive) {
    const rect = tab.getBoundingClientRect();
    await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.waitForTimeout(waitMs);
  }

  return {
    applied: !alreadyActive,
    value,
    label,
    alreadyActive
  };
}

async function applyFilters(filters, waitMs) {
  const entries = filterEntries(filters);
  if (!entries.length) return { applied: false, filters: {} };

  const panel = await openFilterPanel();
  if (!panel.ok) return panel;

  const applied = {};
  const errors = [];

  for (const entry of entries) {
    const option = findFilterOption(entry.groupLabel, entry.label);
    if (!option) {
      errors.push(`Filter option not found: ${entry.groupLabel} / ${entry.label}`);
      continue;
    }

    const rect = option.getBoundingClientRect();
    await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.waitForTimeout(350);
    applied[entry.key] = entry.value;
  }

  if (entries.length) {
    await page.waitForTimeout(waitMs);
  }

  await closeFilterPanel();

  return {
    applied: Object.keys(applied).length > 0,
    filters: applied,
    errors
  };
}

async function openFilterPanel() {
  if (findOpenFilterPanel()) {
    return {
      ok: true,
      alreadyOpen: true
    };
  }

  await page.mouse.move(1200, 100);
  await page.waitForTimeout(300);

  const filter = [...document.querySelectorAll('.search-layout__top .filter, .filter')]
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    })
    .at(-1);

  if (!filter) {
    return {
      applied: false,
      ok: false,
      error: 'Search filter button was not found.'
    };
  }

  const rect = filter.getBoundingClientRect();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.waitForTimeout(800);

  if (!findOpenFilterPanel()) {
    dispatchHoverEvents(filter);
    await page.waitForTimeout(500);
  }

  if (!findOpenFilterPanel()) {
    return {
      applied: false,
      ok: false,
      error: 'Search filter panel did not open.'
    };
  }

  return {
    ok: true
  };
}

async function closeFilterPanel() {
  const panel = findOpenFilterPanel();
  if (!panel) return true;

  const collapse = [...panel.querySelectorAll('.operation-container .tags, .operation-container *')]
    .map((element) => ({
      element,
      text: normalize(element.innerText || element.textContent),
      rect: element.getBoundingClientRect(),
      opacity: Number(getComputedStyle(element).opacity)
    }))
    .filter((item) => item.text === '收起' && item.rect.width > 0 && item.rect.height > 0 && item.opacity > 0.01)
    .sort((a, b) => b.rect.width - a.rect.width)[0]?.element;

  if (collapse) {
    const rect = collapse.getBoundingClientRect();
    await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.waitForTimeout(500);
  }

  return !findOpenFilterPanel();
}

function dispatchHoverEvents(element) {
  const rect = element.getBoundingClientRect();
  const init = {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    clientX: rect.x + rect.width / 2,
    clientY: rect.y + rect.height / 2,
    pointerType: 'mouse',
    isPrimary: true
  };
  for (const type of ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'mousemove']) {
    try {
      element.dispatchEvent(type.startsWith('pointer') && window.PointerEvent ? new PointerEvent(type, init) : new MouseEvent(type, init));
    } catch {
      // Ignore unsupported synthetic event shapes in older runtimes.
    }
  }
}

function findFilterOption(groupLabel, label) {
  const panel = findOpenFilterPanel();
  if (!panel) return null;

  const group = [...panel.querySelectorAll('.filters')]
    .find((element) => normalize(element.querySelector(':scope > span')?.textContent) === groupLabel);
  if (!group) return null;

  return [...group.querySelectorAll('.tags')]
    .map((element) => ({
      element,
      text: normalize(element.innerText || element.textContent),
      rect: element.getBoundingClientRect(),
      opacity: Number(getComputedStyle(element).opacity)
    }))
    .filter((item) => item.text === label && item.rect.width > 0 && item.rect.height > 0 && item.opacity > 0.01)
    .sort((a, b) => b.rect.width - a.rect.width)[0]?.element || null;
}

function findOpenFilterPanel() {
  return [...document.querySelectorAll('.filter-panel')]
    .find((panel) => {
      const rect = panel.getBoundingClientRect();
      const style = getComputedStyle(panel);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.01;
    }) || null;
}

function findResultTypeTab(label) {
  return [...document.querySelectorAll('.search-layout__top .channel, .channel')]
    .map((element) => ({
      element,
      text: normalize(element.innerText || element.textContent),
      rect: element.getBoundingClientRect(),
      opacity: Number(getComputedStyle(element).opacity)
    }))
    .filter((item) => item.text === label && item.rect.width > 0 && item.rect.height > 0 && item.opacity > 0.01)
    .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x)[0]?.element || null;
}

function normalizeFilters(input) {
  return input.filters || {};
}

function filterEntries(filters) {
  const mappings = {
    sort: {
      groupLabel: '排序依据',
      labels: {
        comprehensive: '综合',
        latest: '最新',
        mostLiked: '最多点赞',
        mostCommented: '最多评论',
        mostCollected: '最多收藏'
      }
    },
    noteType: {
      groupLabel: '笔记类型',
      labels: {
        all: '不限',
        video: '视频',
        image: '图文'
      }
    },
    publishTime: {
      groupLabel: '发布时间',
      labels: {
        all: '不限',
        day: '一天内',
        week: '一周内',
        halfYear: '半年内'
      }
    },
    searchScope: {
      groupLabel: '搜索范围',
      labels: {
        all: '不限',
        viewed: '已看过',
        unseen: '未看过',
        followed: '已关注'
      }
    },
    distance: {
      groupLabel: '位置距离',
      labels: {
        all: '不限',
        sameCity: '同城',
        nearby: '附近'
      }
    }
  };

  return Object.entries(mappings)
    .map(([key, config]) => {
      const value = filters[key];
      const label = config.labels[value];
      if (!label) return null;
      return {
        key,
        value,
        groupLabel: config.groupLabel,
        label
      };
    })
    .filter(Boolean);
}

function readSearchResults(query, limit, filterResult = { applied: false, filters: {} }) {
  const resultType = filterResult.resultType?.value || activeResultType() || 'all';
  const isUserResult = resultType === 'user';
  const items = isUserResult ? readUserResults(limit) : readNoteResults(limit);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    query,
    filters: filterResult,
    filterPanelOpen: Boolean(findOpenFilterPanel()),
    resultType,
    count: items.length,
    [isUserResult ? 'users' : 'notes']: items
  };
}

function readNoteResults(limit) {
  return [...document.querySelectorAll('#exploreFeeds .note-item, .feeds-container .note-item, .search-content .note-item, .note-item')]
    .filter(isVisibleInViewport)
    .slice(0, limit)
    .map(readCard)
    .filter((card) => card.noteId || card.title);
}

function readUserResults(limit) {
  const root = document.querySelector('.search-layout__main, .search-content') || document;
  const resultLeft = resultContentLeft();
  const candidates = [
    ...root.querySelectorAll('.user-list .user-item, .search-user-item, .user-item, a[href*="/user/profile/"]')
  ];
  const unique = [...new Set(candidates.map((element) => element.closest('.user-item, .search-user-item, a[href*="/user/profile/"]') || element))]
    .filter((element) => isVisibleInViewport(element) && element.getBoundingClientRect().left >= resultLeft - 8)
    .slice(0, limit);

  return unique.map(readUserCard).filter((user) => user.userId || user.name || user.href);
}

function readUserCard(card, index) {
  const rect = card.getBoundingClientRect();
  const text = normalize(card.innerText || card.textContent);
  const link = card.matches('a[href]') ? card : card.querySelector('a[href*="/user/profile/"], a[href]');
  const href = absoluteUrl(link?.getAttribute('href')) || '';
  const image = findAvatar(card);
  const name = readUserName(card, text);

  return {
    index,
    userId: extractUserId(href),
    name,
    href,
    avatar: image,
    text,
    rect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  };
}

function readUserName(card, text) {
  const explicit = normalize(card.querySelector('.user-name, .name')?.textContent);
  if (explicit) return explicit;

  return normalize(text)
    .split(/小红书号：|粉丝・|笔记・|关注/)
    .map((part) => normalize(part))
    .map((part) => part.replace(/\s*\d+(?:分钟|小时|天|周|月|年)前更新$/, '').trim())
    .find(Boolean) || '';
}

function resultContentLeft() {
  const tabs = [...document.querySelectorAll('.search-layout__top .channel, .channel')]
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0);
  if (tabs.length) return Math.min(...tabs.map((rect) => rect.left));

  const main = document.querySelector('.search-layout__main, .search-content');
  return main?.getBoundingClientRect().left || 0;
}

function findAvatar(root) {
  return [...root.querySelectorAll('img')]
    .map((img) => {
      const rect = img.getBoundingClientRect();
      return { src: img.currentSrc || img.src || '', width: Math.round(rect.width), height: Math.round(rect.height), area: rect.width * rect.height };
    })
    .filter((img) => img.src && img.width >= 20 && img.height >= 20)
    .sort((a, b) => b.area - a.area)[0]?.src || '';
}

function activeResultType() {
  const active = [...document.querySelectorAll('.search-layout__top .channel.active, .channel.active')]
    .map((element) => normalize(element.innerText || element.textContent))
    .find(Boolean);
  const values = {
    '全部': 'all',
    '图文': 'image',
    '视频': 'video',
    '用户': 'user'
  };
  return values[active] || '';
}

function readCard(card, index) {
  const rect = card.getBoundingClientRect();
  const text = normalize(card.innerText);
  const link = card.querySelector('a[href*="/explore/"], a[href*="/discovery/item/"], a[href]');
  const href = absoluteUrl(link?.getAttribute('href')) || noteHrefFromCard(card);
  const noteId = extractNoteId(href) || card.getAttribute('data-note-id') || '';
  const image = findImage(card);
  const lines = text.split(' ').filter(Boolean);

  return {
    index,
    noteId,
    title: normalize(card.querySelector('.title, .note-title, [class*="title"]')?.textContent) || lines.slice(0, Math.max(1, lines.length - 2)).join(' '),
    author: normalize(card.querySelector('.author, .name, [class*="author"], [class*="name"]')?.textContent) || lines.at(-2) || '',
    metric: lines.at(-1) || '',
    href,
    coverImage: image,
    text,
    rect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  };
}

function findImage(root) {
  const image = [...root.querySelectorAll('img')]
    .map((img) => {
      const rect = img.getBoundingClientRect();
      return { src: img.currentSrc || img.src || '', width: Math.round(rect.width), height: Math.round(rect.height), area: rect.width * rect.height };
    })
    .filter((img) => img.src && img.width >= 40 && img.height >= 40 && !img.src.includes('sns-avatar'))
    .sort((a, b) => b.area - a.area)[0];
  if (image) return image.src;
  return [...root.querySelectorAll('*')].map((element) => getComputedStyle(element).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1] || '').find(Boolean) || '';
}

function noteHrefFromCard(card) {
  const match = card.outerHTML.match(/\/(?:explore|discovery\/item)\/[0-9a-fA-F]+[^"' <]*/);
  return match ? absoluteUrl(match[0]) : '';
}

function extractNoteId(value) {
  return String(value || '').match(/\/(?:explore|discovery\/item)\/([0-9a-fA-F]+)/)?.[1] || '';
}

function extractUserId(value) {
  return String(value || '').match(/\/user\/profile\/([^/?#]+)/)?.[1] || '';
}

function isVisible(element) {
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
}

function isVisibleInViewport(element) {
  const rect = element.getBoundingClientRect();
  return isVisible(element) && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
}

function normalize(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function absoluteUrl(href) {
  if (!href) return '';
  try {
    return new URL(href, location.origin).href;
  } catch {
    return '';
  }
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(number, max));
}
