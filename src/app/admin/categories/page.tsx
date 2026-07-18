'use client';

import React, { useState } from 'react';
import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';
import { Plus, Trash2, Tag, Layers } from 'lucide-react';
import type { CategorySettings } from '@/lib/categorySettings/config';

import PageHeader from '@/components/admin-new/common/PageHeader';
import SaveBar from '@/components/admin-new/common/SaveBar';

export default function CategoryManagerPage() {
  const { categorySettings, updateCategorySettings, loaded, loadError } = useCategorySettings();

  const [settings, setSettings] = useState<CategorySettings>(categorySettings);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 컴포넌트 마운트 시 원본 설정과 동기화 (초기 로딩 지연 대응)
  React.useEffect(() => {
    if (!hasChanges) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettings(categorySettings);
    }
  }, [categorySettings, hasChanges]);

  // loaded 이전엔 편집을 막는다 — 그래야 hasChanges 락이 실제 GET 값의 resync 를 영구히 막는
  // 레이스가 구조적으로 생기지 않는다(전수조사 A-2). GET 이 대개 즉시 오므로 체감 지연은 없다.
  const handleChange = (field: 'productCategories' | 'lifestyleCategories', value: string[]) => {
    if (!loaded) return;
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!loaded) return;
    setIsSaving(true);
    const ok = await updateCategorySettings(settings);
    setIsSaving(false);

    if (ok) {
      setHasChanges(false);
      alert('카테고리 설정이 저장되었습니다.');
    } else {
      alert('저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const renderStringListEditor = (
    title: string, 
    description: string, 
    field: 'productCategories' | 'lifestyleCategories',
    icon: React.ReactNode
  ) => {
    const list = settings[field] || [];
    
    const addItem = () => {
      handleChange(field, [...list, '새 항목']);
    };
    
    const updateItem = (index: number, val: string) => {
      const newList = [...list];
      newList[index] = val;
      handleChange(field, newList);
    };
    
    const removeItem = (index: number) => {
      handleChange(field, list.filter((_, i) => i !== index));
    };

    const moveItem = (index: number, dir: -1 | 1) => {
      if (index + dir < 0 || index + dir >= list.length) return;
      const newList = [...list];
      const temp = newList[index + dir];
      newList[index + dir] = newList[index];
      newList[index] = temp;
      handleChange(field, newList);
    };

    return (
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden flex flex-col h-[500px]">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <h3 className="font-semibold text-[#17201B] text-[15px]">{title}</h3>
              <p className="text-[12px] text-gray-500 mt-0.5">{description}</p>
            </div>
          </div>
          <button 
            onClick={addItem}
            className="px-3 py-1.5 bg-[#17201B] text-white text-[12px] font-medium rounded flex items-center gap-1.5 hover:bg-[#2F3B34]"
          >
            <Plus size={14} /> 추가
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#F9F9F9]">
          {list.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-[13px]">
              항목이 없습니다. 우측 상단의 추가 버튼을 눌러주세요.
            </div>
          ) : (
            list.map((item, index) => (
              <div key={index} className="flex items-center gap-3 bg-white p-2 border border-gray-200 rounded group">
                <div className="flex flex-col gap-1 text-gray-300">
                  <button onClick={() => moveItem(index, -1)} disabled={index === 0} className="hover:text-gray-600 disabled:opacity-30 leading-none">▲</button>
                  <button onClick={() => moveItem(index, 1)} disabled={index === list.length - 1} className="hover:text-gray-600 disabled:opacity-30 leading-none">▼</button>
                </div>
                
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateItem(index, e.target.value)}
                  className="flex-1 border-0 border-b border-transparent focus:border-[#17201B] focus:ring-0 text-[14px] px-1 py-1.5"
                  placeholder="항목 이름"
                />
                
                <button 
                  onClick={() => removeItem(index)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-24 h-[calc(100vh-64px)] overflow-y-auto">
      {/* loadError 면 왜 편집·저장이 막혔는지 알려준다(opus 리뷰 MEDIUM — loaded 를 노출해도 소비하지
          않으면 버튼만 이유 없이 계속 비활성화된 것처럼 보인다). notices/concerns 화면과 같은 톤. */}
      <PageHeader
        title="카테고리 관리"
        description={loadError ? '카테고리 설정을 불러오지 못했습니다. 저장이 차단되었습니다 — 새로고침 후 다시 시도해 주세요.' : '전체 사이트에서 사용되는 분류 체계와 카테고리를 관리합니다. 드래그하여 순서를 변경할 수 있습니다.'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start h-full pb-10">
        {renderStringListEditor(
          '상품 카테고리', 
          '스토어에서 상품을 구분하는 기본 체계입니다.', 
          'productCategories',
          <Layers size={18} className="text-[#A8742E]" />
        )}
        
        {renderStringListEditor(
          '라이프스타일 카테고리', 
          '고객 맞춤 진단 시 매칭되는 라이프스타일 분류입니다.', 
          'lifestyleCategories',
          <Tag size={18} className="text-[#A8742E]" />
        )}
      </div>

      <SaveBar
        isVisible={hasChanges}
        message="카테고리 변경사항이 저장되지 않았습니다."
        onSave={handleSave}
        onCancel={() => {
          setSettings(categorySettings);
          setHasChanges(false);
        }}
        saveLabel="설정 저장"
        cancelLabel="취소"
        isSaving={isSaving}
        disabled={!loaded}
      />
    </div>
  );
}
