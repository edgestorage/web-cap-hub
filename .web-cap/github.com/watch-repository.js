/**
 * web-cap script
 *
 * @description Preview or change GitHub repository watch subscription through the visible UI.
 * @param {object} input
 * @param {string} [input.url] Repository URL.
 * @param {string} [input.owner] Repository owner, used with repo.
 * @param {string} [input.repo] Repository name, used with owner.
 * @param {string} [input.level=watching] Desired level: watching, not_watching, releases, ignoring, or custom.
 * @param {boolean} [input.confirm=false] Must be true to open/click the page menu.
 * @returns {{ ok: boolean, url: string, repository?: string, currentState?: string, desiredState?: string, executed?: boolean, message?: string }}
 * @match https://github.com/*
 */
export default async function (input = {}) {
  const repoUrl = repoUrlFromInput(input);
  if (!repoUrl) return errorResult('Provide input.url or input.owner and input.repo, or run on a repository page.');
  if (location.href !== repoUrl.href) return cap.goto(repoUrl.href, { ...input, ready: true });

  const desired = normalizeLevel(input.level || 'watching');
  const repository = repoUrl.pathname.split('/').filter(Boolean).slice(0, 2).join('/');
  const menuButton = await findWatchButton();
  if (!menuButton) return { ok: false, error: 'Watch button not found', url: location.href, title: document.title };
  const currentState = inferCurrentState(await watchButtonStateText(menuButton));

  if (!input.confirm || currentState === desired) {
    return {
      ok: true,
      url: location.href,
      repository,
      currentState,
      desiredState: desired,
      executed: false,
      message: currentState === desired ? 'Repository already matches desired state.' : 'Preview only. Pass confirm:true to execute.'
    };
  }

  const option = page.getByRole('menuitemradio', { name: levelLabelPattern(desired) }).first();
  if (!(await option.isVisible().catch(() => false))) {
    await menuButton.click();
    await page.waitForTimeout(300);
  }
  if (!(await option.isVisible().catch(() => false))) {
    await menuButton.click();
    await page.waitForTimeout(300);
  }
  if (!(await option.isVisible().catch(() => false))) {
    return { ok: false, error: `Watch option not visible for level: ${desired}`, url: location.href, repository, currentState, desiredState: desired };
  }
  await option.click();
  await page.waitForTimeout(800);
  const afterButton = await findWatchButton();
  const afterState = inferCurrentState(afterButton ? await watchButtonStateText(afterButton) : '');
  return { ok: true, url: location.href, repository, currentState: afterState, desiredState: desired, executed: true };
}

async function findWatchButton() {
  const candidates = [
    page.getByRole('button', { name: /Watch|Unwatch|Notifications|Not watching|Ignoring/ }).first(),
    page.locator('summary, button').filter({ hasText: /Watch|Unwatch|Notifications|Not watching|Ignoring/ }).first()
  ];
  for (const candidate of candidates) {
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return null;
}

function normalizeLevel(value) {
  const level = String(value).toLowerCase().replace(/[-\s]+/g, '_');
  if (['watching', 'not_watching', 'releases', 'ignoring', 'custom'].includes(level)) return level;
  return 'watching';
}

function inferCurrentState(text) {
  if (/Participating|@mentions|Not watching/i.test(text)) return 'not_watching';
  if (/All Activity|Watching/i.test(text)) return 'watching';
  if (/Ignoring/i.test(text)) return 'ignoring';
  if (/Releases/i.test(text)) return 'releases';
  if (/Custom/i.test(text)) return 'custom';
  if (/Unwatch|Watching|Notifications/i.test(text)) return 'watching';
  return 'unknown';
}

async function watchButtonStateText(locator) {
  const text = normalize(await locator.textContent().catch(() => ''));
  const aria = normalize(await locator.getAttribute('aria-label').catch(() => ''));
  const title = normalize(await locator.getAttribute('title').catch(() => ''));
  return `${aria} ${title} ${text}`.trim();
}

function levelLabelPattern(level) {
  const labels = {
    watching: /All Activity|Watching/i,
    not_watching: /Participating and @mentions|Not watching/i,
    releases: /Releases/i,
    ignoring: /Ignore|Ignoring/i,
    custom: /Custom/i
  };
  return labels[level] || /All Activity|Watching/i;
}

function repoUrlFromInput(input) {
  if (input.owner && input.repo) return new URL(`/${input.owner}/${input.repo}`, location.origin);
  const source = input.url ? new URL(input.url, location.origin) : new URL(location.href);
  if (source.origin !== location.origin) return null;
  const parts = source.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  return new URL(`/${parts[0]}/${parts[1]}`, location.origin);
}

function errorResult(error) {
  return { ok: false, error, url: location.href, title: document.title };
}

function normalize(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}
