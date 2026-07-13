'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Lock, EyeOff } from 'lucide-react';
import FormSection from '@/components/admin-new/common/FormSection';
import FormField from '@/components/admin-new/common/FormField';
import SaveBar from '@/components/admin-new/common/SaveBar';
import { formatDate } from '@/lib/format';
import type { QnA } from '@/types';

interface QnaDetailPanelProps {
  item: QnA | null;
  onClose: () => void;
  onSave: (updatedItem: QnA) => Promise<void>;
}

export default function QnaDetailPanel({ item, onClose, onSave }: QnaDetailPanelProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    answer: '',
    isVisible: true,
  });

  useEffect(() => {
    if (item) {
      setFormData({
        answer: item.answer || '',
        isVisible: item.isVisible !== false, // default true
      });
    }
  }, [item]);

  if (!item) return null;

  const isDirty = formData.answer !== (item.answer || '') || formData.isVisible !== (item.isVisible !== false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const isAnswering = formData.answer.trim().length > 0;
      
      const updatedItem: QnA = {
        ...item,
        answer: formData.answer,
        isVisible: formData.isVisible,
        status: isAnswering ? '답변완료' : '답변대기',
        answeredAt: isAnswering ? (item.answeredAt || new Date().toISOString()) : undefined,
      };
      
      await onSave(updatedItem);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border-l border-gray-200 h-full overflow-y-auto flex flex-col shadow-xl">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10">
        <h3 className="font-semibold text-[#17201B] flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          문의 상세 및 답변
        </h3>
        <button 
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 p-6 space-y-6">
        <FormSection title="문의 내용">
          <div className="space-y-4 text-[14px]">
            <div className="flex justify-between items-start">
              <div>
                <span className="block text-gray-500 mb-1 text-xs">작성자</span>
                <span className="font-medium text-[#17201B]">{item.writerName}</span>
              </div>
              <div className="text-right">
                <span className="block text-gray-500 mb-1 text-xs">작성일시</span>
                <span className="text-[#17201B]">{formatDate(item.createdAt)}</span>
              </div>
            </div>

            <div>
              <span className="block text-gray-500 mb-1 text-xs">문의 상품</span>
              <span className="font-medium text-[#17201B]">{item.productName}</span>
            </div>

            <div className="flex gap-4">
              {item.isSecret && (
                <span className="inline-flex items-center text-xs text-[#A8742E] bg-[#FAF8F3] px-2 py-1 rounded-md">
                  <Lock className="w-3 h-3 mr-1" /> 고객이 비밀글로 설정함
                </span>
              )}
            </div>

            <div>
              <span className="block text-gray-500 mb-2 text-xs">문의 내용</span>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-100 text-[13px] text-gray-700 whitespace-pre-wrap">
                {item.question}
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection title="답변 작성 및 관리">
          <div className="space-y-6">
            <FormField label="공개 여부 (관리자 강제 숨김)">
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isVisible}
                    onChange={(e) => setFormData(prev => ({ ...prev, isVisible: e.target.checked }))}
                    className="rounded border-gray-300 text-[#2F3B34] focus:ring-[#2F3B34]"
                  />
                  <span className="text-sm font-medium text-gray-700">고객 페이지에 표시 (체크 해제 시 숨김 처리됨)</span>
                </label>
              </div>
              {!formData.isVisible && (
                <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                  <EyeOff className="w-3 h-3" /> 이 글은 현재 고객들에게 보이지 않습니다. (부적절한 내용 등)
                </p>
              )}
            </FormField>

            <FormField label="답변 내용">
              <textarea
                value={formData.answer}
                onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                placeholder="고객에게 보여질 답변을 입력하세요."
                rows={8}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34]"
              />
            </FormField>
          </div>
        </FormSection>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-200">
        <SaveBar
          isDirty={isDirty}
          isSaving={isSaving}
          onSave={handleSave}
          onCancel={() => {
            setFormData({
              answer: item.answer || '',
              isVisible: item.isVisible !== false,
            });
          }}
        />
      </div>
    </div>
  );
}
