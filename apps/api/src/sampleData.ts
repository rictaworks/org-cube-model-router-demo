/**
 * マスタデータ（モデルカタログ・サンプル組織）のフィクスチャ読み込みと型付け。
 * data/*.json は参照専用のためここで一度だけ型を確定させ、以後は型安全に扱う。
 */
import modelCatalogFixtureJson from '../../../data/model_catalog.json';
import sampleOrgFixtureJson from '../../../data/sample_org.json';
import type { Deployment, LatencyClass, Region, TaskKind } from '@org-cube-model-router-demo/router-core';

export interface ModelCatalogFixtureEntry {
  readonly modelId: string;
  readonly displayName: string;
  readonly provider: string;
  readonly deployment: Deployment;
  readonly region: Region | null;
  readonly trainingOptOut: boolean;
  readonly zeroRetention: boolean;
  readonly contextLimit: number;
  readonly latencyClass: LatencyClass;
  readonly supportsImage: boolean;
  readonly priceInPer1k: number;
  readonly priceOutPer1k: number;
  readonly capabilities: Readonly<Record<TaskKind, number>>;
}

export function loadModelCatalogFixture(): readonly ModelCatalogFixtureEntry[] {
  return (modelCatalogFixtureJson as unknown as { models: readonly ModelCatalogFixtureEntry[] }).models;
}

export interface SampleDimensionFixture {
  readonly name: string;
  readonly displayOrder: number;
  readonly values: readonly string[];
}

export interface SamplePolicyFixture {
  readonly name: string;
  readonly priority: number;
  readonly selector: Readonly<Record<string, string>>;
  readonly constraints?: {
    readonly allowedRegions?: readonly Region[];
    readonly allowedProviders?: readonly string[];
    readonly bannedModels?: readonly string[];
    readonly requireLocal?: boolean;
    readonly maxCostPerRun?: number;
  };
  readonly weights?: {
    readonly quality?: number;
    readonly cost?: number;
    readonly latency?: number;
  };
}

export interface SampleTaskFixture {
  readonly name: string;
  readonly taskKind: TaskKind;
  readonly difficulty: 'low' | 'medium' | 'high';
  readonly sensitivity: 'public' | 'internal' | 'confidential' | 'personal';
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly latencyNeed: 'interactive' | 'batch';
  readonly needsImage: boolean;
  readonly monthlyRuns: number;
  readonly position: Readonly<Record<string, string>>;
}

export interface SampleOrgFixture {
  readonly dimensions: readonly SampleDimensionFixture[];
  readonly policies: readonly SamplePolicyFixture[];
  readonly tasks: readonly SampleTaskFixture[];
}

export function loadSampleOrgFixture(): SampleOrgFixture {
  return sampleOrgFixtureJson as unknown as SampleOrgFixture;
}
