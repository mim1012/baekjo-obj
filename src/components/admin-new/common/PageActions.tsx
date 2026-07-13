'use client';

import React from 'react';

interface PageActionsProps {
  children: React.ReactNode;
}

export default function PageActions({ children }: PageActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {children}
    </div>
  );
}
