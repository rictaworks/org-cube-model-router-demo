/**
 * ルートの tsconfig.base.json（Edit scope外のため lib/types を追加できない）でも
 * DOMおよびViteクライアント型のアンビエント宣言を有効にするためのトリプルスラッシュ参照。
 * apps/api/src/env.d.ts と同じ手法（@cloudflare/workers-types の参照）を、
 * apps/web ではDOM libとViteクライアント型に対して用いる。
 * tsconfig.base.json の include glob（apps配下srcの .ts/.tsx 一式）は拡張子 .d.ts にも一致する。
 */
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference types="vite/client" />
