'use client';

import React from 'react';

interface SaveBarProps {
  isDirty?: boolean;
  isVisible?: boolean;
  message?: React.ReactNode;
  onSave: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  saveText?: string;
  cancelText?: string;
  saveLabel?: string;
  cancelLabel?: string;
  children?: React.ReactNode;
}

export default function SaveBar({ 
  isDirty,
  isVisible,
  message,
  onSave, 
  onCancel, 
  isSaving = false,
  saveText,
  saveLabel,
  cancelText,
  cancelLabel,
  children
}: SaveBarProps) {
  const show = isVisible !== undefined ? isVisible : (isDirty || isSaving);
  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:left-[236px] transition-all duration-300">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div className="text-[14px] font-medium text-gray-600 hidden sm:block flex-1">
          {message || '저장되지 않은 변경사항이 있습니다.'}
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end shrink-0">
          {children}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="px-4 py-2 border border-gray-300 rounded-md text-[14px] font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 flex-1 sm:flex-none"
            >
              {cancelLabel || cancelText || '취소'}
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-6 py-2 rounded-md text-[14px] font-medium text-white bg-[#2F3B34] hover:bg-[#1f2823] disabled:opacity-70 flex items-center justify-center min-w-[100px] flex-1 sm:flex-none"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                저장 중...
              </span>
            ) : (
              saveLabel || saveText || '저장하기'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
