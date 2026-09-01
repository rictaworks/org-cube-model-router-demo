/**
 * model_catalog（マスタデータ・セッション非依存）・model_overrides（F4：提供停止）の
 * D1リポジトリ。model_catalog は日次リセットの対象外であり（requirements.md 4.8節）、
 * このファイルのみセッションIDによる絞り込みを持たない箇所を含む。
 */
import type { Model, ModelId, TaskKind } from '@org-cube-model-router-demo/router-core';
import { loadModelCatalogFixture } from '../sampleData.js';

interface ModelCatalogRow {
  readonly model_id: string;
  readonly display_name: string;
  readonly provider: string;
  readonly deployment: string;
  readonly region: string | null;
  readonly training_opt_out: number;
  readonly zero_retention: number;
  readonly context_limit: number;
  readonly latency_class: string;
  readonly supports_image: number;
  readonly price_in_per_1k: number;
  readonly price_out_per_1k: number;
  readonly capabilities_json: string;
}

function toModel(row: ModelCatalogRow): Model {
  return {
    modelId: row.model_id,
    displayName: row.display_name,
    provider: row.provider,
    deployment: row.deployment as Model['deployment'],
    region: row.region === null ? null : (row.region as Model['region']),
    trainingOptOut: row.training_opt_out === 1,
    zeroRetention: row.zero_retention === 1,
    contextLimit: row.context_limit,
    latencyClass: row.latency_class as Model['latencyClass'],
    supportsImage: row.supports_image === 1,
    priceInPer1k: row.price_in_per_1k,
    priceOutPer1k: row.price_out_per_1k,
    capabilities: JSON.parse(row.capabilities_json) as Readonly<Record<TaskKind, number>>,
  };
}

/** モデルカタログ全件を読み込む（requirements.md 3.4節：セッションに依存しないマスタデータ）。 */
export async function loadCatalog(db: D1Database): Promise<readonly Model[]> {
  const { results } = await db
    .prepare(
      `SELECT model_id, display_name, provider, deployment, region, training_opt_out, zero_retention,
              context_limit, latency_class, supports_image, price_in_per_1k, price_out_per_1k, capabilities_json
       FROM model_catalog ORDER BY model_id`,
    )
    .all<ModelCatalogRow>();
  return results.map(toModel);
}

/**
 * model_catalog が空であれば data/model_catalog.json からマスタデータを投入する。
 * D1テスト環境ではスキーマ適用のみが行われるため、リクエスト受付時に遅延シードする。
 * すでに投入済みであれば何もしない（冪等）。
 */
export async function ensureCatalogSeeded(db: D1Database): Promise<void> {
  const countRow = await db.prepare('SELECT COUNT(*) AS count FROM model_catalog').first<{ count: number }>();
  if (countRow !== null && countRow.count > 0) {
    return;
  }

  const fixture = loadModelCatalogFixture();
  const statements = fixture.map((model) =>
    db
      .prepare(
        `INSERT INTO model_catalog
           (model_id, display_name, provider, deployment, region, training_opt_out, zero_retention,
            context_limit, latency_class, supports_image, price_in_per_1k, price_out_per_1k, capabilities_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
      )
      .bind(
        model.modelId,
        model.displayName,
        model.provider,
        model.deployment,
        model.region,
        model.trainingOptOut ? 1 : 0,
        model.zeroRetention ? 1 : 0,
        model.contextLimit,
        model.latencyClass,
        model.supportsImage ? 1 : 0,
        model.priceInPer1k,
        model.priceOutPer1k,
        JSON.stringify(model.capabilities),
      ),
  );
  await db.batch(statements);
  console.log(`[catalog] seeded model_catalog with ${fixture.length} models`);
}

/** セッション内で提供停止に設定されているモデルIDの集合（requirements.md 3.4節）。 */
export async function loadUnavailableModelIds(db: D1Database, sessionId: string): Promise<ReadonlySet<ModelId>> {
  const { results } = await db
    .prepare('SELECT model_id FROM model_overrides WHERE session_id = ?1 AND unavailable = 1')
    .bind(sessionId)
    .all<{ model_id: string }>();
  return new Set(results.map((r) => r.model_id));
}

/** モデルIDがカタログに存在するかを確認する。 */
export async function modelExists(db: D1Database, modelId: string): Promise<boolean> {
  const row = await db.prepare('SELECT 1 FROM model_catalog WHERE model_id = ?1').bind(modelId).first();
  return row !== null;
}

/** F4：モデルの提供停止状態をセッション内で切り替える（upsert）。 */
export async function setModelUnavailable(
  db: D1Database,
  sessionId: string,
  modelId: string,
  unavailable: boolean,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO model_overrides (session_id, model_id, unavailable)
       VALUES (?1, ?2, ?3)
       ON CONFLICT (session_id, model_id) DO UPDATE SET unavailable = excluded.unavailable`,
    )
    .bind(sessionId, modelId, unavailable ? 1 : 0)
    .run();
}
