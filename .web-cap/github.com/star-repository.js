/**
 * web-cap script
 *
 * @description Preview or toggle GitHub repository star state through the visible UI.
 * @param {object} input
 * @param {string} [input.url] Repository URL.
 * @param {string} [input.owner] Repository owner, used with repo.
 * @param {string} [input.repo] Repository name, used with owner.
 * @param {boolean} [input.star=true] Desired starred state.
 * @param {boolean} [input.confirm=false] Must be true to click the page button.
 * @returns {{ ok: boolean, url: string, repository?: string, currentState?: string, desiredState?: string, action?: string, executed?: boolean, message?: string }}
 * @match https://github.com/*
 */
export default async function (input = {}) {
  const repoUrl = repoUrlFromInput(input);
  if (!repoUrl) return errorResult('Provide input.url or input.owner and input.repo, or run on a repository page.');
  if (location.href !== repoUrl.href) return cap.goto(repoUrl.href, { ...input, ready: true });

  const desiredStarred = input.star ?? true;
  const button = await findStarButton(desiredStarred);
  if (!button) return { ok: false, error: 'Star button not found', url: location.href, title: document.title };

  const buttonText = await starButtonStateText(button);
  const isStarred = /Starred|Unstar|click to unstar/i.test(buttonText);
  const actionNeeded = desiredStarred !== isStarred;
  const repository = repoUrl.pathname.split('/').filter(Boolean).slice(0, 2).join('/');

  if (!input.confirm || !actionNeeded) {
    return {
      ok: true,
      url: location.href,
      repository,
      currentState: isStarred ? 'starred' : 'unstarred',
      desiredState: desiredStarred ? 'starred' : 'unstarred',
      action: actionNeeded ? (desiredStarred ? 'star' : 'unstar') : 'none',
      executed: false,
      message: actionNeeded ? 'Preview only. Pass confirm:true to execute.' : 'Repository already matches desired state.'
    };
  }

  await button.click();
  await page.waitForTimeout(800);
  const afterButton = await findStarButton(!desiredStarred);
  const afterText = afterButton ? await starButtonStateText(afterButton) : '';
  const afterStarred = /Starred|Unstar|click to unstar/i.test(afterText);

  return {
    ok: true,
    url: location.href,
    repository,
    currentState: afterStarred ? 'starred' : 'unstarred',
    desiredState: desiredStarred ? 'starred' : 'unstarred',
    action: desiredStarred ? 'star' : 'unstar',
    executed: true
  };
}

async function findStarButton(desiredStarred) {
  const preferred = desiredStarred
    ? [
      page.locator('button[aria-label*="Star this repository"]').first(),
      page.locator('button').filter({ hasText: /^Star\b/ }).first()
    ]
    : [
      page.locator('button[aria-label*="click to unstar"]').first(),
      page.locator('button[aria-label*="Unstar"]').first(),
      page.locator('button').filter({ hasText: /Starred|Unstar/ }).first()
    ];
  const candidates = [
    ...preferred,
    page.getByRole('button', { name: /Star|Unstar|Starred/ }).first(),
    page.locator('button, summary').filter({ hasText: /Star|Unstar|Starred/ }).first()
  ];
  for (const candidate of candidates) {
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return null;
}

async function starButtonStateText(locator) {
  const text = normalize(await locator.textContent().catch(() => ''));
  const aria = normalize(await locator.getAttribute('aria-label').catch(() => ''));
  const title = normalize(await locator.getAttribute('title').catch(() => ''));
  return `${aria} ${title} ${text}`.trim();
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
