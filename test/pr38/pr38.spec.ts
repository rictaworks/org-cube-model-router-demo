/**
 * PR #38（issue #35: apps/web Pages フロントエンド一式）の
 * 「非エンジニア向けユーザーテスト」欄（PR本文、pr-checkerが画面文言に合わせて記述）を
 * Playwrightで再現する自動化スクリプト。
 *
 * 対象は開発サーバーのみ（http://localhost:5173、apps/api: http://localhost:8787）。
 * 本番・ステージング環境には実行しない。
 *
 * PR本文の手順番号とテスト内のコメント・アサーションを1対1で対応させている。
 * 手順が変われば、このファイルの該当箇所だけを追随して直せばよい。
 */
import { expect, test } from '@playwright/test';

test('PR #38 非エンジニア向けユーザーテスト手順1〜5', async ({ page }) => {
  // --- 手順1 ---
  // 「ブラウザで開発サーバーのトップページ（http://localhost:5173/）を開きます。
  //   『サンプル組織を読み込む』ボタンが表示されることを確認します。」
  await test.step('手順1: トップページに「サンプル組織を読み込む」ボタンが表示される', async () => {
    await page.goto('/');
    const sampleButton = page.getByRole('button', { name: 'サンプル組織を読み込む' });
    await expect(sampleButton).toBeVisible();
  });

  // --- 手順2 ---
  // 「『サンプル組織を読み込む』ボタンを押します。
  //   『次元◯件・ポリシー◯件・タスク◯件を読み込みました。』という内容の通知が
  //   画面に表示されることを確認します。」
  await test.step('手順2: ボタン押下で「次元◯件・ポリシー◯件・タスク◯件を読み込みました。」の通知が表示される', async () => {
    const sampleButton = page.getByRole('button', { name: 'サンプル組織を読み込む' });
    await sampleButton.click();
    await expect(page.getByText(/次元\d+件・ポリシー\d+件・タスク\d+件を読み込みました。/)).toBeVisible();
  });

  // --- 手順3 ---
  // 「画面上部のメニューから『タスク管理』を押します。
  //   登録されたタスクの一覧が表示されることを確認します。」
  await test.step('手順3: 「タスク管理」メニューでタスク一覧が表示される', async () => {
    const nav = page.getByRole('navigation', { name: 'メインナビゲーション' });
    await nav.getByRole('link', { name: 'タスク管理' }).click();
    await expect(page.getByRole('heading', { name: 'タスク管理' })).toBeVisible();
    // サンプル読込によりタスクが登録されているため、一覧テーブルの行が1件以上表示される。
    const taskRows = page.locator('table.data-table tbody tr');
    await expect(taskRows.first()).toBeVisible();
    expect(await taskRows.count()).toBeGreaterThan(0);
  });

  // --- 手順4 ---
  // 「一覧のいずれかの行にある『割当・根拠を見る』を押します。
  //   『割当・根拠』という見出しの画面が表示され、『採用モデル』『得点内訳』『次点候補』の
  //   項目が確認できることを確認します。」
  await test.step('手順4: 「割当・根拠を見る」から「割当・根拠」画面へ遷移し、各項目が確認できる', async () => {
    const taskRows = page.locator('table.data-table tbody tr');
    await taskRows.first().getByRole('link', { name: '割当・根拠を見る' }).click();
    await expect(page.getByRole('heading', { name: '割当・根拠' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '採用モデル' })).toBeVisible();
    // 「得点内訳」は採用モデルが決まった場合のみ表示されるセクションである
    // （TaskAssignmentDetailPage.tsx参照）。未割当の行を引いた場合に備え、
    // 未割当であれば別の行で再試行する。
    const scoreBreakdownHeading = page.getByRole('heading', { name: '得点内訳' });
    if (!(await scoreBreakdownHeading.isVisible().catch(() => false))) {
      await page.goBack();
      const rows = page.locator('table.data-table tbody tr');
      const rowCount = await rows.count();
      let found = false;
      for (let index = 1; index < rowCount; index += 1) {
        await rows.nth(index).getByRole('link', { name: '割当・根拠を見る' }).click();
        await expect(page.getByRole('heading', { name: '割当・根拠' })).toBeVisible();
        if (await page.getByRole('heading', { name: '得点内訳' }).isVisible().catch(() => false)) {
          found = true;
          break;
        }
        await page.goBack();
      }
      expect(found).toBe(true);
    }
    await expect(page.getByRole('heading', { name: '得点内訳' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '次点候補' })).toBeVisible();
  });

  // --- 手順5 ---
  // 「画面上部のメニューから『ポリシー管理』を押します。
  //   ポリシーの一覧が表示され、『ポリシー名』『特異度』『優先度』『状態』の列が
  //   確認できることを確認します。」
  await test.step('手順5: 「ポリシー管理」メニューでポリシー一覧・各列が表示される', async () => {
    const nav = page.getByRole('navigation', { name: 'メインナビゲーション' });
    await nav.getByRole('link', { name: 'ポリシー管理' }).click();
    await expect(page.getByRole('heading', { name: 'ポリシー管理' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'ポリシー名' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '特異度' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '優先度' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '状態' })).toBeVisible();
    const policyRows = page.locator('table.data-table tbody tr');
    await expect(policyRows.first()).toBeVisible();
    expect(await policyRows.count()).toBeGreaterThan(0);
  });
});
