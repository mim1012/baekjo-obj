'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadAdminImage, deleteTemporaryAdminImage } from '@/lib/storage';

interface ImageUploaderProps {
  value?: string; // This can be publicUrl
  onChange: (url: string, path?: string) => void;
  domain: 'product' | 'brand' | 'banner';
  usage: 'main' | 'gallery' | 'detail' | 'logo' | 'cover' | 'hero';
  entityId?: string;
  draftId?: string;
  label?: string;
  description?: string;
  aspectRatio?: string; // e.g. "1/1"
  height?: string; // e.g. "200px"
}

export default function ImageUploader({ 
  value, 
  onChange, 
  domain,
  usage,
  entityId,
  draftId,
  label, 
  description,
  aspectRatio,
  height = '200px'
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('이미지 크기는 8MB 이하여야 합니다.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadAdminImage({
        file,
        domain,
        usage,
        entityId,
        draftId
      });

      setCurrentPath(result.path);
      onChange(result.publicUrl, result.path);
    } catch (err: any) {
      setError(err.message || '업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (currentPath) {
      try {
        await deleteTemporaryAdminImage(currentPath);
      } catch (err) {
        console.error('Failed to delete temporary image', err);
      }
    }
    
    setCurrentPath(null);
    onChange('', undefined);
  };

  return (
    <div className="w-full">
      {label && <label className="block text-[13px] font-semibold text-[#17201B] mb-2">{label}</label>}
      
      <div 
        className={`relative border-2 border-dashed rounded-md overflow-hidden bg-gray-50 flex items-center justify-center transition-colors
          ${value ? 'border-transparent' : 'border-gray-300 hover:bg-gray-100 hover:border-gray-400 cursor-pointer'}
        `}
        style={{ height, aspectRatio }}
        onClick={() => !value && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          accept="image/jpeg,image/png,image/webp" 
          className="hidden" 
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <Loader2 size={24} className="animate-spin" />
            <span className="text-[12px]">업로드 중...</span>
          </div>
        ) : value ? (
          <div className="w-full h-full relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={value} 
              alt="Uploaded" 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="px-3 py-1.5 bg-white text-gray-700 text-[12px] font-medium rounded hover:bg-gray-100"
              >
                변경
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 bg-white text-red-600 rounded hover:bg-red-50"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <UploadCloud size={32} strokeWidth={1.5} className="text-gray-300" />
            <div className="text-center">
              <span className="text-[13px] font-medium text-gray-600">클릭하여 이미지 업로드</span>
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-1.5 text-[12px] text-red-500 font-medium">{error}</p>}
      {description && !error && <p className="mt-1.5 text-[12px] text-gray-500">{description}</p>}
    </div>
  );
}

