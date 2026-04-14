'use client';

import { useState, useRef } from 'react';
import { PersonalTemplate } from '../types';
import { getAllTemplates, createTemplate, setDefaultTemplate, deleteTemplate } from '../data';

interface PersonalTemplateManagerProps {
  onClose?: () => void;
  onTemplateChange?: () => void;
}

export default function PersonalTemplateManager({ onClose, onTemplateChange }: PersonalTemplateManagerProps) {
  const [templates, setTemplates] = useState<PersonalTemplate[]>(getAllTemplates());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    setTemplates(getAllTemplates());
    onTemplateChange?.();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      const name = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      createTemplate({ name, imageUrl: data.url });
      refresh();
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSetDefault = (id: string) => {
    setDefaultTemplate(id);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this template?')) {
      deleteTemplate(id);
      refresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div>
        <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          Upload a clean full-body front photo with a simple background for the best preview result.
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
          id="template-upload"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : '📷 Upload Front Template Photo'}
        </button>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {/* Template List */}
      {templates.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">👤</div>
          <p className="text-sm">No templates yet. Upload a full-body photo to use as your preview background.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(template => (
            <div
              key={template.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                template.isDefault ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
              }`}
            >
              {/* Thumbnail */}
              <div className="w-14 h-20 rounded overflow-hidden bg-gray-100 shrink-0">
                <img
                  src={template.imageUrl}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{template.name}</p>
                {template.isDefault && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                    Default
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1 shrink-0">
                {!template.isDefault && (
                  <button
                    onClick={() => handleSetDefault(template.id)}
                    className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleDelete(template.id)}
                  className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Close button (when used in modal) */}
      {onClose && (
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
