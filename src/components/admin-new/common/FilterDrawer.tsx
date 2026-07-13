'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  onApply?: () => void;
  onReset?: () => void;
}

export default function FilterDrawer({ 
  isOpen, 
  onClose, 
  title = '필터', 
  children,
  onApply,
  onReset
}: FilterDrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      <div 
        className={`fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-xl z-50 transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
          <h2 className="text-[16px] font-semibold text-[#17201B]">{title}</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-md">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {children}
        </div>

        {(onApply || onReset) && (
          <div className="p-4 border-t border-gray-200 flex gap-3 shrink-0 bg-white">
            {onReset && (
              <button 
                onClick={onReset}
                className="flex-1 py-2.5 px-4 bg-white border border-gray-300 text-gray-700 rounded-md text-[14px] font-medium hover:bg-gray-50"
              >
                초기화
              </button>
            )}
            {onApply && (
              <button 
                onClick={() => { onApply(); onClose(); }}
                className="flex-[2] py-2.5 px-4 bg-[#2F3B34] text-white rounded-md text-[14px] font-medium hover:bg-[#1f2823]"
              >
                필터 적용
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
