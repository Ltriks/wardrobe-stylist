import { expect, test } from '@playwright/test';

test.describe('Wardrobe Stylist smoke', () => {
  test('loads home page and switches between tabs', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Wardrobe Stylist MVP 2.0')).toBeVisible();
    await expect(page.getByRole('button', { name: /Clothes \(/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Outfits \(/ })).toBeVisible();

    await page.getByRole('button', { name: /Outfits \(/ }).click();
    await expect(page.getByText('Outfit Studio')).toBeVisible();

    await page.getByRole('button', { name: /Clothes \(/ }).click();
    await expect(page.getByText(/visible items/)).toBeVisible();
  });

  test('creates a clothing item and filters by category', async ({ page }) => {
    const uniqueName = `QA Top ${Date.now()}`;
    const updatedName = `${uniqueName} Updated`;

    await page.goto('/');
    await page.getByRole('button', { name: 'Add Item' }).click();

    await expect(page.getByRole('heading', { name: 'Add New Item' })).toBeVisible();
    await page.getByPlaceholder('e.g., White T-Shirt').fill(uniqueName);
    await page.getByPlaceholder('e.g., White, Blue, Red').fill('Blue');
    await page.getByRole('button', { name: 'Spring' }).click();

    const modal = page.locator('form');
    await modal.getByRole('button', { name: 'Add Item' }).click();

    await expect(page.getByText(uniqueName)).toBeVisible();

    const categoryFilter = page.locator('select').nth(0);
    await categoryFilter.selectOption('top');
    await expect(page.getByText(uniqueName)).toBeVisible();

    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByText(uniqueName)).toBeVisible();

    await page.getByLabel(`Edit ${uniqueName}`).click();
    await modal.getByPlaceholder('e.g., White T-Shirt').fill(updatedName);
    await modal.getByRole('button', { name: 'Update Item' }).click();
    await expect(page.getByText(updatedName)).toBeVisible();

    page.once('dialog', dialog => dialog.accept());
    await page.getByLabel(`Delete ${updatedName}`).click();
    await expect(page.getByText(updatedName)).toHaveCount(0);
  });

  test('opens template manager from outfits tab', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Outfits \(/ }).click();
    await page.getByRole('button', { name: /Manage Template/ }).click();

    await expect(page.getByText('Upload a clean full-body front photo with a simple background')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Done' })).toBeVisible();
  });
});
