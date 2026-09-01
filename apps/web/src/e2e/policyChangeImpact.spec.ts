/**
 * E2E：ポリシー変更→変更影響表示（requirements.md 9.2節のシーケンス図、issue #35受け入れ条件）。
 */
import { expect, test } from '@playwright/test';

test('サンプル読込後に全体方針の重みを変更すると、変更影響一覧に表示される', async ({ page }) => {
  await page.goto('/');

  const sampleButton = page.getByRole('button', { name: 'サンプル組織を読み込む' });
  await expect(sampleButton).toBeVisible();
  await sampleButton.click();
  await expect(page.getByText(/次元3件・ポリシー6件・タスク12件を読み込みました。/)).toBeVisible();

  // F2：ポリシー管理画面で「全体方針」の重みを大きく変更する。
  const nav = page.getByRole('navigation', { name: 'メインナビゲーション' });
  await nav.getByRole('link', { name: 'ポリシー管理' }).click();
  await expect(page.getByRole('heading', { name: 'ポリシー管理' })).toBeVisible();

  await page.getByRole('button', { name: '全体方針を編集する' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('品質重み').fill('0.9');
  await dialog.getByLabel('コスト重み').fill('0.05');
  await dialog.getByLabel('速度重み').fill('0.05');
  await dialog.getByRole('button', { name: '保存する' }).click();

  await expect(page.getByText('保存しました。')).toBeVisible();
  await expect(dialog).toBeHidden();

  // F8：変更影響一覧で、変更前→変更後が確認できる。
  await nav.getByRole('link', { name: '変更影響' }).click();
  await expect(page.getByRole('heading', { name: '変更影響' })).toBeVisible();
  await expect(page.getByText('直近の変更による影響はありません。')).toBeHidden();
  await expect(page.getByRole('columnheader', { name: '変更種別' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'ポリシーの変更' }).first()).toBeVisible();
});
