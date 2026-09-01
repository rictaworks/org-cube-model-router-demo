-- db/schema.sql
-- D1（SQLite互換）スキーマ。requirements.md 6章・7章（ER図）に対応する。
--
-- 方針:
-- * model_catalog を除く全テーブルは session_id を持ち、アプリケーション層は常に
--   自セッションの session_id で絞り込んで読み書きする（requirements.md 6章・13.3節）。
-- * bool 相当の列は SQLite に真偽型が無いため INTEGER（0/1）とし、CHECK 制約で
--   値域を強制する。
-- * 値削除・タスク削除は「参照が残っていれば拒否する」業務ルール（4.1節）を
--   アプリケーション層で検証する前提で、外部キーには ON DELETE 指定を付けない
--   （既定の NO ACTION のまま。参照が残っている親行の削除を DB レベルでも防ぐ）。
-- * 個人を特定できる項目は一切持たない（requirements.md 6章）。

PRAGMA foreign_keys = ON;

-- セッション（requirements.md 1.4・13.3節：認証を持たず、Cookieの不透明なIDのみ）
CREATE TABLE IF NOT EXISTS sessions (
    session_id      TEXT PRIMARY KEY,
    created_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    last_reset_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- 次元（部門・拠点など。次元数・値数は可変：requirements.md 3.1・4.1節）
CREATE TABLE IF NOT EXISTS dimensions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT NOT NULL REFERENCES sessions (session_id),
    name            TEXT NOT NULL,
    display_order   INTEGER NOT NULL,
    UNIQUE (session_id, name)
);

CREATE INDEX IF NOT EXISTS idx_dimensions_session ON dimensions (session_id);

-- 次元の値
CREATE TABLE IF NOT EXISTS dimension_values (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    dimension_id    INTEGER NOT NULL REFERENCES dimensions (id),
    session_id      TEXT NOT NULL REFERENCES sessions (session_id),
    name            TEXT NOT NULL,
    display_order   INTEGER NOT NULL,
    UNIQUE (dimension_id, name)
);

CREATE INDEX IF NOT EXISTS idx_dimension_values_session ON dimension_values (session_id);
CREATE INDEX IF NOT EXISTS idx_dimension_values_dimension ON dimension_values (dimension_id);

-- ポリシー（requirements.md 3.3節：制約・重み・優先度。無効化は削除ではなく status='disabled'）
CREATE TABLE IF NOT EXISTS policies (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id          TEXT NOT NULL REFERENCES sessions (session_id),
    name                TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    priority            INTEGER NOT NULL DEFAULT 0,
    -- 制約項目は未指定＝継承（NULL）。指定時はJSON配列またはJSON値として保持する。
    allowed_regions     TEXT,       -- JSON配列 例: '["EU"]'。NULL＝全リージョン許可
    allowed_providers   TEXT,       -- JSON配列。NULL＝全プロバイダ許可
    banned_models       TEXT,       -- JSON配列。NULL相当は空配列 '[]'
    require_local       INTEGER NOT NULL DEFAULT 0 CHECK (require_local IN (0, 1)),
    max_cost_per_run    REAL,       -- NULL＝上限なし
    weight_quality      REAL,       -- NULL＝未指定（継承）
    weight_cost         REAL,
    weight_latency      REAL,
    disabled_reason     TEXT        -- 例: '次元削除'（無効化理由。4.1.4節）
);

CREATE INDEX IF NOT EXISTS idx_policies_session ON policies (session_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies (session_id, status);

-- ポリシーのセレクタ（次元ごとに特定の値を指定。記載のない次元は任意：3.2節）
CREATE TABLE IF NOT EXISTS policy_selectors (
    policy_id       INTEGER NOT NULL REFERENCES policies (id),
    dimension_id    INTEGER NOT NULL REFERENCES dimensions (id),
    value_id        INTEGER NOT NULL REFERENCES dimension_values (id),
    PRIMARY KEY (policy_id, dimension_id)
);

CREATE INDEX IF NOT EXISTS idx_policy_selectors_dimension ON policy_selectors (dimension_id);
CREATE INDEX IF NOT EXISTS idx_policy_selectors_value ON policy_selectors (value_id);

-- タスク（requirements.md 3.5節：属性一式。固定モデルは pinned_model_id）
CREATE TABLE IF NOT EXISTS tasks (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id          TEXT NOT NULL REFERENCES sessions (session_id),
    name                TEXT NOT NULL,
    task_kind           TEXT NOT NULL CHECK (
                            task_kind IN (
                                'summarize', 'translate', 'classify', 'extract',
                                'codegen', 'dialogue', 'reasoning'
                            )
                        ),
    difficulty          TEXT NOT NULL CHECK (difficulty IN ('low', 'medium', 'high')),
    sensitivity         TEXT NOT NULL CHECK (
                            sensitivity IN ('public', 'internal', 'confidential', 'personal')
                        ),
    input_tokens        INTEGER NOT NULL CHECK (input_tokens BETWEEN 1 AND 1000000),
    output_tokens       INTEGER NOT NULL CHECK (output_tokens BETWEEN 1 AND 100000),
    latency_need        TEXT NOT NULL CHECK (latency_need IN ('interactive', 'batch')),
    needs_image         INTEGER NOT NULL DEFAULT 0 CHECK (needs_image IN (0, 1)),
    monthly_runs        INTEGER NOT NULL DEFAULT 0 CHECK (monthly_runs BETWEEN 0 AND 1000000),
    pinned_model_id     TEXT REFERENCES model_catalog (model_id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks (session_id);

-- タスクの組織座標（次元ごとに値を1つ持つ。無いものは「未設定」：3.1節）
CREATE TABLE IF NOT EXISTS task_positions (
    task_id         INTEGER NOT NULL REFERENCES tasks (id),
    dimension_id    INTEGER NOT NULL REFERENCES dimensions (id),
    value_id        INTEGER NOT NULL REFERENCES dimension_values (id),
    PRIMARY KEY (task_id, dimension_id)
);

CREATE INDEX IF NOT EXISTS idx_task_positions_dimension ON task_positions (dimension_id);
CREATE INDEX IF NOT EXISTS idx_task_positions_value ON task_positions (value_id);

-- モデルカタログ（マスタデータ。セッションに紐づかず、日次リセットの対象外：4.8節）
CREATE TABLE IF NOT EXISTS model_catalog (
    model_id            TEXT PRIMARY KEY,
    display_name        TEXT NOT NULL,
    provider            TEXT NOT NULL,
    deployment          TEXT NOT NULL CHECK (deployment IN ('cloud', 'local')),
    region              TEXT CHECK (region IN ('JP', 'US', 'EU') OR region IS NULL),
    training_opt_out    INTEGER NOT NULL CHECK (training_opt_out IN (0, 1)),
    zero_retention      INTEGER NOT NULL CHECK (zero_retention IN (0, 1)),
    context_limit       INTEGER NOT NULL CHECK (context_limit > 0),
    latency_class       TEXT NOT NULL CHECK (latency_class IN ('fast', 'standard', 'slow')),
    supports_image      INTEGER NOT NULL CHECK (supports_image IN (0, 1)),
    price_in_per_1k     REAL NOT NULL CHECK (price_in_per_1k >= 0),
    price_out_per_1k    REAL NOT NULL CHECK (price_out_per_1k >= 0),
    capabilities_json   TEXT NOT NULL -- JSON: {"summarize":5,"translate":5, ...}（5.2節）
);

-- モデルの提供停止（セッション単位の切り替え。カタログ本体は変更しない：3.4節）
CREATE TABLE IF NOT EXISTS model_overrides (
    session_id      TEXT NOT NULL REFERENCES sessions (session_id),
    model_id        TEXT NOT NULL REFERENCES model_catalog (model_id),
    unavailable     INTEGER NOT NULL DEFAULT 1 CHECK (unavailable IN (0, 1)),
    PRIMARY KEY (session_id, model_id)
);

-- 割当（タスクごとに1件。再計算のたびに置き換える：6章）
CREATE TABLE IF NOT EXISTS assignments (
    task_id                     INTEGER PRIMARY KEY REFERENCES tasks (id),
    session_id                  TEXT NOT NULL REFERENCES sessions (session_id),
    status                      TEXT NOT NULL CHECK (
                                    status IN ('assigned', 'unassigned', 'pinned', 'pin_violated')
                                ),
    adopted_model_id            TEXT REFERENCES model_catalog (model_id),
    estimated_cost               REAL,
    monthly_cost                REAL,
    effective_constraints_json  TEXT NOT NULL, -- 有効制約の合成結果（JSON）
    effective_weights_json      TEXT NOT NULL, -- 有効重み（JSON）
    applied_policy_ids          TEXT NOT NULL, -- JSON配列（適用ポリシーID一覧）
    warning_codes               TEXT NOT NULL, -- JSON配列（警告コード一覧）
    computed_at                 TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_assignments_session ON assignments (session_id);

-- 評価行（モデルごとの合否・理由コード・得点。再計算のたびに全件置換：6章）
CREATE TABLE IF NOT EXISTS assignment_candidates (
    task_id             INTEGER NOT NULL REFERENCES tasks (id),
    model_id            TEXT NOT NULL REFERENCES model_catalog (model_id),
    passed              INTEGER NOT NULL CHECK (passed IN (0, 1)),
    reason_codes        TEXT NOT NULL, -- JSON配列（除外理由。該当する全件：4.3節）
    estimated_cost      REAL NOT NULL,
    score_quality       REAL,
    score_cost          REAL,
    score_latency       REAL,
    score_total         REAL,
    rank                INTEGER,
    PRIMARY KEY (task_id, model_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_candidates_task ON assignment_candidates (task_id);

-- 変更影響（直近1回分のみ保持し、次の変更で置き換える：4.6・6章）
CREATE TABLE IF NOT EXISTS change_impacts (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id          TEXT NOT NULL REFERENCES sessions (session_id),
    change_kind         TEXT NOT NULL CHECK (
                            change_kind IN (
                                'dimension', 'policy', 'task', 'model_override', 'sample_load'
                            )
                        ),
    task_id             INTEGER NOT NULL REFERENCES tasks (id),
    before_model_id     TEXT REFERENCES model_catalog (model_id),
    before_status       TEXT CHECK (
                            before_status IN ('assigned', 'unassigned', 'pinned', 'pin_violated')
                            OR before_status IS NULL
                        ),
    after_model_id      TEXT REFERENCES model_catalog (model_id),
    after_status        TEXT NOT NULL CHECK (
                            after_status IN ('assigned', 'unassigned', 'pinned', 'pin_violated')
                        ),
    computed_at         TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_change_impacts_session ON change_impacts (session_id);
