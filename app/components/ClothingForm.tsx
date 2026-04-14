'use client';

import { useState, useEffect } from 'react';
import { Category, Season, ClothingItemFormData } from '../types';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'accessory', label: 'Accessory' },
  { value: 'other', label: 'Other' },
];

const SEASONS: { value: Season; label: string }[] = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'autumn', label: 'Autumn' },
  { value: 'winter', label: 'Winter' },
];

interface ClothingFormProps {
  initialData?: Partial<ClothingItemFormData>;
  onSubmit: (data: ClothingItemFormData) => void;
  onCancel: () => void;
}

export default function ClothingForm({ initialData, onSubmit, onCancel }: ClothingFormProps) {
  const [formData, setFormData] = useState<ClothingItemFormData>({
    name: '',
    category: 'top',
    color: '',
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
        season: [],
        imageUrl: '',
        notes: '',
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.season.length === 0) return;
    onSubmit(formData);
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
      setUploadError('Invalid file type. Supported: JPEG, PNG, GIF, WebP');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('File too large. Max size: 5MB');
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
        throw new Error(result.error || 'Upload failed');
      }

      // Update form with the FULL uploaded image URL (with origin)
      const fullUrl = window.location.origin + result.url;
      setFormData(prev => ({
        ...prev,
        imageUrl: fullUrl,
      }));
      setImageError(false);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., White T-Shirt"
          required
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.category}
          onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as Category }))}
          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Color <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.color}
          onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., White, Blue, Red"
          required
        />
      </div>

      {/* Season */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Season <span className="text-red-500">*</span>
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
        {formData.season.length === 0 && (
          <p className="text-red-500 text-sm mt-1.5">Please select at least one season</p>
        )}
      </div>

      {/* Image Upload & URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Image <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        
        {/* File Upload */}
        <div className="mb-3">
          <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
            <div className="text-center">
              <svg className="w-6 h-6 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-500">
                {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
              </span>
              <span className="text-xs text-gray-400 block mt-1">
                PNG, JPG, GIF, WebP (max 5MB)
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
            type="url"
            value={formData.imageUrl}
            onChange={e => {
              setFormData(prev => ({ ...prev, imageUrl: e.target.value }));
              setImageError(false);
              setUploadError(null);
            }}
            className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Or paste image URL here..."
          />
        </div>
        
        {/* Image Preview */}
        {formData.imageUrl && !imageError && (
          <div className="mt-3">
            <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Preview</p>
            <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
              <img
                src={formData.imageUrl}
                alt="Preview"
                className="w-full h-full object-contain"
                onLoad={() => setImageError(false)}
                onError={() => setImageError(true)}
              />
            </div>
          </div>
        )}
        
        {imageError && formData.imageUrl && (
          <p className="text-red-500 text-sm mt-1.5">Failed to load image. Please check the URL.</p>
        )}
      </div>



      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Notes <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={formData.notes}
          onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          rows={3}
          placeholder="Any additional notes..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={formData.season.length === 0 || !formData.name.trim()}
          className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {initialData ? 'Update Item' : 'Add Item'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}