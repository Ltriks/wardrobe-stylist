import fs from 'fs';
import os from 'os';
import path from 'path';

import { APIRequestContext, expect, Page, test } from '@playwright/test';

type ApiItem = {
  id: string;
  name: string;
  color: string;
  category: string;
};

type ApiOutfit = {
  id: string;
  name: string;
  boardStatus?: string;
  boardImageUrl?: string;
  tryOnStatus?: string;
  tryOnImageUrl?: string;
  tryOnError?: string;
};

type ApiTemplate = {
  id: string;
  name: string;
  isDefault: boolean;
};

type SuiteState = {
  runId: string;
  tempDir: string;
  manualImagePath: string;
  batchTopPath: string;
  batchBottomPath: string;
  batchShoesPath: string;
  templatePath: string;
  manualItemName: string;
  manualUpdatedItemName: string;
  batchTopName: string;
  batchBottomName: string;
  batchShoesName: string;
  skippedDuplicateName: string;
  stalePendingName: string;
  outfitName: string;
  outfitUpdatedOccasion: string;
  templateDisplayName: string;
  staleBatchId: string | null;
  createdTemplateIds: string[];
};

const SOURCE_ROOT = 'D:\\wardrobe-stylist-windows\\wardrobe-test-80';
const SOURCE_TEMPLATE = path.join(SOURCE_ROOT, '22 copy.jpeg');
const SOURCE_TOP = path.join(SOURCE_ROOT, 'top', '01_T-Shirt_ea7b6656-3f84-4eb3-9099-23e623fc1018.jpg');
const SOURCE_BOTTOM = path.join(SOURCE_ROOT, 'bottom', '02_Pants_c995c900-693d-4dd6-8995-43f3051ec488.jpg');
const SOURCE_SHOES = path.join(SOURCE_ROOT, 'shoes', '01_Shoes_3b86d877-2b9e-4c8b-a6a2-1d87513309d0.jpg');
const POLL_INTERVAL_MS = 2_000;

const state: SuiteState = {
  runId: '',
  tempDir: '',
  manualImagePath: '',
  batchTopPath: '',
  batchBottomPath: '',
  batchShoesPath: '',
  templatePath: '',
  manualItemName: '',
  manualUpdatedItemName: '',
  batchTopName: '',
  batchBottomName: '',
  batchShoesName: '',
  skippedDuplicateName: '',
  stalePendingName: '',
  outfitName: '',
  outfitUpdatedOccasion: '',
  templateDisplayName: '',
  staleBatchId: null,
  createdTemplateIds: [],
};

test.describe.serial('Wardrobe Stylist full regression', () => {
  test.setTimeout(300_000);

  test.beforeAll(async ({ request }) => {
    assertSourceAssetsExist();

    state.runId = String(Date.now());
    state.tempDir = path.join(os.tmpdir(), 'wardrobe-stylist-e2e', state.runId);
    fs.mkdirSync(state.tempDir, { recursive: true });

    state.manualImagePath = copyAsset(SOURCE_TOP, `manual-${state.runId}-T-Shirt-spring.jpg`);
    state.batchTopPath = copyAsset(SOURCE_TOP, `batch-${state.runId}-T-Shirt-blue-spring.jpg`);
    state.batchBottomPath = copyAsset(SOURCE_BOTTOM, `batch-${state.runId}-Pants-black-autumn.jpg`);
    state.batchShoesPath = copyAsset(SOURCE_SHOES, `batch-${state.runId}-Shoes-white-winter.jpg`);
    state.templatePath = copyAsset(SOURCE_TEMPLATE, `template-${state.runId}-front-model.jpeg`);

    state.manualItemName = `E2E Manual ${state.runId}`;
    state.manualUpdatedItemName = `${state.manualItemName} Updated`;
    state.batchTopName = `E2E Batch Top ${state.runId}`;
    state.skippedDuplicateName = `E2E Batch Duplicate ${state.runId}`;
    state.batchBottomName = `E2E Batch Bottom ${state.runId}`;
    state.batchShoesName = `E2E Batch Shoes ${state.runId}`;
    state.stalePendingName = `E2E Stale Pending ${state.runId}`;
    state.outfitName = `E2E Outfit ${state.runId}`;
    state.outfitUpdatedOccasion = `Travel ${state.runId}`;
    state.templateDisplayName = path.parse(state.templatePath).name;

    await cleanupPrefixedData(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupPrefixedData(request);

    if (state.staleBatchId) {
      await request.delete(`/api/pending-items?batchId=${encodeURIComponent(state.staleBatchId)}`);
    }

    for (const templateId of state.createdTemplateIds) {
      await request.delete(`/api/templates/${templateId}`);
    }

    fs.rmSync(state.tempDir, { recursive: true, force: true });
  });

  test('supports manual clothing CRUD with image upload', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add Item' }).click();

    const form = page.locator('form');
    await form.getByPlaceholder('e.g., White T-Shirt').fill(state.manualItemName);
    await form.getByPlaceholder('e.g., White, Blue, Red').fill('Blue');
    await form.locator('input[type="file"]').setInputFiles(state.manualImagePath);
    await form.getByRole('button', { name: 'Spring' }).click();
    await form.getByRole('button', { name: 'Summer' }).click();
    await form.getByPlaceholder('Any additional notes...').fill('Created by Playwright for CRUD coverage.');
    await form.getByRole('button', { name: 'Add Item' }).click();

    await expect(page.getByText(state.manualItemName)).toBeVisible();

    const filterSelects = page.locator('section').filter({ hasText: 'Filters' }).locator('select');
    await filterSelects.nth(0).selectOption('top');
    await filterSelects.nth(1).selectOption('spring');
    await expect(page.getByText(state.manualItemName)).toBeVisible();
    await page.getByRole('button', { name: 'Clear' }).click();

    await page.getByLabel(`Edit ${state.manualItemName}`).click();
    await form.getByPlaceholder('e.g., White T-Shirt').fill(state.manualUpdatedItemName);
    await form.getByPlaceholder('e.g., White, Blue, Red').fill('Navy');
    await form.getByPlaceholder('Any additional notes...').fill('Updated by Playwright.');
    await form.getByRole('button', { name: 'Update Item' }).click();

    await expect(page.getByText(state.manualUpdatedItemName)).toBeVisible();
    await expect(page.getByText('Navy')).toBeVisible();

    page.once('dialog', dialog => dialog.accept());
    await page.getByLabel(`Delete ${state.manualUpdatedItemName}`).click();
    await expect(page.getByText(state.manualUpdatedItemName)).toHaveCount(0);
  });

  test('supports batch upload confirmation, duplicate detection, skipping, and current batch isolation', async ({ page, request }) => {
    state.staleBatchId = `stale-${state.runId}`;
    await seedStalePendingBatch(request, state.staleBatchId, state.stalePendingName);

    await page.goto('/');
    await page.locator('input[type="file"]').first().setInputFiles([
      state.batchTopPath,
      state.batchTopPath,
      state.batchBottomPath,
      state.batchShoesPath,
    ]);

    await expect(page).toHaveURL(/\/batch-confirm\?batchId=/, { timeout: 180_000 });
    await expect(page.getByRole('heading', { name: 'Batch Upload Confirmation' })).toBeVisible();
    await expect(page.getByText(state.stalePendingName)).toHaveCount(0);
    await expect(page.locator('input[placeholder="Color"]')).toHaveCount(4, { timeout: 30_000 });
    await expect(page.locator('[title]').first()).toBeVisible();

    const nameInputs = page.locator('input[type="text"]:not([placeholder="Color"])');
    const categorySelects = page.locator('select');
    const colorInputs = page.locator('input[placeholder="Color"]');

    await nameInputs.nth(0).fill(state.batchTopName);
    await nameInputs.nth(1).fill(state.skippedDuplicateName);
    await nameInputs.nth(2).fill(state.batchBottomName);
    await nameInputs.nth(3).fill(state.batchShoesName);

    await categorySelects.nth(0).selectOption('top');
    await categorySelects.nth(1).selectOption('top');
    await categorySelects.nth(2).selectOption('bottom');
    await categorySelects.nth(3).selectOption('shoes');

    await colorInputs.nth(0).fill('Blue');
    await colorInputs.nth(1).fill('Blue');
    await colorInputs.nth(2).fill('Black');
    await colorInputs.nth(3).fill('White');

    await page.getByRole('button', { name: 'Skip' }).nth(1).click();
    await expect(page.getByText('Skipped')).toBeVisible();

    await page.getByRole('button', { name: /Confirm All \(3\)/ }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 60_000 });

    await expect(page.getByText(state.batchTopName)).toBeVisible();
    await expect(page.getByText(state.batchBottomName)).toBeVisible();
    await expect(page.getByText(state.batchShoesName)).toBeVisible();
    await expect(page.getByText(state.skippedDuplicateName)).toHaveCount(0);
  });

  test('supports template upload and default selection', async ({ page, request }) => {
    const existingTemplates = await listTemplates(request);
    const existingIds = new Set(existingTemplates.map(template => template.id));

    await page.goto('/');
    await page.getByRole('button', { name: /Outfits \(/ }).click();
    await page.getByRole('button', { name: /Manage Template/ }).click();
    await expect(page.getByText('Upload a clean full-body front photo with a simple background')).toBeVisible();

    await page.locator('#template-upload').setInputFiles(state.templatePath);
    await expect(page.getByText(state.templateDisplayName)).toBeVisible({ timeout: 60_000 });

    const createdTemplate = await waitForNewTemplate(request, existingIds);
    state.createdTemplateIds.push(createdTemplate.id);

    const templateRow = getTemplateRow(page, state.templateDisplayName);

    if (await templateRow.getByRole('button', { name: 'Set Default' }).isVisible().catch(() => false)) {
      await templateRow.getByRole('button', { name: 'Set Default' }).click();
    }

    await expect(templateRow.locator('span').filter({ hasText: 'Default' }).first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Done' }).click();
  });

  test('supports outfit create, board generation, try-on generation, edit, and delete', async ({ page, request }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Outfits \(/ }).click();
    await page.getByRole('button', { name: 'Create Outfit' }).click();

    const outfitForm = page.locator('form');
    const searchInput = outfitForm.getByPlaceholder('Search by name, color, or category');
    await addOutfitPiece(page, outfitForm, searchInput, state.batchTopName);
    await addOutfitPiece(page, outfitForm, searchInput, state.batchBottomName);
    await addOutfitPiece(page, outfitForm, searchInput, state.batchShoesName);

    await outfitForm.getByPlaceholder('e.g., Weekend Coffee Run').fill(state.outfitName);
    await outfitForm.getByPlaceholder('e.g., Work, Casual, Travel').fill('Weekend');
    await outfitForm.getByRole('button', { name: 'Autumn' }).last().click();
    await outfitForm.getByPlaceholder('Any notes about balance, mood, or styling intent...').fill('Full regression outfit.');
    await outfitForm.getByRole('button', { name: 'Create Outfit' }).click();

    await expect(page.getByRole('heading', { name: state.outfitName, exact: true })).toBeVisible({ timeout: 30_000 });

    let outfit = await waitForOutfitByName(request, state.outfitName);
    expect(outfit).not.toBeNull();

    outfit = await waitForOutfitTerminalState(request, outfit!.id, 'boardStatus');
    await page.reload();
    await page.getByRole('button', { name: /Outfits \(/ }).click();
    await expect(page.getByRole('heading', { name: state.outfitName, exact: true })).toBeVisible();

    if (outfit.boardStatus === 'failed') {
      const outfitCard = getOutfitCard(page, state.outfitName);
      await outfitCard.getByRole('button', { name: /Retry Board/ }).click();
      outfit = await waitForOutfitTerminalState(request, outfit.id, 'boardStatus');
      await page.reload();
      await page.getByRole('button', { name: /Outfits \(/ }).click();
    }

    const outfitCard = getOutfitCard(page, state.outfitName);
    await outfitCard.getByRole('button', { name: 'Edit' }).click();

    const editForm = page.locator('form');
    await editForm.getByPlaceholder('e.g., Work, Casual, Travel').fill(state.outfitUpdatedOccasion);
    await editForm.getByRole('button', { name: 'Update Outfit' }).click();
    await expect(page.getByRole('heading', { name: state.outfitName, exact: true })).toBeVisible({ timeout: 30_000 });

    await outfitCard.getByRole('button', { name: 'Inspect' }).click();

    const inspectModal = page.locator('div.fixed.inset-0').last();
    await expect(inspectModal.getByText(state.outfitName, { exact: true })).toBeVisible();
    const tryOnButton = inspectModal.getByRole('button', { name: /Generate Try-On|Try-On/ }).first();
    await tryOnButton.click();

    const refreshedOutfit = await waitForOutfitByName(request, state.outfitName);
    expect(refreshedOutfit).not.toBeNull();
    const tryOnOutfit = await waitForOutfitTerminalState(request, refreshedOutfit!.id, 'tryOnStatus');

    await page.reload();
    await page.getByRole('button', { name: /Outfits \(/ }).click();
    await expect(page.getByRole('heading', { name: state.outfitName, exact: true })).toBeVisible();

    const refreshedCard = getOutfitCard(page, state.outfitName);
    if (tryOnOutfit.tryOnStatus === 'success') {
      await expect(refreshedCard.getByRole('button', { name: /View Try-On/ })).toBeVisible();
    } else {
      await expect(refreshedCard.getByText(/Try-on failed/i)).toBeVisible();
    }

    page.once('dialog', dialog => dialog.accept());
    await refreshedCard.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(state.outfitName)).toHaveCount(0);

    await page.getByRole('button', { name: /Manage Template/ }).click();
    const templateRow = getTemplateRow(page, state.templateDisplayName);

    page.once('dialog', dialog => dialog.accept());
    await templateRow.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(state.templateDisplayName)).toHaveCount(0);
    state.createdTemplateIds = [];
  });
});

function assertSourceAssetsExist() {
  for (const sourcePath of [SOURCE_TEMPLATE, SOURCE_TOP, SOURCE_BOTTOM, SOURCE_SHOES]) {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Missing test asset: ${sourcePath}`);
    }
  }
}

function copyAsset(sourcePath: string, targetFileName: string): string {
  const targetPath = path.join(state.tempDir, targetFileName);
  fs.copyFileSync(sourcePath, targetPath);
  return targetPath;
}

async function cleanupPrefixedData(request: APIRequestContext) {
  const outfits = await listOutfits(request);
  for (const outfit of outfits.filter(candidate => candidate.name.includes(state.runId))) {
    await request.delete(`/api/outfits/${outfit.id}`);
  }

  const items = await listItems(request);
  for (const item of items.filter(candidate => candidate.name.includes(state.runId))) {
    await request.delete(`/api/items/${item.id}`);
  }

  const templates = await listTemplates(request);
  for (const template of templates.filter(candidate => candidate.name.includes(state.runId))) {
    await request.delete(`/api/templates/${template.id}`);
  }

  const pendingResponse = await request.get('/api/pending-items');
  expect(pendingResponse.ok()).toBeTruthy();
  const pendingItems = (await pendingResponse.json()) as Array<{ id: string; suggestedName: string; batchId?: string }>;

  for (const pendingItem of pendingItems.filter(candidate => candidate.suggestedName.includes(state.runId))) {
    await request.delete(`/api/pending-items/${pendingItem.id}`);
  }
}

async function seedStalePendingBatch(request: APIRequestContext, batchId: string, staleName: string) {
  const response = await request.post('/api/pending-items', {
    data: {
      batchId,
      items: [
        {
          id: `stale-item-${state.runId}`,
          batchId,
          imageUrl: '/uploads/stale-placeholder.jpg',
          suggestedName: staleName,
          suggestedCategory: 'other',
          suggestedColor: 'gray',
          suggestedSeason: [],
          status: 'pending',
          categorySource: 'default',
          colorSource: 'default',
          seasonSource: 'default',
          rawPredictions: 'stale seed',
        },
      ],
    },
  });

  expect(response.ok()).toBeTruthy();
}

async function listItems(request: APIRequestContext): Promise<ApiItem[]> {
  const response = await request.get('/api/items');
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as ApiItem[];
}

async function listOutfits(request: APIRequestContext): Promise<ApiOutfit[]> {
  const response = await request.get('/api/outfits');
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as ApiOutfit[];
}

async function listTemplates(request: APIRequestContext): Promise<ApiTemplate[]> {
  const response = await request.get('/api/templates');
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as ApiTemplate[];
}

async function waitForNewTemplate(request: APIRequestContext, existingIds: Set<string>): Promise<ApiTemplate> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const templates = await listTemplates(request);
    const createdTemplate = templates.find(template => !existingIds.has(template.id) && template.name === state.templateDisplayName);
    if (createdTemplate) {
      return createdTemplate;
    }
    await delay(POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for template ${state.templateDisplayName}`);
}

async function waitForOutfitByName(request: APIRequestContext, outfitName: string): Promise<ApiOutfit | null> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const outfits = await listOutfits(request);
    const match = outfits.find(outfit => outfit.name === outfitName);
    if (match) {
      return match;
    }
    await delay(POLL_INTERVAL_MS);
  }

  return null;
}

async function waitForOutfitTerminalState(
  request: APIRequestContext,
  outfitId: string,
  field: 'boardStatus' | 'tryOnStatus',
): Promise<ApiOutfit> {
  const deadline = Date.now() + 180_000;

  while (Date.now() < deadline) {
    const outfits = await listOutfits(request);
    const outfit = outfits.find(candidate => candidate.id === outfitId);
    if (outfit && (outfit[field] === 'success' || outfit[field] === 'failed')) {
      return outfit;
    }
    await delay(POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for ${field} to finish for outfit ${outfitId}`);
}

async function addOutfitPiece(
  page: Page,
  form: ReturnType<Page['locator']>,
  searchInput: ReturnType<Page['getByPlaceholder']>,
  itemName: string,
) {
  await searchInput.fill(itemName);
  await form.locator('button[type="button"]').filter({ has: page.getByText(itemName, { exact: true }) }).first().click();
}

function getOutfitCard(page: Page, outfitName: string) {
  return page
    .locator('div.overflow-hidden.rounded-3xl')
    .filter({ has: page.getByRole('heading', { name: outfitName, exact: true }) })
    .first();
}

function getTemplateRow(page: Page, templateName: string) {
  return page
    .locator('div.flex.items-center.gap-3.p-3.rounded-lg.border')
    .filter({ has: page.getByText(templateName, { exact: true }) })
    .first();
}

function delay(timeoutMs: number) {
  return new Promise(resolve => setTimeout(resolve, timeoutMs));
}
