'use client';
import { usageOptions } from '../../lib/category-catalog';
export default function UsageTagPicker({value=[],onChange,disabled=false}:{value?:string[];onChange:(tags:string[])=>void;disabled?:boolean}) {
  return <fieldset disabled={disabled}><legend className="mb-2 text-sm text-gray-700">用途（选填，可多选）</legend><div className="flex flex-wrap gap-2">{usageOptions.map(tag=><button type="button" key={tag.id} aria-pressed={value.includes(tag.id)} onClick={()=>onChange(value.includes(tag.id)?value.filter(id=>id!==tag.id):[...value,tag.id])} className={`border px-3 py-1 text-sm ${value.includes(tag.id)?'border-black bg-yellow-200 font-bold':'border-gray-300 bg-white'}`}>{tag.label}</button>)}</div></fieldset>;
}
