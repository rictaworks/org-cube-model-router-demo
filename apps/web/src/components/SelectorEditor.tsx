/**
 * 次元ごとに「特定の値」または「任意（未設定）」を選ぶ共通エディタ。
 * F2のポリシーのセレクタ（3.2節）と、F3のタスクの組織座標（3.1節）の両方で使う
 * （形状はどちらも「次元ID→値ID」のマップであり、意味づけ（任意 or 未設定）のみが
 * 画面文言として異なる。DRY）。
 */
import type { ReactNode } from 'react';
import type { Dimension, Selector } from '@org-cube-model-router-demo/router-core';

export interface SelectorEditorProps {
  readonly dimensions: readonly Dimension[];
  readonly value: Selector;
  readonly onChange: (next: Selector) => void;
  readonly wildcardLabel: string;
}

const WILDCARD_OPTION_VALUE = '';

export function SelectorEditor({ dimensions, value, onChange, wildcardLabel }: SelectorEditorProps): ReactNode {
  function handleDimensionChange(dimensionId: number, rawValueId: string): void {
    const next = { ...value };
    if (rawValueId === WILDCARD_OPTION_VALUE) {
      delete next[dimensionId];
    } else {
      next[dimensionId] = Number(rawValueId);
    }
    onChange(next);
  }

  return (
    <div className="selector-editor">
      {dimensions.map((dimension) => (
        <div key={dimension.id} className="selector-editor-row">
          <label htmlFor={`selector-dimension-${dimension.id}`}>{dimension.name}</label>
          <select
            id={`selector-dimension-${dimension.id}`}
            value={value[dimension.id] === undefined ? WILDCARD_OPTION_VALUE : String(value[dimension.id])}
            onChange={(event) => handleDimensionChange(dimension.id, event.target.value)}
          >
            <option value={WILDCARD_OPTION_VALUE}>{wildcardLabel}</option>
            {dimension.values.map((dimensionValue) => (
              <option key={dimensionValue.id} value={dimensionValue.id}>
                {dimensionValue.name}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
