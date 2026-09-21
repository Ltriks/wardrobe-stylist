import { expect, test } from '@playwright/test';

// Mock all API traffic: exercise the real form and status polling without
// changing a family's wardrobe or starting paid image generation.
test('editing preserves multiple tops and other drafts across background refreshes', async ({ page }) => {
  const date = '2026-09-21T00:00:00Z';
  const items = [
    { id: 'top-a', name: '白色上衣', category: 'top', color: 'white' },
    { id: 'top-b', name: '蓝色上衣', category: 'top', color: 'blue' },
    { id: 'pants', name: '长裤', category: 'bottom', color: 'black' },
  ].map(item => ({ ...item, season: [], createdAt: date, updatedAt: date }));
  const outfit = {
    id: 'outfit-a', name: '原始搭配', items: [{ clothingItemId: 'top-a' }, { clothingItemId: 'pants' }],
    season: [], occasion: '原始场合', notes: '原始备注',
    boardStatus: 'generating', tryOnStatus: 'idle', createdAt: date, updatedAt: date,
  };
  let reads = 0;
  const writes: Record<string, unknown>[] = [];
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/api/outfits/outfit-a' && request.method() === 'PATCH') {
      writes.push(request.postDataJSON());
      await route.fulfill({ status: 500, json: { error: '模拟保存失败' } });
      return;
    }
    expect(request.method(), `Unexpected mutation: ${path}`).toBe('GET');
    if (path === '/api/items') await route.fulfill({ json: items });
    else if (path === '/api/outfits') { reads++; await route.fulfill({ json: [outfit] }); }
    else if (path === '/api/templates') await route.fulfill({ json: [] });
    else if (path === '/api/profiles') await route.fulfill({ json: [{ id: 'default', name: '测试衣柜' }] });
    else if (path === '/api/categories') await route.fulfill({ json: { categories: [], favorites: [], profileName: '测试衣柜' } });
    else throw new Error(`Unexpected API request: ${path}`);
  });
  await page.goto('/');
  await page.getByRole('button', { name: /搭配灵感/ }).click();
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  const form = page.getByRole('dialog', { name: '编辑搭配' });
  const name = form.locator('input[placeholder="例如：周末出游穿搭"]:visible');
  const pick = (title: string) => form.locator(`button[title="${title}"]:visible`);
  await pick('蓝色上衣').click();
  await expect(form.getByText('已选 3 件衣物', { exact: true }).filter({ visible: true })).toBeVisible();
  await name.fill('修改后的搭配');
  await form.locator('input[placeholder="例如：上学、日常、旅行"]:visible').fill('周末出游');
  await form.getByPlaceholder('记录搭配灵感、风格和细节…').fill('保留两件上衣');
  await form.getByRole('button', { name: '春季', exact: true }).filter({ visible: true }).click();
  const beforeRefresh = reads;
  await expect.poll(() => reads).toBeGreaterThan(beforeRefresh);
  // Wait for the fetched data to render, not just for the request to arrive.
  await expect(form.getByText('已选 3 件衣物', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(name).toHaveValue('修改后的搭配');
  await expect(pick('白色上衣')).toContainText('已选');
  await expect(pick('蓝色上衣')).toContainText('已选');

  await pick('长裤').click();
  const beforeSecondRefresh = reads;
  await expect.poll(() => reads).toBeGreaterThan(beforeSecondRefresh);
  await expect(pick('长裤')).toContainText('选择');
  await expect(form.getByText('已选 2 件衣物', { exact: true }).filter({ visible: true })).toBeVisible();
  await form.getByRole('button', { name: '保存搭配', exact: true }).filter({ visible: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toMatchObject({
    name: '修改后的搭配', itemIds: ['top-a', 'top-b'],
    occasion: '周末出游', season: ['spring'], notes: '保留两件上衣',
  });
  await expect(form.getByRole('button', { name: '保存搭配', exact: true }).filter({ visible: true })).toBeEnabled();
  await expect(name).toHaveValue('修改后的搭配');
  await expect(form.getByText('已选 2 件衣物', { exact: true }).filter({ visible: true })).toBeVisible();

  await form.getByRole('button', { name: '取消', exact: true }).filter({ visible: true }).click();
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await expect(name).toHaveValue('原始搭配');
  await expect(pick('蓝色上衣')).toContainText('选择');
  await expect(pick('长裤')).toContainText('已选');
  await form.getByRole('button', { name: '取消', exact: true }).filter({ visible: true }).click();
  await page.getByRole('button', { name: '创建搭配', exact: true }).click();
  const create = page.getByRole('dialog', { name: '创建搭配' });
  await expect(create.locator('input[placeholder="例如：周末出游穿搭"]:visible')).toHaveValue('');
  await expect(create.getByText('请至少选择一件衣物')).toBeVisible();
});
