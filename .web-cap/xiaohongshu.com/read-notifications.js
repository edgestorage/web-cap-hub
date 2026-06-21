/**
 * web-cap script
 *
 * @description Read Xiaohongshu notification items from the notification page.
 * @param {object} [input]
 * @param {string} [input.category] Notification tab to read: mentions, likes, or follows. Defaults to the active tab.
 * @param {number} [input.limit=30] Maximum visible notification items to return.
 * @param {number} [input.waitMs=1200] Milliseconds to wait after navigation or tab switch.
 * @returns {{ ok: boolean, url: string, title: string, category?: string, unreadCounts?: object, count?: number, notifications?: object[], error?: string }}
 * @match https://www.xiaohongshu.com/notification
 */
export default async function (input = {}) {
  const limit = clampNumber(input.limit, 30, 1, 200);
  const waitMs = clampNumber(input.waitMs, 1200, 300, 8000);
  const category = normalizeCategory(input.category);

  if (input.step === 'read') {
    await page.waitForTimeout(waitMs);
    const switched = await switchCategory(category, waitMs);
    if (!switched.ok) {
      return {
        ok: false,
        url: location.href,
        title: document.title,
        error: switched.error
      };
    }
    return readNotifications(limit);
  }

  if (!/xiaohongshu\.com\/notification/.test(location.href)) {
    return cap.goto('https://www.xiaohongshu.com/notification', {
      ...input,
      step: 'read'
    });
  }

  await page.waitForTimeout(waitMs);
  const switched = await switchCategory(category, waitMs);
  if (!switched.ok) {
    return {
      ok: false,
      url: location.href,
      title: document.title,
      error: switched.error
    };
  }
  return readNotifications(limit);
}

async function switchCategory(category, waitMs) {
  if (!category) return { ok: true, switched: false };

  const tab = findTab(category.label);
  if (!tab) {
    return {
      ok: false,
      error: `Notification tab not found: ${category.label}`
    };
  }

  if (isActiveTab(tab)) {
    return { ok: true, switched: false };
  }

  const rect = tab.getBoundingClientRect();
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.waitForTimeout(waitMs);

  return { ok: true, switched: true };
}

function readNotifications(limit) {
  const pageRoot = document.querySelector('.notification-page') || document.body;
  const contentRoot = pageRoot.querySelector('.tabs-content-container') || pageRoot;
  const notifications = [...contentRoot.querySelectorAll(':scope > .container, .notification-item, [class*="notification-item"]')]
    .filter(isVisible)
    .slice(0, limit)
    .map(readNotification)
    .filter((item) => item.text || item.user.name || item.action);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    category: activeCategory(),
    unreadCounts: readUnreadCounts(),
    count: notifications.length,
    notifications
  };
}

function readNotification(item, index) {
  const rect = item.getBoundingClientRect();
  const text = normalize(item.innerText || item.textContent);
  const userLink = item.querySelector('.user-info a[href*="/user/profile/"], a.user-avatar[href*="/user/profile/"], a[href*="/user/profile/"]');
  const noteLink = [...item.querySelectorAll('a[href*="/explore/"], a[href*="/discovery/item/"]')]
    .find((link) => !/\/user\/profile\//.test(link.getAttribute('href') || ''));
  const image = findImage(item);
  const action = extractAction(item);
  const time = normalize(item.querySelector('.interaction-time')?.textContent) || extractTime(text);
  const content = normalize(item.querySelector('.interaction-content')?.textContent);
  const quote = normalize(item.querySelector('.quote-info')?.textContent);

  return {
    index,
    category: activeCategory(),
    user: {
      name: normalize(userLink?.textContent) || extractUserName(text, action),
      href: absoluteUrl(userLink?.getAttribute('href')),
      avatar: findAvatar(item)
    },
    action,
    time,
    content,
    quote,
    noteId: extractNoteId(noteLink?.getAttribute('href')),
    noteHref: absoluteUrl(noteLink?.getAttribute('href')),
    image,
    text,
    rect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  };
}

function readUnreadCounts() {
  const counts = {};
  for (const tab of readTabs()) {
    counts[tab.category] = tab.countNumber;
  }
  return counts;
}

function readTabs() {
  return [...document.querySelectorAll('.notification-page .reds-tab-item, .reds-tabs-list .tab-item')]
    .filter(isVisible)
    .map((tab) => {
      const text = normalize(tab.innerText || tab.textContent);
      const label = Object.values(categoryMap()).find((item) => text.includes(item.label));
      return {
        category: label?.value || '',
        label: label?.label || text,
        active: isActiveTab(tab),
        countNumber: parseCount(tab.querySelector('.count')?.textContent || text.match(/\b(\d+)\b/)?.[1])
      };
    })
    .filter((tab) => tab.category);
}

function extractAction(item) {
  const hint = item.querySelector('.interaction-hint');
  if (!hint) return '';

  const textParts = [...hint.querySelectorAll('span')]
    .map((element) => normalize(element.textContent))
    .filter(Boolean)
    .filter((text) => !/^\d{2}-\d{2}$/.test(text) && !/^\d+\s*(?:分钟|小时|天)前$/.test(text));

  return textParts[0] || normalize(hint.textContent).replace(/\d{2}-\d{2}|\d+\s*(?:分钟|小时|天)前/g, '').trim();
}

function activeCategory() {
  return readTabs().find((tab) => tab.active)?.category || '';
}

function findTab(label) {
  return [...document.querySelectorAll('.notification-page .reds-tab-item, .reds-tabs-list .tab-item')]
    .filter(isVisible)
    .find((tab) => normalize(tab.innerText || tab.textContent).includes(label)) || null;
}

function isActiveTab(tab) {
  return String(tab.className || '').split(/\s+/).includes('active');
}

function normalizeCategory(value) {
  if (!value) return null;
  const category = categoryMap()[value];
  return category || null;
}

function categoryMap() {
  return {
    mentions: { value: 'mentions', label: '评论和@' },
    likes: { value: 'likes', label: '赞和收藏' },
    follows: { value: 'follows', label: '新增关注' }
  };
}

function findImage(root) {
  return [...root.querySelectorAll('img')]
    .map((img) => {
      const rect = img.getBoundingClientRect();
      return {
        src: img.currentSrc || img.src || '',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        area: rect.width * rect.height
      };
    })
    .filter((img) => img.src && img.width >= 32 && img.height >= 32 && !img.src.includes('sns-avatar') && !img.src.includes('avatar'))
    .sort((a, b) => b.area - a.area)[0]?.src || '';
}

function findAvatar(root) {
  return [...root.querySelectorAll('img')]
    .map((img) => {
      const rect = img.getBoundingClientRect();
      return {
        src: img.currentSrc || img.src || '',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        area: rect.width * rect.height
      };
    })
    .filter((img) => img.src && img.width >= 20 && img.height >= 20 && (img.src.includes('sns-avatar') || img.src.includes('avatar')))
    .sort((a, b) => b.area - a.area)[0]?.src || '';
}

function extractUserName(text, action) {
  if (!text) return '';
  if (action) return normalize(text.split(action)[0]);
  return normalize(text.split(/\d{2}-\d{2}|\d+\s*(?:分钟|小时|天)前/)[0]);
}

function extractTime(text) {
  return text.match(/\b\d{2}-\d{2}\b|\d+\s*(?:分钟|小时|天)前/)?.[0] || '';
}

function extractNoteId(value) {
  return String(value || '').match(/\/(?:explore|discovery\/item)\/([0-9a-fA-F]+)/)?.[1] || '';
}

function parseCount(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const match = text.match(/^([\d.]+)(万)?\+?$/);
  if (!match) return null;
  const number = Number(match[1]);
  if (!Number.isFinite(number)) return null;
  return match[2] ? Math.round(number * 10000) : number;
}

function isVisible(element) {
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
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
