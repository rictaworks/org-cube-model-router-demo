/**
 * change_impacts の D1リポジトリ（F8：requirements.md 4.6節手順4）。
 * 「変更影響一覧は直近1回分を保持し、次の変更で置き換える」。
 */
import type { AssignmentStatus, ChangeImpact, ChangeKind, ModelId, TaskId } from '@org-cube-model-router-demo/router-core';

export async function replaceChangeImpacts(
  db: D1Database,
  sessionId: string,
  impacts: readonly ChangeImpact[],
  now: Date,
): Promise<void> {
  const computedAt = now.toISOString();
  const statements = [
    db.prepare('DELETE FROM change_impacts WHERE session_id = ?1').bind(sessionId),
    ...impacts.map((impact) =>
      db
        .prepare(
          `INSERT INTO change_impacts
             (session_id, change_kind, task_id, before_model_id, before_status, after_model_id, after_status, computed_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
        )
        .bind(
          sessionId,
          impact.changeKind,
          impact.taskId,
          impact.beforeModelId,
          impact.beforeStatus,
          impact.afterModelId,
          impact.afterStatus,
          computedAt,
        ),
    ),
  ];
  await db.batch(statements);
}

export interface ChangeImpactView {
  readonly id: number;
  readonly changeKind: ChangeKind;
  readonly taskId: TaskId;
  readonly taskName: string;
  readonly beforeModelId: ModelId | null;
  readonly beforeStatus: AssignmentStatus | null;
  readonly afterModelId: ModelId | null;
  readonly afterStatus: AssignmentStatus;
  readonly computedAt: string;
}

/** F8：直近1回分の変更影響一覧。 */
export async function loadChangeImpacts(db: D1Database, sessionId: string): Promise<readonly ChangeImpactView[]> {
  const { results } = await db
    .prepare(
      `SELECT ci.id AS id, ci.change_kind AS change_kind, ci.task_id AS task_id, t.name AS task_name,
              ci.before_model_id AS before_model_id, ci.before_status AS before_status,
              ci.after_model_id AS after_model_id, ci.after_status AS after_status, ci.computed_at AS computed_at
       FROM change_impacts ci
       INNER JOIN tasks t ON t.id = ci.task_id
       WHERE ci.session_id = ?1
       ORDER BY ci.id`,
    )
    .bind(sessionId)
    .all<{
      id: number;
      change_kind: string;
      task_id: number;
      task_name: string;
      before_model_id: string | null;
      before_status: string | null;
      after_model_id: string | null;
      after_status: string;
      computed_at: string;
    }>();

  return results.map((row) => ({
    id: row.id,
    changeKind: row.change_kind as ChangeKind,
    taskId: row.task_id,
    taskName: row.task_name,
    beforeModelId: row.before_model_id,
    beforeStatus: row.before_status === null ? null : (row.before_status as AssignmentStatus),
    afterModelId: row.after_model_id,
    afterStatus: row.after_status as AssignmentStatus,
    computedAt: row.computed_at,
  }));
}
