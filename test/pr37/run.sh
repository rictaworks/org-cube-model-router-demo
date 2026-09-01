#!/usr/bin/env bash
#
# PR #37（issue #34: apps/api Workers API一式）
# 「非エンジニア向けユーザーテスト」欄（PR本文）の手順1〜3を curl で再現する自動化スクリプト。
#
# 前提:
#   - 開発サーバー（wrangler dev）が起動していること（ENV/DEVELOPMENT.md 参照）。
#     起動していない場合は apps/api で以下を実行する:
#       npx wrangler d1 execute org-cube-model-router-demo --local --file=../../db/schema.sql
#       npm run dev --workspace apps/api   # または `cd apps/api && npx wrangler dev`
#   - このスクリプトは開発サーバーのみを対象とする（本番・ステージングには実行しない）。
#
# 手順とアサーションの対応（PR本文の番号と一致させている）:
#   1. GET /api/models    -> Aster-L・Aster-S 等、複数モデルの名前・価格情報が返る
#   2. GET /api/dimensions -> {"dimensions":[]}
#   3. GET /api/tasks      -> {"tasks":[]}
#
# 終了コード: 全手順成功で 0、いずれか失敗で 1。

set -u

BASE_URL="${BASE_URL:-http://localhost:8787}"
COOKIE_JAR="$(mktemp -d)/pr37-cookies.txt"

PASS_COUNT=0
FAIL_COUNT=0

log_pass() {
  echo "[PASS] $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

log_fail() {
  echo "[FAIL] $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

request() {
  # $1: path
  local path="$1"
  curl -s -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" -w '\n%{http_code}' "${BASE_URL}${path}"
}

# --- 手順1: GET /api/models ---
# 「Aster-L、Aster-Sなど、複数のAIモデルの名前や価格などの情報が画面に表示されることを確認します」
response="$(request /api/models)"
status="$(echo "${response}" | tail -n1)"
body="$(echo "${response}" | sed '$d')"

if [ "${status}" != "200" ]; then
  log_fail "手順1: GET /api/models が200を返しませんでした（status=${status}）"
else
  log_pass "手順1: GET /api/models が200を返しました"
fi

if echo "${body}" | grep -q '"displayName":"Aster-L"'; then
  log_pass "手順1: レスポンスにAster-Lの名前が含まれています"
else
  log_fail "手順1: レスポンスにAster-Lの名前が含まれていません"
fi

if echo "${body}" | grep -q '"displayName":"Aster-S"'; then
  log_pass "手順1: レスポンスにAster-Sの名前が含まれています"
else
  log_fail "手順1: レスポンスにAster-Sの名前が含まれていません"
fi

if echo "${body}" | grep -q '"priceInPer1k"' && echo "${body}" | grep -q '"priceOutPer1k"'; then
  log_pass "手順1: レスポンスに価格情報（priceInPer1k / priceOutPer1k）が含まれています"
else
  log_fail "手順1: レスポンスに価格情報が含まれていません"
fi

model_count="$(echo "${body}" | grep -o '"modelId"' | wc -l)"
if [ "${model_count}" -ge 2 ]; then
  log_pass "手順1: 複数（${model_count}件）のモデルが表示されています"
else
  log_fail "手順1: 表示されているモデルが1件以下です（${model_count}件）"
fi

# --- 手順2: GET /api/dimensions ---
# 「{"dimensions":[]} とだけ表示されることを確認します」
response="$(request /api/dimensions)"
status="$(echo "${response}" | tail -n1)"
body="$(echo "${response}" | sed '$d')"

if [ "${status}" = "200" ] && [ "${body}" = '{"dimensions":[]}' ]; then
  log_pass '手順2: GET /api/dimensions が {"dimensions":[]} を返しました'
else
  log_fail "手順2: GET /api/dimensions の応答が想定と異なります（status=${status}, body=${body}）"
fi

# --- 手順3: GET /api/tasks ---
# 「{"tasks":[]} とだけ表示されることを確認します」
response="$(request /api/tasks)"
status="$(echo "${response}" | tail -n1)"
body="$(echo "${response}" | sed '$d')"

if [ "${status}" = "200" ] && [ "${body}" = '{"tasks":[]}' ]; then
  log_pass '手順3: GET /api/tasks が {"tasks":[]} を返しました'
else
  log_fail "手順3: GET /api/tasks の応答が想定と異なります（status=${status}, body=${body}）"
fi

echo "---"
echo "PASS: ${PASS_COUNT}  FAIL: ${FAIL_COUNT}"

if [ "${FAIL_COUNT}" -gt 0 ]; then
  exit 1
fi

exit 0
