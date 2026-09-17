'use client';

import { useId } from 'react';
import { Outfit } from '../types';
import { ClothingFit, clothingFits, clothingFitLabels, clothingFitDescriptions } from '../../lib/tryon-fit';

interface Props {
  outfit: Outfit;
  saving: boolean;
  hasDefaultTemplate: boolean;
  onChange: (fit: ClothingFit) => void;
  onGenerate: () => Promise<void>;
}

export default function ClothingFitControl({ outfit, saving, hasDefaultTemplate, onChange, onGenerate }: Props) {
  const id = useId();
  const fit = outfit.pantsFit ?? 'original';
  const generatedFit = outfit.tryOnFit ?? 'original';
  const busy = saving || outfit.tryOnStatus === 'generating';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="shrink-0 text-xs font-semibold text-slate-700">服装版型</label>
        <select
          id={id}
          value={fit}
          disabled={busy}
          onChange={event => onChange(event.target.value as ClothingFit)}
          className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 disabled:opacity-50"
        >
          {clothingFits.map(value => <option key={value} value={value}>{clothingFitLabels[value]}</option>)}
        </select>
      </div>
      <p className="text-xs leading-relaxed text-slate-500" aria-live="polite">
        {saving ? '正在保存版型…' : clothingFitDescriptions[fit]}
      </p>
      {outfit.tryOnImageUrl && (
        <>
          {fit !== generatedFit && <p className="text-xs leading-relaxed text-slate-600">当前图片：{clothingFitLabels[generatedFit]}。重新生成后应用所选版型。</p>}
          <button
            type="button"
            disabled={busy || !hasDefaultTemplate}
            onClick={() => void onGenerate()}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {outfit.tryOnStatus === 'generating' ? '生成中…' : '重新生成试穿图'}
          </button>
          {!hasDefaultTemplate && <p className="text-xs text-slate-500">请先上传人物照片并设为默认。</p>}
        </>
      )}
    </div>
  );
}
