'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Brand } from '@/types';
import { createBrand, updateBrand, type UpdateBrandInput, type CreateBrandInput } from '@/lib/storage';

import FormField from '@/components/admin-new/common/FormField';
import ImageUploader from '@/components/admin-new/common/ImageUploader';

interface BrandFormProps {
  initialData?: Brand | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BrandForm({ initialData, onClose, onSuccess }: BrandFormProps) {
  const isEdit = !!initialData;
  const [draftId] = useState(() => 
    typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15)
  );
  
  const [formData, setFormData] = useState<Partial<Brand>>({
    name: '',
    logo: '',
    description: '',
    philosophy: '',
    auditGrade: 'A+',
    officialUrl: '',
    isRecommended: false,
    ...initialData
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof Brand, value: Brand[keyof Brand]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) return setError('브랜드명을 입력해주세요.');
    if (!formData.description?.trim()) return setError('브랜드 소개를 입력해주세요.');

    setIsSaving(true);
    setError(null);

    try {
      if (isEdit && initialData.id) {
        const { error: updateError } = await updateBrand(initialData.id, formData as UpdateBrandInput);
        if (updateError) throw new Error(updateError);
      } else {
        const { error: createError } = await createBrand({
          ...formData,
          auditPoints: [],
          representativeProductIds: [],
          relatedConcernSlugs: [],
        } as CreateBrandInput);
        if (createError) throw new Error(createError);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17201B]/50 p-4">
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-[16px] font-semibold text-[#17201B]">
            {isEdit ? '브랜드 정보 수정' : '새 브랜드 등록'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 rounded border border-red-200 text-[13px] font-medium">
              {error}
            </div>
          )}

          <form id="brand-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-1">
                <FormField label="브랜드 로고">
                  <ImageUploader 
                    value={formData.logo || ''}
                    onChange={(url) => handleChange('logo', url)}
                    domain="brand"
                    usage="logo"
                    entityId={isEdit ? initialData.id : undefined}
                    draftId={!isEdit ? draftId : undefined}
                    aspectRatio="1/1"
                    height="160px"
                  />
                </FormField>
              </div>
              
              <div className="col-span-2 space-y-4">
                <FormField label="브랜드명" required>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={e => handleChange('name', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B] outline-none"
                    placeholder="예: 지위픽"
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="검증 등급">
                    <select
                      value={formData.auditGrade || 'A+'}
                      onChange={e => handleChange('auditGrade', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B] outline-none"
                    >
                      <option value="A+">A+ 등급</option>
                      <option value="A">A 등급</option>
                      <option value="B+">B+ 등급</option>
                      <option value="B">B 등급</option>
                    </select>
                  </FormField>
                  
                  <FormField label="공식몰 URL">
                    <input 
                      type="url" 
                      value={formData.officialUrl || ''} 
                      onChange={e => handleChange('officialUrl', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B] outline-none"
                      placeholder="https://"
                    />
                  </FormField>
                </div>
              </div>
            </div>

            <FormField label="한 줄 소개" required>
              <textarea 
                value={formData.description || ''} 
                onChange={e => handleChange('description', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] h-20 focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B] outline-none resize-none"
                placeholder="브랜드관에 표시할 간단한 소개"
              />
            </FormField>

            <FormField label="브랜드 철학 및 스토리">
              <textarea 
                value={formData.philosophy || ''} 
                onChange={e => handleChange('philosophy', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] h-32 focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B] outline-none resize-none"
                placeholder="상세한 브랜드 스토리와 철학을 입력하세요."
              />
            </FormField>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
              <input 
                type="checkbox" 
                checked={formData.isRecommended || false}
                onChange={e => handleChange('isRecommended', e.target.checked)}
                className="w-4 h-4 text-[#17201B] border-gray-300 rounded focus:ring-[#17201B]"
              />
              <div>
                <span className="text-[14px] font-medium text-[#17201B] block">브랜드관 추천 노출</span>
                <span className="text-[12px] text-gray-500">체크 시 브랜드관 상단 또는 추천 영역에 노출됩니다.</span>
              </div>
            </label>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-[13px] font-medium rounded hover:bg-white disabled:opacity-50"
          >
            취소
          </button>
          <button 
            type="submit" 
            form="brand-form"
            disabled={isSaving}
            className="px-6 py-2 bg-[#17201B] text-white text-[13px] font-medium rounded hover:bg-[#2F3B34] disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? '수정 완료' : '브랜드 등록'}
          </button>
        </div>
      </div>
    </div>
  );
}
