/**
 * 関数F：固定割当（pinModel）。requirements.md 4.7節。
 *
 * この関数は4.7節手順1〜2（固定の受理・拒否判定）のみを担う。
 * 手順3〜5（固定の保存・関数Dの再実行・固定違反の検出）は、呼び出し側が
 * この関数の結果に基づき task.pinnedModelId を更新したうえで、
 * 改めて selectModel（関数D）を実行することで満たす
 * （固定解除も同様に、pinnedModelId を null にして selectModel を再実行すればよく、
 * 常に無条件で受理されるため専用の判定関数を持たない）。
 */
import { UnknownModelError } from './errors.js';
import type { EvaluationRow, ModelId, PinDecision } from './types.js';

export interface PinModelInput {
  readonly modelId: ModelId;
  /** 対象タスクの最新の評価行（関数Cの出力）。 */
  readonly evaluationRows: readonly EvaluationRow[];
}

export function pinModel(input: PinModelInput): PinDecision {
  const row = input.evaluationRows.find((r) => r.modelId === input.modelId);
  if (row === undefined) {
    throw new UnknownModelError(input.modelId);
  }

  if (row.passed) {
    return { accepted: true, reasonCodes: [] };
  }

  return { accepted: false, reasonCodes: row.reasonCodes };
}
