import { test, expect, chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const extensionDirectory = fileURLToPath(new URL('../../dist-extension/', import.meta.url));
const contentPath = join(extensionDirectory, 'content.js');
const fixtureURL = '/tests/fixtures/index.html';
const panelFor = (page) => page.getByRole('dialog', { name: 'Multiedit by Rex' });

async function openFixture(page) {
  await page.goto(fixtureURL);
  await expect(page.getByLabel('Product title', { exact: true })).toHaveValue('alpha AB-001');
  await page.addScriptTag({ path: contentPath });
  await expect(panelFor(page)).toBeVisible();
}

async function selectTitles(page) {
  await page.getByLabel('Product title', { exact: true }).click();
  await page.getByLabel('Alternate title', { exact: true }).click();
  await expect(panelFor(page).getByText('2 fields selected', { exact: true })).toBeVisible();
}

async function preview(page, command) {
  const panel = panelFor(page);
  await panel.getByLabel('Your command').fill(command);
  await panel.getByRole('button', { name: 'Preview changes', exact: true }).click();
  await expect(panel.getByRole('list', { name: 'Before and after preview' })).toBeVisible();
}

async function apply(page) {
  await panelFor(page).getByRole('button', { name: /^Apply to \d+ fields?$/ }).click();
}

test.use({ viewport: { width: 1360, height: 1100 } });

test('preview leaves values untouched; apply updates shared React state and native fields; undo restores without submitting', async ({ page }) => {
  await openFixture(page);
  await selectTitles(page);
  await page.getByLabel('Plain note').click();
  await preview(page, 'uppercase');
  const panel = panelFor(page);
  await expect(panel.getByRole('listitem')).toHaveCount(3);
  await expect(page.getByTestId('react-state')).toHaveText('{"title":"alpha AB-001","subtitle":"bravo CD-002"}');
  await expect(page.getByLabel('Plain note')).toHaveValue('charlie EF-003');
  await apply(page);
  await expect(page.getByLabel('Product title', { exact: true })).toHaveValue('ALPHA AB-001');
  await expect(page.getByLabel('Alternate title', { exact: true })).toHaveValue('BRAVO CD-002');
  await expect(page.getByLabel('Plain note')).toHaveValue('CHARLIE EF-003');
  await expect(page.getByTestId('react-state')).toHaveText('{"title":"ALPHA AB-001","subtitle":"BRAVO CD-002"}');
  await page.getByRole('button', { name: 'Force React render' }).click();
  await expect(page.getByLabel('Alternate title', { exact: true })).toHaveValue('BRAVO CD-002');
  const events = await page.evaluate(() => window.fixtureEvents);
  for (const id of ['product-title', 'alternate-title', 'plain-note']) {
    expect(events.filter((event) => event.id === id).map((event) => event.type)).toEqual(['input', 'change']);
  }
  await panel.getByRole('button', { name: 'Undo last edit' }).click();
  await expect(page.getByTestId('react-state')).toHaveText('{"title":"alpha AB-001","subtitle":"bravo CD-002"}');
  await expect(page.getByLabel('Plain note')).toHaveValue('charlie EF-003');
  await expect(page.getByTestId('submits')).toHaveText('0');
  await expect(panel.getByRole('button', { name: 'Undo last edit' })).toBeDisabled();
});

test('stale preview rejects the entire batch, including unchanged selected fields', async ({ page }) => {
  await openFixture(page);
  await selectTitles(page);
  await preview(page, 'uppercase');
  await page.getByRole('button', { name: 'External title update' }).click();
  await apply(page);
  await expect(panelFor(page).getByRole('status')).toContainText('Nothing was applied');
  await expect(page.getByLabel('Product title', { exact: true })).toHaveValue('external change');
  await expect(page.getByLabel('Alternate title', { exact: true })).toHaveValue('bravo CD-002');
  await expect(page.getByTestId('submits')).toHaveText('0');
});

test('undo preserves a later user/page edit and restores the remaining eligible field', async ({ page }) => {
  await openFixture(page);
  await selectTitles(page);
  await preview(page, 'uppercase');
  await apply(page);
  await page.getByRole('button', { name: 'External title update' }).click();
  await panelFor(page).getByRole('button', { name: 'Undo last edit' }).click();
  await expect(page.getByLabel('Product title', { exact: true })).toHaveValue('external change');
  await expect(page.getByLabel('Alternate title', { exact: true })).toHaveValue('bravo CD-002');
  await expect(panelFor(page).getByRole('status')).toContainText('1 changed or unavailable field skipped');
});

test('select visible excludes sensitive, hidden, readonly, disabled, and unsupported fields', async ({ page }) => {
  await openFixture(page);
  const excludedIDs = ['password', 'credential', 'payment', 'verification', 'api_token', 'read-only', 'disabled', 'disabled-child', 'quantity', 'category', 'hidden-type', 'hidden-parent', 'hidden-css', 'transparent-parent'];
  const before = await page.locator(excludedIDs.map((id) => `#${id}`).join(',')).evaluateAll((elements) => elements.map((element) => ({ id: element.id, value: element.value, outline: element.style.outline })));
  await panelFor(page).getByRole('button', { name: 'Select visible', exact: true }).click();
  await expect(panelFor(page).getByText('5 fields selected', { exact: true })).toBeVisible();
  await preview(page, 'uppercase');
  await expect(panelFor(page).getByRole('listitem')).toHaveCount(5);
  await apply(page);
  const after = await page.locator(excludedIDs.map((id) => `#${id}`).join(',')).evaluateAll((elements) => elements.map((element) => ({ id: element.id, value: element.value, outline: element.style.outline })));
  expect(after).toEqual(before);
  await expect(page.getByRole('textbox', { name: 'Rich editor', exact: true })).toHaveText('keep rich text');
  await expect(page.getByTestId('submits')).toHaveText('0');
});

test('Escape restores outlines and focus, removes selection interception, and permits reopening', async ({ page }) => {
  await page.goto(fixtureURL);
  const title = page.getByLabel('Product title', { exact: true });
  await title.focus();
  const initialStyle = await title.getAttribute('style');
  await page.addScriptTag({ path: contentPath });
  await title.click();
  await page.keyboard.press('Escape');
  await expect(panelFor(page)).toHaveCount(0);
  await expect(title).toHaveAttribute('style', initialStyle);
  await expect(title).toBeFocused();
  await title.fill('normal typing works');
  await expect(page.getByTestId('react-state')).toContainText('normal typing works');
  await page.addScriptTag({ path: contentPath });
  await expect(panelFor(page)).toBeVisible();
  await expect(panelFor(page).getByText('0 fields selected', { exact: true })).toBeVisible();
  await page.addScriptTag({ path: contentPath });
  await expect(panelFor(page)).toHaveCount(0);
});

test('a field becoming unavailable after preview blocks every planned write', async ({ page }) => {
  await openFixture(page);
  await selectTitles(page);
  await preview(page, 'uppercase');
  await page.getByLabel('Alternate title', { exact: true }).evaluate((element) => { element.readOnly = true; });
  await apply(page);
  await expect(panelFor(page).getByRole('status')).toContainText('Nothing was applied');
  await expect(page.getByTestId('react-state')).toHaveText('{"title":"alpha AB-001","subtitle":"bravo CD-002"}');
});

test('a React cascade during apply preserves the newer dependent value and reports partial work', async ({ page }) => {
  await openFixture(page);
  await page.getByLabel('Cascade next title edit').check();
  await selectTitles(page);
  await preview(page, 'uppercase');
  await apply(page);
  await expect(page.getByLabel('Product title', { exact: true })).toHaveValue('ALPHA AB-001');
  await expect(page.getByLabel('Alternate title', { exact: true })).toHaveValue('page-generated title');
  await expect(page.getByTestId('react-state')).toHaveText('{"title":"ALPHA AB-001","subtitle":"page-generated title"}');
  await expect(panelFor(page).getByRole('status')).toContainText('1 of 2 updates remain in place');
  await expect(page.getByTestId('submits')).toHaveText('0');
});

test('packaged MV3 toolbar action grants activeTab and edits real React fields from its isolated content script', async ({ baseURL }) => {
  const manifest = JSON.parse(await readFile(join(extensionDirectory, 'manifest.json'), 'utf8'));
  expect(manifest.manifest_version).toBe(3);
  expect(manifest.permissions).toEqual(['activeTab', 'scripting']);
  expect(manifest.host_permissions ?? []).toEqual([]);
  const profile = await mkdtemp(join(tmpdir(), 'multiedit-extension-'));
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium', headless: true, viewport: { width: 1360, height: 1100 },
      args: ['--enable-unsafe-extension-debugging', `--disable-extensions-except=${extensionDirectory}`, `--load-extension=${extensionDirectory}`],
    });
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
    expect(worker.url()).toMatch(/^chrome-extension:\/\/[^/]+\/worker\.js$/);
    const loaded = await worker.evaluate(() => chrome.runtime.getManifest());
    expect(loaded.name).toBe(manifest.name);
    expect(loaded.version).toBe(manifest.version);
    const extensionId = new URL(worker.url()).hostname;
    const page = await context.newPage();
    await page.goto(new URL(fixtureURL, baseURL).href);
    await page.bringToFront();
    await expect(page.getByLabel('Product title', { exact: true })).toHaveValue('alpha AB-001');
    await expect(panelFor(page)).toHaveCount(0);
    const extensionSession = await context.browser().newBrowserCDPSession();
    const { targetInfos } = await extensionSession.send('Target.getTargets', { filter: [{ type: 'tab' }] });
    const targetInfo = targetInfos.find((target) => target.url === page.url());
    expect(targetInfo, 'The fixture has an actual Chromium tab target').toBeTruthy();
    // Chromium's real action dispatch grants activeTab and invokes onClicked.
    // No manifest edits, permission grants, or page.addScriptTag injection here.
    await extensionSession.send('Extensions.triggerAction', { id: extensionId, targetId: targetInfo.targetId });
    await expect(panelFor(page)).toBeVisible();
    expect(await page.evaluate(() => typeof window.__rexMultieditV1)).toBe('undefined');
    await selectTitles(page);
    await preview(page, 'uppercase');
    await apply(page);
    await expect(page.getByTestId('react-state')).toHaveText('{"title":"ALPHA AB-001","subtitle":"BRAVO CD-002"}');
    await expect(page.getByLabel('Alternate title', { exact: true })).toHaveValue('BRAVO CD-002');
    await expect(page.getByTestId('submits')).toHaveText('0');
    await panelFor(page).getByRole('button', { name: 'Undo last edit' }).click();
    await expect(page.getByTestId('react-state')).toHaveText('{"title":"alpha AB-001","subtitle":"bravo CD-002"}');
    await extensionSession.send('Extensions.triggerAction', { id: extensionId, targetId: targetInfo.targetId });
    await expect(panelFor(page)).toHaveCount(0);
  } finally {
    await context?.close();
    await rm(profile, { recursive: true, force: true });
  }
});
