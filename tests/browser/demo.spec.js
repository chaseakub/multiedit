import { test, expect } from '@playwright/test';

test('preview is non-destructive, apply changes selected fields, undo restores originals', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Select product 6', { exact: true }).uncheck();
  await page.locator('#preview-button').click();
  await expect(page.locator('#product-1')).toHaveValue('ACME - Everyday Tote');
  await expect(page.locator('#preview-panel')).toBeVisible();
  await page.locator('#apply-changes').click();
  await expect(page.locator('#product-1')).toHaveValue('Everyday tote');
  await expect(page.locator('#product-6')).toHaveValue('ACME - pocket Pen');
  await page.locator('#undo-changes').click();
  await expect(page.locator('#product-1')).toHaveValue('ACME - Everyday Tote');
  await expect(page.locator('#undo-changes')).toBeDisabled();
});

test('editing after preview invalidates it and undo preserves newer input', async ({ page }) => {
  await page.goto('/');
  await page.locator('#preview-button').click();
  await page.locator('#product-1').fill('Newer work');
  await expect(page.locator('#preview-panel')).toBeHidden();
  await page.locator('#preview-button').click();
  await page.locator('#apply-changes').click();
  await page.locator('#product-2').fill('Do not overwrite this');
  await page.locator('#undo-changes').click();
  await expect(page.locator('#product-2')).toHaveValue('Do not overwrite this');
  await expect(page.locator('#status')).toContainText('newer edits');
});

test('unsupported commands do not mutate values; reset restores the whole playground', async ({ page }) => {
  await page.goto('/');
  await page.locator('#command').fill('make this amazing');
  await page.locator('#preview-button').click();
  await expect(page.locator('#status')).toContainText('Unsupported');
  await expect(page.locator('#product-1')).toHaveValue('ACME - Everyday Tote');
  await page.locator('#product-1').fill('Changed');
  await page.locator('#reset-demo').click();
  await expect(page.locator('#product-1')).toHaveValue('ACME - Everyday Tote');
  await expect(page.locator('#selection-count')).toHaveText('6 fields selected');
});

test('core interaction works on mobile with no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#preview-button').click();
  await page.locator('#apply-changes').click();
  await expect(page.locator('#product-1')).toHaveValue('Everyday tote');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('demo performs transforms without network requests beyond the local site', async ({ page }) => {
  const externalRequests = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http') && url.hostname !== '127.0.0.1') externalRequests.push(request.url());
  });
  await page.goto('/');
  await page.locator('#preview-button').click();
  await page.locator('#apply-changes').click();
  await expect(page.locator('#status')).toContainText('6 fields updated');
  expect(externalRequests).toEqual([]);
});
