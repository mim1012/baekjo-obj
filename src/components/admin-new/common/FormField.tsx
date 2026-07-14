'use client';

import React, { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: ReactNode;
  layout?: 'vertical' | 'horizontal';
  className?: string;
}

export default function FormField({ 
  label, 
  htmlFor, 
  required, 
  description, 
  error, 
  children,
  layout = 'vertical',
  className = ''
}: FormFieldProps) {
  
  if (layout === 'horizontal') {
    return (
      <div className={`sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start border-b border-gray-100 pb-6 last:border-0 last:pb-0 ${className}`}>
        <label 
          htmlFor={htmlFor} 
          className="block text-[14px] font-medium text-[#17201B] sm:pt-2"
        >
          {label}
          {required && <span className="text-[#A65348] ml-1">*</span>}
        </label>
        <div className="mt-2 sm:mt-0 sm:col-span-2">
          {children}
          {description && !error && (
            <p className="mt-2 text-[13px] text-gray-500">{description}</p>
          )}
          {error && (
            <p id={htmlFor ? `${htmlFor}-error` : undefined} className="mt-2 text-[13px] text-[#A65348] font-medium">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-6 last:mb-0 ${className}`}>
      <label 
        htmlFor={htmlFor} 
        className="block text-[14px] font-medium text-[#17201B] mb-2"
      >
        {label}
        {required && <span className="text-[#A65348] ml-1">*</span>}
      </label>
      {children}
      {description && !error && (
        <p className="mt-2 text-[13px] text-gray-500">{description}</p>
      )}
      {error && (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} className="mt-2 text-[13px] text-[#A65348] font-medium">{error}</p>
      )}
    </div>
  );
}
