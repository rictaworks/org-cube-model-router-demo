/**
 * E2E：タスク登録→割当・根拠表示（requirements.md 9.1節のシーケンス図、issue #35受け入れ条件）。
 * 実際の apps/api（wrangler dev）・apps/web（vite dev server）に対して実行する
 * （playwright.config.ts の webServer 設定）。
 */
import { expect, test } from '@playwright/test';

test('サンプル読込後にタスクを登録すると、割当・根拠が表示される', async ({ page }) => {
  await page.goto('/');

  // F10：サンプル読込（次元・ポリシー・モデル提供状況の土台を作る）。
  const sampleButton = page.getByRole('button', { name: 'サンプル組織を読み込む' });
  await expect(sampleButton).toBeVisible();
  await sampleButton.click();
  await expect(page.getByText(/次元3件・ポリシー6件・タスク12件を読み込みました。/)).toBeVisible();

  // F3：タスク管理画面でタスクを新規登録する。
  const nav = page.getByRole('navigation', { name: 'メインナビゲーション' });
  await nav.getByRole('link', { name: 'タスク管理' }).click();
  await expect(page.getByRole('heading', { name: 'タスク管理' })).toBeVisible();

  await page.getByRole('button', { name: 'タスクを登録する' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  const taskName = 'E2E確認用タスク';
  await dialog.getByLabel('タスク名').fill(taskName);
  await dialog.getByLabel('種別').selectOption('summarize');
  await dialog.getByLabel('難易度').selectOption('low');
  await dialog.getByLabel('機密度').selectOption('public');
  await dialog.getByLabel('入力トークン見積').fill('500');
  await dialog.getByLabel('出力トークン見積').fill('200');
  await dialog.getByLabel('応答要求').selectOption('interactive');
  await dialog.getByLabel('月間実行回数').fill('10');
  await dialog.getByRole('button', { name: '保存する' }).click();

  await expect(page.getByText('保存しました。')).toBeVisible();
  await expect(dialog).toBeHidden();

  const taskRow = page.getByRole('row', { name: new RegExp(taskName) });
  await expect(taskRow).toBeVisible();

  // F5/F6：割当・根拠表示画面へ遷移する。
  await taskRow.getByRole('link', { name: '割当・根拠を見る' }).click();
  await expect(page.getByRole('heading', { name: '割当・根拠' })).toBeVisible();

  // 制約の少ないタスク（公開・低難易度・小トークン・対話）のため、既定重みのみが適用され
  // 割当済（何らかのモデルが採用）になるはずである（requirements.md 5.3節の全体方針のみ適用）。
  await expect(page.getByText('割当済')).toBeVisible();
  await expect(page.getByRole('heading', { name: '得点内訳' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '次点候補' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '除外モデルと理由' })).toBeVisible();
});
