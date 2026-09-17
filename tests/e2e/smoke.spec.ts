import { expect, test } from '@playwright/test';

test.describe('Wardrobe Stylist smoke', () => {
  test('loads home page and switches between tabs', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText("家庭穿搭作战室 · 每天都是新篇章")).toBeVisible();
    await expect(page.getByRole('button', { name: /我的衣柜/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /搭配灵感/ })).toBeVisible();

    await page.getByRole('button', { name: /搭配灵感/ }).click();
    await expect(page.getByText("搭配工作室")).toBeVisible();

    await page.getByRole('button', { name: /我的衣柜/ }).click();
    await expect(page.getByText(/件衣物/)).toBeVisible();
  });

  test('creates a clothing item and filters by category', async ({ page }) => {
    const uniqueName = `QA Top ${Date.now()}`;
    const updatedName = `${uniqueName} Updated`;

    await page.goto('/');
    await page.getByRole('button', { name: "添加衣物" }).click();

    await expect(page.getByRole('heading', { name: "添加衣物" })).toBeVisible();
    await page.getByPlaceholder("例如：白色短袖").fill(uniqueName);
    await page.getByPlaceholder("例如：白色、蓝色、红色").fill('Blue');
    await page.getByRole('button', { name: "春季" }).click();

    const modal = page.locator('form');
    await modal.getByRole('button', { name: "添加衣物" }).click();

    await expect(page.getByText(uniqueName)).toBeVisible();

    const categoryFilter = page.locator('main select').nth(0);
    await categoryFilter.selectOption('top');
    await expect(page.getByText(uniqueName)).toBeVisible();

    await page.getByRole('button', { name: "清除" }).click();
    await expect(page.getByText(uniqueName)).toBeVisible();

    await page.getByLabel(`编辑 ${uniqueName}`).click();
    await modal.getByPlaceholder("例如：白色短袖").fill(updatedName);
    await modal.getByRole('button', { name: "保存衣物" }).click();
    await expect(page.getByText(updatedName)).toBeVisible();

    page.once('dialog', dialog => dialog.accept());
    await page.getByLabel(`删除 ${updatedName}`).click();
    await expect(page.getByText(updatedName)).toHaveCount(0);
  });

  test('opens template manager from outfits tab', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /搭配灵感/ }).click();
    await page.getByRole('button', { name: /人物照片/ }).click();

    await expect(page.getByText("上传清晰的正面全身照，背景尽量简洁，试穿效果会更好。")).toBeVisible();
    await expect(page.getByRole('button', { name: "完成" })).toBeVisible();
  });
});

test('switches theme, remembers it after reload and shares it with settings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: '界面主题' }).selectOption('paper');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');
  await page.reload();
  await expect(page.getByRole('combobox', { name: '界面主题' })).toHaveValue('paper');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');
  await page.getByRole('link', { name: '主题与设置' }).click();
  await expect(page.getByRole('button', { name: /米纸日常/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /怪盗黄/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'rebel');
  await expect(page.getByRole('combobox', { name: '界面主题' })).toHaveValue('rebel');
});
