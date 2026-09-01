/**
 * data/sample_org.json・data/model_catalog.json を用いた統合テスト。
 *
 * requirements.md 5.3節「タスク：12件...「未割当」「固定違反」を再現できる組み合わせを
 * 含める」を検証する。名前→IDの変換は本来 apps/api（DBロード）の責務だが、
 * ここではフィクスチャの整合性を確認するために最小限の変換をテスト内で行う。
 */
import { describe, expect, it } from 'vitest';
import { recomputeAll } from './recompute.js';
import modelCatalogFixture from '../../../data/model_catalog.json';
import sampleOrgFixture from '../../../data/sample_org.json';
import type { Dimension, DimensionId, Model, Policy, Position, Task, ValueId } from './types.js';

interface SampleOrgFixture {
  readonly dimensions: readonly { name: string; displayOrder: number; values: readonly string[] }[];
  readonly policies: readonly {
    readonly name: string;
    readonly priority: number;
    readonly selector: Readonly<Record<string, string>>;
    readonly constraints?: {
      readonly allowedRegions?: readonly string[];
      readonly allowedProviders?: readonly string[];
      readonly bannedModels?: readonly string[];
      readonly requireLocal?: boolean;
      readonly maxCostPerRun?: number;
    };
    readonly weights?: { readonly quality?: number; readonly cost?: number; readonly latency?: number };
  }[];
  readonly tasks: readonly {
    readonly name: string;
    readonly taskKind: Task['taskKind'];
    readonly difficulty: Task['difficulty'];
    readonly sensitivity: Task['sensitivity'];
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly latencyNeed: Task['latencyNeed'];
    readonly needsImage: boolean;
    readonly monthlyRuns: number;
    readonly position: Readonly<Record<string, string>>;
  }[];
}

function buildFixtureState(fixture: SampleOrgFixture) {
  const dimensionIdByName = new Map<string, DimensionId>();
  const valueIdByDimensionAndName = new Map<string, ValueId>();
  let nextDimensionId = 1;
  let nextValueId = 1;

  const dimensions: Dimension[] = fixture.dimensions.map((d) => {
    const dimensionId = nextDimensionId++;
    dimensionIdByName.set(d.name, dimensionId);
    const values = d.values.map((valueName) => {
      const valueId = nextValueId++;
      valueIdByDimensionAndName.set(`${d.name}:${valueName}`, valueId);
      return { id: valueId, dimensionId, name: valueName, displayOrder: 0 };
    });
    return { id: dimensionId, name: d.name, displayOrder: d.displayOrder, values };
  });

  function toPositionOrSelector(namedMap: Readonly<Record<string, string>>): Position {
    const result: Record<DimensionId, ValueId> = {};
    for (const [dimensionName, valueName] of Object.entries(namedMap)) {
      const dimensionId = dimensionIdByName.get(dimensionName);
      const valueId = valueIdByDimensionAndName.get(`${dimensionName}:${valueName}`);
      if (dimensionId === undefined || valueId === undefined) {
        throw new Error(`サンプルデータの参照が解決できません: ${dimensionName}=${valueName}`);
      }
      result[dimensionId] = valueId;
    }
    return result;
  }

  const policies: Policy[] = fixture.policies.map((p, index) => ({
    id: index + 1,
    name: p.name,
    status: 'active',
    priority: p.priority,
    selector: toPositionOrSelector(p.selector),
    allowedRegions: p.constraints?.allowedRegions as Policy['allowedRegions'],
    allowedProviders: p.constraints?.allowedProviders,
    bannedModels: p.constraints?.bannedModels,
    requireLocal: p.constraints?.requireLocal,
    maxCostPerRun: p.constraints?.maxCostPerRun,
    weightQuality: p.weights?.quality,
    weightCost: p.weights?.cost,
    weightLatency: p.weights?.latency,
  }));

  const tasks: Task[] = fixture.tasks.map((t, index) => ({
    id: index + 1,
    name: t.name,
    taskKind: t.taskKind,
    difficulty: t.difficulty,
    sensitivity: t.sensitivity,
    inputTokens: t.inputTokens,
    outputTokens: t.outputTokens,
    latencyNeed: t.latencyNeed,
    needsImage: t.needsImage,
    monthlyRuns: t.monthlyRuns,
    position: toPositionOrSelector(t.position),
    pinnedModelId: null,
  }));

  return { dimensions, policies, tasks };
}

describe('サンプル組織（data/sample_org.json）の統合検証', () => {
  const sampleOrg = sampleOrgFixture as unknown as SampleOrgFixture;
  const catalog = (modelCatalogFixture as { models: readonly Model[] }).models;
  const { dimensions, policies, tasks } = buildFixtureState(sampleOrg);

  it('次元3・ポリシー6・タスク12件が定義されている', () => {
    expect(dimensions).toHaveLength(3);
    expect(policies).toHaveLength(6);
    expect(tasks).toHaveLength(12);
  });

  it('全タスクを計算でき、少なくとも1件は未割当を再現できる', () => {
    const result = recomputeAll({
      tasks,
      dimensions,
      policies,
      catalog,
      unavailableModelIds: new Set(),
      previousAssignments: new Map(),
      changeKind: 'sample_load',
    });

    expect(result.assignments.size).toBe(12);
    const statuses = [...result.assignments.values()].map((a) => a.status);
    expect(statuses).toContain('unassigned');
  });

  it('人事部門×難易度高のタスクは、ローカル必須と能力下限の両方から未割当になる', () => {
    const task = tasks.find((t) => t.name === '人事評価コメントの要約');
    expect(task).toBeDefined();

    const result = recomputeAll({
      tasks: [task as Task],
      dimensions,
      policies,
      catalog,
      unavailableModelIds: new Set(),
      previousAssignments: new Map(),
      changeKind: 'sample_load',
    });

    expect(result.assignments.get((task as Task).id)?.status).toBe('unassigned');
  });

  it('人事部門×画像入力必須のタスクは、ローカル必須とモダリティ非対応から未割当になる', () => {
    const task = tasks.find((t) => t.name === '採用サイトの画像付きバナー生成コード');
    expect(task).toBeDefined();

    const result = recomputeAll({
      tasks: [task as Task],
      dimensions,
      policies,
      catalog,
      unavailableModelIds: new Set(),
      previousAssignments: new Map(),
      changeKind: 'sample_load',
    });

    expect(result.assignments.get((task as Task).id)?.status).toBe('unassigned');
  });
});
