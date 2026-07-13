import React, { useState } from 'react';
import { Trash2, Eye, EyeOff, PackageOpen, X } from 'lucide-react';
import { CATALOG_STATUS_META } from '@/lib/products/constants';

interface ProductBulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onRequestBulkDelete: () => void;
  onBulkUpdateStatus: (status: 'draft' | 'ready' | 'sold_out') => Promise<void>;
  onBulkUpdateVisibility: (isVisible: boolean) => Promise<void>;
}

export function ProductBulkActionBar({
  selectedCount,
  onClearSelection,
  onRequestBulkDelete,
  onBulkUpdateStatus,
  onBulkUpdateVisibility,
}: ProductBulkActionBarProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedCount === 0) return null;

  const handleAction = async (action: () => Promise<void>) => {
    setIsProcessing(true);
    try {
      await action();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="flex items-center gap-3 pr-6 border-r border-stone-700">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-stone-700 text-xs font-medium">
          {selectedCount}
        </span>
        <span className="text-sm font-medium">개 선택됨</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg transition-colors">
            <PackageOpen className="w-4 h-4" />
            상태 변경
          </button>
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-32 bg-white rounded-xl shadow-xl overflow-hidden text-stone-800">
            {Object.entries(CATALOG_STATUS_META).map(([key, meta]) => (
              <button
                key={key}
                disabled={isProcessing}
                onClick={() => handleAction(() => onBulkUpdateStatus(key as 'draft' | 'ready' | 'sold_out'))}
                className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 disabled:opacity-50"
              >
                {meta.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-4 bg-stone-700 mx-1" />

        <button
          disabled={isProcessing}
          onClick={() => handleAction(() => onBulkUpdateVisibility(true))}
          className="flex items-center gap-2 px-3 py-2 text-sm text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg transition-colors disabled:opacity-50"
        >
          <Eye className="w-4 h-4" />
          노출
        </button>
        <button
          disabled={isProcessing}
          onClick={() => handleAction(() => onBulkUpdateVisibility(false))}
          className="flex items-center gap-2 px-3 py-2 text-sm text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg transition-colors disabled:opacity-50"
        >
          <EyeOff className="w-4 h-4" />
          숨김
        </button>

        <div className="w-px h-4 bg-stone-700 mx-1" />

        <button
          disabled={isProcessing}
          onClick={onRequestBulkDelete}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-stone-800 rounded-lg transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          삭제
        </button>
      </div>

      <button
        onClick={onClearSelection}
        className="p-1 ml-2 text-stone-400 hover:text-white transition-colors rounded-full hover:bg-stone-800"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
