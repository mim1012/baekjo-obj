'use client';

import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
  isDestructive = false
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[100]" onClick={onCancel} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] bg-white rounded-lg shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95">
        <h2 className="text-[18px] font-semibold text-[#17201B] mb-2">{title}</h2>
        <p className="text-[14px] text-gray-500 mb-6">{description}</p>
        
        <div className="flex gap-3 justify-end">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-[14px] font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={`px-4 py-2 text-[14px] font-medium text-white rounded-md ${
              isDestructive ? 'bg-[#A65348] hover:bg-[#8e453b]' : 'bg-[#2F3B34] hover:bg-[#1f2823]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </>
  );
}
