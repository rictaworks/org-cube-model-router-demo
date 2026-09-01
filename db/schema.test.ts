import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// requirements.md 6章（データ仕様）・7章（ER図）に対応するスキーマの検証テスト。
// Issue #4 受け入れ条件:
//   - 6章の全12テーブルが定義されている
//   - モデルカタログを除く全テーブルにセッションID（オーナーキー）列を持つ（13.3節）
//   - 参照はすべてIDで保持する（6章冒頭・13.1節）
//   - sqlite3等でCREATE文がエラーなく実行できる

const currentDir = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(currentDir, 'schema.sql');

const REQUIRED_TABLES = [
  'sessions',
  'dimensions',
  'dimension_values',
  'policies',
  'policy_selectors',
  'tasks',
  'task_positions',
  'model_catalog',
  'model_overrides',
  'assignments',
  'assignment_candidates',
  'change_impacts',
] as const;

const TABLE_WITHOUT_SESSION_ID = 'model_catalog';
const TABLES_WITH_SESSION_ID = REQUIRED_TABLES.filter(
  (table) => table !== TABLE_WITHOUT_SESSION_ID,
);

interface SqliteMasterRow {
  name: string;
}

interface TableInfoRow {
  name: string;
}

function createDatabaseFromSchema(): DatabaseSync {
  const schemaSql = readFileSync(schemaPath, 'utf-8');
  const db = new DatabaseSync(':memory:');
  // 外部キー制約はD1では既定で有効だが、ローカル検証でも同条件で確認する。
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(schemaSql);
  return db;
}

function listColumnNames(db: DatabaseSync, table: string): string[] {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as TableInfoRow[];
  return columns.map((column) => column.name);
}

describe('db/schema.sql', () => {
  it('CREATE文がエラーなく実行できる', () => {
    expect(() => createDatabaseFromSchema()).not.toThrow();
  });

  it('requirements.md 6章の12テーブルすべてが定義されている', () => {
    const db = createDatabaseFromSchema();
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as unknown as SqliteMasterRow[];
    const tableNames = rows.map((row) => row.name);

    for (const table of REQUIRED_TABLES) {
      expect(tableNames).toContain(table);
    }
  });

  it('model_catalogを除く全テーブルにsession_id列を持つ（13.3節）', () => {
    const db = createDatabaseFromSchema();
    for (const table of TABLES_WITH_SESSION_ID) {
      expect(listColumnNames(db, table)).toContain('session_id');
    }
  });

  it('model_catalogはマスタデータのためsession_id列を持たない', () => {
    const db = createDatabaseFromSchema();
    expect(listColumnNames(db, TABLE_WITHOUT_SESSION_ID)).not.toContain('session_id');
  });

  it('外部キー参照に整合性違反が無い（参照はIDで保持する）', () => {
    const db = createDatabaseFromSchema();
    const violations = db.prepare('PRAGMA foreign_key_check').all();
    expect(violations).toEqual([]);
  });
});
