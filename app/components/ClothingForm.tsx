'use client';

import CategorySelect from './CategorySelect';
import UsageTagPicker from './UsageTagPicker';

import { errorLabel } from '../lib/display-labels';

import { useState, useEffect } from 'react';
import { Season, ClothingItemFormData } from '../types';
import ClothingSizeInput from './ClothingSizeInput';

const SEASONS: { value: Season; label: string }[] = [
  { value: 'spring', label: "春季" },
  { value: 'summer', label: "夏季" },
  { value: 'autumn', label: "秋季" },
  { value: 'winter', label: "冬季" },
];

interface ClothingFormProps {
  initialData?: Partial<ClothingItemFormData>;
  onSubmit: (data: ClothingItemFormData) => void | Promise<void>;
  onCancel: () => void;
}

export default function ClothingForm({ initialData, onSubmit, onCancel }: ClothingFormProps) {
  const [formData, setFormData] = useState<ClothingItemFormData>({
    name: '',
    category: 'top',
    color: '',
    usageTags: [],
    size: '',
    season: [],
    imageUrl: '',
    notes: '',
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Update form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        category: initialData.category || 'top',
        color: initialData.color || '',
        usageTags: initialData.usageTags || [],
        size: initialData.size || '',
        season: initialData.season || [],
        imageUrl: initialData.imageUrl || '',
        notes: initialData.notes || '',
      });
    } else {
      // Reset form for add mode
      setFormData({
        name: '',
        category: 'top',
        color: '',
        usageTags: [],
        size: '',
        season: [],
        imageUrl: '',
        notes: '',
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || isUploading) return;
    await onSubmit(formData);
  };

  const toggleSeason = (season: Season) => {
    setFormData(prev => ({
      ...prev,
      season: prev.season.includes(season)
        ? prev.season.filter(s => s !== season)
        : [...prev.season, season],
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError("请选择 JPEG、PNG、GIF 或 WebP 图片");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError("图片太大了，请选择不超过 5MB 的图片");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(errorLabel(result.error || "上传失败"));
      }

      // Keep uploaded asset URLs relative so LAN clients resolve them against
      // whichever host they used to open the app.
      setFormData(prev => ({
        ...prev,
        imageUrl: result.url,
      }));
      setImageError(false);
    } catch (error) {
      setUploadError(error instanceof Error ? errorLabel(error.message) : "上传失败");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          衣物名称 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="例如：白色短袖"
          required
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          分类 <span className="text-red-500">*</span>
        </label>
        <CategorySelect value={formData.category} onChange={category=>setFormData(prev=>({...prev,category}))}/>
      </div>

      <UsageTagPicker value={formData.usageTags} onChange={usageTags=>setFormData(prev=>({...prev,usageTags}))}/>
      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          颜色 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.color}
          onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="例如：白色、蓝色、红色"
          required
        />
      </div>

      {/* Season */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">尺码（选填）</label>
        <ClothingSizeInput
          value={formData.size || ''}
          onChange={e => setFormData(prev => ({ ...prev, size: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          适穿季节（选填，可多选）
        </label>
        <div className="flex flex-wrap gap-2">
          {SEASONS.map(season => (
            <button
              key={season.value}
              type="button"
              onClick={() => toggleSeason(season.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                formData.season.includes(season.value)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {season.label}
            </button>
          ))}
        </div>
        <p className="text-gray-500 text-xs mt-1.5">按实际厚薄和穿着习惯选择，也可以稍后补充。</p>
      </div>

      {/* Image Upload & URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          图片 <span className="text-gray-400 font-normal">（选填）</span>
        </label>
        
        {/* File Upload */}
        <div className="mb-3">
          <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
            <div className="text-center">
              <svg className="w-6 h-6 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-500">
                {isUploading ? "上传中…" : "点击或拖拽上传图片"}
              </span>
              <span className="text-xs text-gray-400 block mt-1">
                支持 PNG、JPG、GIF、WebP，最大 5MB
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
          {uploadError && (
            <p className="text-red-500 text-sm mt-1.5">{uploadError}</p>
          )}
        </div>

        {/* Image URL Input */}
        <div className="relative">
          <input
            type="text"
            inputMode="url"
            disabled={isUploading}
            value={formData.imageUrl}
            onChange={e => {
              setFormData(prev => ({ ...prev, imageUrl: e.target.value }));
              setImageError(false);
              setUploadError(null);
            }}
            className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="也可以粘贴图片链接…"
          />
        </div>
        
        {/* Image Preview */}
        {formData.imageUrl && !imageError && (
          <div className="mt-3">
            <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">预览</p>
            <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
              <img
                src={formData.imageUrl}
                alt="预览"
                className="w-full h-full object-contain"
                onLoad={() => setImageError(false)}
                onError={() => setImageError(true)}
              />
            </div>
          </div>
        )}
        
        {imageError && formData.imageUrl && (
          <p className="text-red-500 text-sm mt-1.5">图片加载失败，请检查链接。</p>
        )}
      </div>



      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          备注 <span className="text-gray-400 font-normal">（选填）</span>
        </label>
        <textarea
          value={formData.notes}
          onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          rows={3}
          placeholder="写下材质、穿着偏好或其他备注…"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={!formData.name.trim() || isUploading}
          className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? "图片上传中…" : initialData ? "保存衣物" : "添加衣物"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          取消
        </button>
      </div>
    </form>
  );
}
