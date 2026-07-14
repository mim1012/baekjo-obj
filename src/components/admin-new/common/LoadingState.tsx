'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  minHeight?: string;
}

export default function LoadingState({ message = '데이터를 불러오는 중입니다...', minHeight = '300px' }: LoadingStateProps) {
  return (
    <div 
      className="bg-white border border-gray-200 rounded-md p-12 flex flex-col items-center justify-center text-center"
      style={{ minHeight }}
    >
      <Loader2 size={32} className="text-[#2F3B34] animate-spin mb-4" />
      <p className="text-[14px] text-gray-500">{message}</p>
    </div>
  );
}
