/**
 * "cloudflare:workers" モジュール（env・exports）が参照するグローバルな
 * Cloudflare.Env 名前空間へ、apps/api のバインディング型（Env）を合成する。
 * @cloudflare/workers-types のアンビエント宣言（Request・Response・D1Database等）を
 * ルートの tsconfig.base.json（Edit scope外のため types 設定を追加できない）でも
 * 有効にするため、このファイルをトリプルスラッシュ参照の置き場所として使う
 * （tsconfig.base.json の include glob（apps配下srcのtsファイル一式）は拡張子 .d.ts にも一致する）。
 */
/// <reference types="@cloudflare/workers-types" />
import type { Env as ApiEnv } from './types.js';

declare global {
  namespace Cloudflare {
    interface Env extends ApiEnv {}
  }
}
