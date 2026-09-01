-- db/schema.sql
-- D1（SQLite互換）スキーマ定義。
-- 対応する仕様: requirements.md 6章（データ仕様）・7章（ER図）。
--
-- 設計方針（requirements.md 6章冒頭・13.1・13.3節に基づく）:
--   - model_catalog を除く全テーブルにセッションID（オーナーキー）列を持つ。
--     読み書きは常にこの列で自セッションに絞り込む（アクセス制御・A01対策）。
--   - テーブル間の参照は名称ではなく必ずID（外部キー）で保持する。
--   - bool 相当の列は SQLite に真偽型が無いため INTEGER（0/1）とし、CHECK 制約で
--     値域を明示する（想定外の値を暗黙に許容しない＝フォールバック禁止の徹底）。
--   - datetime 相当の列は SQLite に日時型が無いため ISO 8601 文字列（TEXT）とする。
--   - 集合・一覧を保持する列（許可リージョン等）は JSON 文字列（TEXT）として保持する。
--   - D1 はマイグレーション内での PRAGMA 実行を許可しないため、本ファイルに
--     PRAGMA は含めない（外部キー制約の有効化は接続側の責務とする）。

-- =========================================================
-- sessions: セッション（端末識別子。個人を特定できる情報は持たない）
-- =========================================================
CREATE TABLE sessions (
    session_id     TEXT PRIMARY KEY,
    created_at     TEXT NOT NULL,
    last_reset_at  TEXT NOT NULL
);

-- =========================================================
-- model_catalog: モデルカタログ（マスタデータ。セッションIDを持たない唯一のテーブル）
-- =========================================================
CREATE TABLE model_catalog (
    model_id            TEXT PRIMARY KEY,
    display_name        TEXT NOT NULL,
    provider             TEXT NOT NULL,
    deployment           TEXT NOT NULL CHECK (deployment IN ('クラウド', 'ローカル')),
    region                TEXT CHECK (region IS NULL OR region IN ('JP', 'US', 'EU')),
    training_opt_out     INTEGER NOT NULL CHECK (training_opt_out IN (0, 1)),
    zero_retention        INTEGER NOT NULL CHECK (zero_retention IN (0, 1)),
    context_limit         INTEGER NOT NULL CHECK (context_limit > 0),
    latency_class         TEXT NOT NULL CHECK (latency_class IN ('高速', '標準', '低速')),
    supports_image        INTEGER NOT NULL CHECK (supports_image IN (0, 1)),
    price_in_per_1k       REAL NOT NULL CHECK (price_in_per_1k >= 0),
    price_out_per_1k      REAL NOT NULL CHECK (price_out_per_1k >= 0),
    -- タスク種別ごとの能力（0〜5）を JSON オブジェクトとして保持する（5.2節）
    capabilities_json     TEXT NOT NULL
);

-- =========================================================
-- dimensions: 次元（組織を区切る軸）
-- =========================================================
CREATE TABLE dimensions (
    id             INTEGER PRIMARY KEY,
    session_id     TEXT NOT NULL REFERENCES sessions (session_id),
    name           TEXT NOT NULL,
    display_order  INTEGER NOT NULL,
    UNIQUE (session_id, name)
);

CREATE INDEX idx_dimensions_session_id ON dimensions (session_id);

-- =========================================================
-- dimension_values: 次元の値（次元に属する選択肢）
-- =========================================================
CREATE TABLE dimension_values (
    id             INTEGER PRIMARY KEY,
    dimension_id   INTEGER NOT NULL REFERENCES dimensions (id),
    session_id     TEXT NOT NULL REFERENCES sessions (session_id),
    name           TEXT NOT NULL,
    display_order  INTEGER NOT NULL,
    UNIQUE (dimension_id, name)
);

CREATE INDEX idx_dimension_values_dimension_id ON dimension_values (dimension_id);
CREATE INDEX idx_dimension_values_session_id ON dimension_values (session_id);

-- =========================================================
-- policies: ポリシー（3.3節）
-- =========================================================
CREATE TABLE policies (
    id                  INTEGER PRIMARY KEY,
    session_id          TEXT NOT NULL REFERENCES sessions (session_id),
    name                TEXT NOT NULL,
    status              TEXT NOT NULL CHECK (status IN ('ACTIVE', 'DISABLED')),
    priority            INTEGER NOT NULL,
    -- 未指定（NULL）は「継承」を意味する（3.3節）。集合はJSON配列文字列で保持する。
    allowed_regions     TEXT,
    allowed_providers   TEXT,
    banned_models       TEXT,
    require_local       INTEGER CHECK (require_local IS NULL OR require_local IN (0, 1)),
    max_cost_per_run    REAL CHECK (max_cost_per_run IS NULL OR max_cost_per_run >= 0),
    weight_quality      REAL CHECK (weight_quality IS NULL OR weight_quality >= 0),
    weight_cost         REAL CHECK (weight_cost IS NULL OR weight_cost >= 0),
    weight_latency      REAL CHECK (weight_latency IS NULL OR weight_latency >= 0),
    -- DISABLED 状態のときのみ設定される（11.2節）
    disabled_reason     TEXT
);

CREATE INDEX idx_policies_session_id ON policies (session_id);

-- =========================================================
-- policy_selectors: ポリシーのセレクタ（3.2節。次元ごとに特定の値を1件指定する）
-- session_id は policies.session_id と一致する値を持つ（読み書きの絞り込み用途、13.3節）
-- =========================================================
CREATE TABLE policy_selectors (
    policy_id      INTEGER NOT NULL REFERENCES policies (id),
    dimension_id   INTEGER NOT NULL REFERENCES dimensions (id),
    value_id       INTEGER NOT NULL REFERENCES dimension_values (id),
    session_id     TEXT NOT NULL REFERENCES sessions (session_id),
    PRIMARY KEY (policy_id, dimension_id)
);

CREATE INDEX idx_policy_selectors_session_id ON policy_selectors (session_id);

-- =========================================================
-- tasks: タスク（3.5節）
-- =========================================================
CREATE TABLE tasks (
    id                INTEGER PRIMARY KEY,
    session_id        TEXT NOT NULL REFERENCES sessions (session_id),
    name              TEXT NOT NULL,
    task_kind         TEXT NOT NULL CHECK (
        task_kind IN ('要約', '翻訳', '分類', '抽出', 'コード生成', '対話応答', '推論')
    ),
    difficulty        TEXT NOT NULL CHECK (difficulty IN ('低', '中', '高')),
    sensitivity       TEXT NOT NULL CHECK (sensitivity IN ('公開', '社内', '機密', '個人情報')),
    input_tokens      INTEGER NOT NULL CHECK (input_tokens BETWEEN 1 AND 1000000),
    output_tokens     INTEGER NOT NULL CHECK (output_tokens BETWEEN 1 AND 100000),
    latency_need      TEXT NOT NULL CHECK (latency_need IN ('対話', 'バッチ')),
    needs_image       INTEGER NOT NULL CHECK (needs_image IN (0, 1)),
    monthly_runs      INTEGER NOT NULL CHECK (monthly_runs BETWEEN 0 AND 1000000),
    -- 固定割当が無いタスクは NULL（4.7節）
    pinned_model_id   TEXT REFERENCES model_catalog (model_id)
);

CREATE INDEX idx_tasks_session_id ON tasks (session_id);

-- =========================================================
-- task_positions: タスクの組織座標（3.1節。次元ごとに値を1件持つか「未設定」）
-- session_id は tasks.session_id と一致する値を持つ（13.3節）
-- =========================================================
CREATE TABLE task_positions (
    task_id        INTEGER NOT NULL REFERENCES tasks (id),
    dimension_id   INTEGER NOT NULL REFERENCES dimensions (id),
    value_id       INTEGER NOT NULL REFERENCES dimension_values (id),
    session_id     TEXT NOT NULL REFERENCES sessions (session_id),
    PRIMARY KEY (task_id, dimension_id)
);

CREATE INDEX idx_task_positions_session_id ON task_positions (session_id);

-- =========================================================
-- model_overrides: モデルのセッション内提供停止設定（3.4節）
-- =========================================================
CREATE TABLE model_overrides (
    session_id     TEXT NOT NULL REFERENCES sessions (session_id),
    model_id       TEXT NOT NULL REFERENCES model_catalog (model_id),
    unavailable    INTEGER NOT NULL CHECK (unavailable IN (0, 1)),
    PRIMARY KEY (session_id, model_id)
);

-- =========================================================
-- assignments: タスクの割当結果（4.5節・11.1節）。タスクと1対1。
-- =========================================================
CREATE TABLE assignments (
    task_id                       INTEGER PRIMARY KEY REFERENCES tasks (id),
    session_id                    TEXT NOT NULL REFERENCES sessions (session_id),
    status                        TEXT NOT NULL CHECK (
        status IN ('ASSIGNED', 'UNASSIGNED', 'PINNED', 'PIN_VIOLATED')
    ),
    -- UNASSIGNED・PIN_VIOLATED のときは NULL（4.5節 手順1・2）
    adopted_model_id              TEXT REFERENCES model_catalog (model_id),
    estimated_cost                REAL,
    monthly_cost                  REAL,
    -- 有効制約・有効重みの合成結果、適用ポリシーID一覧、警告コード一覧はJSON文字列で保持する
    effective_constraints_json    TEXT NOT NULL,
    effective_weights_json        TEXT NOT NULL,
    applied_policy_ids            TEXT NOT NULL,
    warning_codes                 TEXT NOT NULL,
    computed_at                   TEXT NOT NULL
);

CREATE INDEX idx_assignments_session_id ON assignments (session_id);

-- =========================================================
-- assignment_candidates: モデルごとの評価行（4.3節・4.4節）
-- 再計算のたびに全件置き換える（6章冒頭）
-- =========================================================
CREATE TABLE assignment_candidates (
    task_id           INTEGER NOT NULL REFERENCES tasks (id),
    model_id          TEXT NOT NULL REFERENCES model_catalog (model_id),
    session_id        TEXT NOT NULL REFERENCES sessions (session_id),
    passed            INTEGER NOT NULL CHECK (passed IN (0, 1)),
    -- 除外理由コード一覧・警告コード一覧はJSON配列文字列で保持する（4.9節）
    reason_codes      TEXT NOT NULL,
    estimated_cost    REAL NOT NULL CHECK (estimated_cost >= 0),
    -- 得点・順位は合格時のみ設定される（4.4節）
    score_quality     REAL,
    score_cost        REAL,
    score_latency     REAL,
    score_total       REAL,
    rank              INTEGER,
    PRIMARY KEY (task_id, model_id)
);

CREATE INDEX idx_assignment_candidates_session_id ON assignment_candidates (session_id);

-- =========================================================
-- change_impacts: 変更影響（4.6節）。直近1回分のみ保持し、次の変更で置き換える。
-- =========================================================
CREATE TABLE change_impacts (
    session_id        TEXT NOT NULL REFERENCES sessions (session_id),
    task_id            INTEGER NOT NULL REFERENCES tasks (id),
    change_kind        TEXT NOT NULL,
    -- 変更前の割当が存在しない場合はNULLを許容する
    before_model_id    TEXT,
    before_status      TEXT,
    after_model_id     TEXT,
    after_status       TEXT NOT NULL,
    computed_at        TEXT NOT NULL,
    PRIMARY KEY (session_id, task_id)
);
