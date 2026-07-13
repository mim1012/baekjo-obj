import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { Product } from '@/types';

interface ProductBulkDeleteModalProps {
  isOpen: boolean;
  selectedProducts: Product[];
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
}

export function ProductBulkDeleteModal({
  isOpen,
  selectedProducts,
  onClose,
  onConfirm,
  isProcessing,
}: ProductBulkDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-stone-900">선택 상품 삭제</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <p className="text-stone-800 font-medium mb-2">
            선택한 상품 {selectedProducts.length}개를 삭제하시겠습니까?
          </p>
          <p className="text-sm text-red-600 font-medium mb-4">
            삭제 후 복구할 수 없습니다. 주문·후기와 연결된 상품은 삭제가 제한될 수 있습니다.
          </p>

          <div className="bg-stone-50 border border-stone-100 rounded-lg p-3 max-h-40 overflow-y-auto">
            <ul className="list-disc list-inside text-sm text-stone-600 space-y-1">
              {selectedProducts.slice(0, 5).map((p) => (
                <li key={p.id} className="truncate">
                  {p.name}
                </li>
              ))}
              {selectedProducts.length > 5 && (
                <li className="text-stone-400">... 외 {selectedProducts.length - 5}개</li>
              )}
            </ul>
          </div>
        </div>

        <div className="p-5 border-t border-stone-100 bg-stone-50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-5 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-200 hover:border-stone-300 rounded-xl transition-all disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm shadow-red-600/20 transition-all disabled:opacity-50"
          >
            {isProcessing ? '삭제 중...' : `${selectedProducts.length}개 상품 삭제`}
          </button>
        </div>
      </div>
    </div>
  );
}
