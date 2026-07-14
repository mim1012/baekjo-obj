'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ 
  title = '오류가 발생했습니다', 
  message = '데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-12 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 text-[#A65348]">
        <AlertCircle size={24} />
      </div>
      <h3 className="text-[16px] font-semibold text-[#17201B] mb-2">{title}</h3>
      <p className="text-[14px] text-gray-500 max-w-md mx-auto mb-6">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-white border border-gray-300 rounded-md text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
