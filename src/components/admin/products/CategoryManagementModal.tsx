import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, AlertCircle } from 'lucide-react';
import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CategoryManagementModal({ isOpen, onClose }: CategoryManagementModalProps) {
  const { categorySettings, updateCategorySettings } = useCategorySettings();
  const [activeTab, setActiveTab] = useState<'product' | 'lifestyle'>('product');
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // 모달이 열리거나 탭이 바뀔 때 서버 설정을 편집용 드래프트로 명시적으로 복사한다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategories(activeTab === 'product' ? categorySettings.productCategories : categorySettings.lifestyleCategories);
      setErrorMsg(null);
      setEditingIndex(null);
    }
  }, [isOpen, activeTab, categorySettings]);

  if (!isOpen) return null;

  const handleSave = async (newCats: string[]) => {
    setIsSaving(true);
    setErrorMsg(null);
    
    const newSettings = { ...categorySettings };
    if (activeTab === 'product') {
      newSettings.productCategories = newCats;
    } else {
      newSettings.lifestyleCategories = newCats;
    }

    const { ok, error } = await updateCategorySettings(newSettings);
    setIsSaving(false);
    
    if (!ok) {
      setErrorMsg(error || '카테고리 저장에 실패했습니다.');
      return false;
    }
    
    setCategories(newCats);
    return true;
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    if (categories.includes(newCategoryName.trim())) {
      setErrorMsg('이미 존재하는 카테고리입니다.');
      return;
    }

    const newCats = [...categories, newCategoryName.trim()];
    const success = await handleSave(newCats);
    if (success) {
      setNewCategoryName('');
    }
  };

  const handleDeleteCategory = async (idx: number) => {
    if (window.confirm('이 카테고리를 삭제하시겠습니까?\n이 카테고리가 연결된 상품이 있으면 삭제되지 않습니다.')) {
      const newCats = categories.filter((_, i) => i !== idx);
      await handleSave(newCats);
    }
  };

  const startEditCategory = (idx: number) => {
    setEditingIndex(idx);
    setEditValue(categories[idx]);
    setErrorMsg(null);
  };

  const saveEditCategory = async () => {
    if (editingIndex === null) return;
    
    const val = editValue.trim();
    if (!val || val === categories[editingIndex]) {
      setEditingIndex(null);
      return;
    }

    if (categories.some((c, i) => i !== editingIndex && c === val)) {
      setErrorMsg('이미 존재하는 카테고리입니다.');
      return;
    }

    const newCats = [...categories];
    newCats[editingIndex] = val;
    
    const success = await handleSave(newCats);
    if (success) {
      setEditingIndex(null);
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-stone-100 shrink-0">
          <h2 className="text-lg font-bold text-stone-900">카테고리 관리</h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-stone-100 shrink-0">
          <button
            onClick={() => setActiveTab('product')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'product' ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}
          >
            일반 카테고리
          </button>
          <button
            onClick={() => setActiveTab('lifestyle')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'lifestyle' ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}
          >
            라이프스타일
          </button>
        </div>

        {errorMsg && (
          <div className="mx-5 mt-4 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-2">
            {categories.map((cat, idx) => (
              <div key={idx} className="group relative">
                {editingIndex === idx ? (
                  <div className="flex items-center gap-2 p-1.5 bg-stone-50 border border-stone-200 rounded-xl">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditCategory()}
                      className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-stone-400"
                      autoFocus
                    />
                    <button onClick={saveEditCategory} disabled={isSaving} className="p-1.5 text-stone-600 hover:bg-stone-200 rounded-lg disabled:opacity-50">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={cancelEdit} disabled={isSaving} className="p-1.5 text-stone-400 hover:bg-stone-200 rounded-lg disabled:opacity-50">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-stone-50 hover:bg-stone-100 border border-transparent rounded-xl transition-colors">
                    <span className="text-sm font-medium text-stone-800">{cat}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditCategory(idx)}
                        disabled={isSaving}
                        className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-white rounded-md transition-colors disabled:opacity-50"
                        title="이름 수정"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(idx)}
                        disabled={isSaving}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {categories.length === 0 && (
              <div className="text-center py-8 text-stone-400 text-sm">
                등록된 카테고리가 없습니다.
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-stone-100 bg-stone-50 shrink-0">
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              placeholder="새 카테고리 이름..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              disabled={isSaving}
              className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-stone-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSaving || !newCategoryName.trim()}
              className="px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:hover:bg-stone-900 flex items-center justify-center"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
