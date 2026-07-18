'use client';

import React, { useRef, useState } from 'react';
import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';
import { Plus, Trash2, Tag, Layers } from 'lucide-react';
import type { CategorySettings } from '@/lib/categorySettings/config';

import PageHeader from '@/components/admin-new/common/PageHeader';

export default function CategoryManagerPage() {
  const { categorySettings, updateCategorySettings } = useCategorySettings();

  // 로컬 미러는 "타이핑 중" 상태만 담는다 — 이름 입력은 키 입력마다 PUT 하지 않고 blur 시 커밋.
  // 추가·삭제·순서 변경은 즉시 커밋한다(2026-07-18 즉시저장 전환 — SaveBar 일괄저장 제거).
  const [settings, setSettings] = useState<CategorySettings>(categorySettings);
  // provider 의 낙관적 갱신(성공/실패-롤백)과 로컬 미러를 맞추는 동기화. 타이핑 중(dirty)에는
  // 늦게 도착한 초기 GET 이 입력을 덮어쓰지 못하게 막는다.
  const [dirty, setDirty] = useState(false);
  // 커밋 상호배제 — 연속 클릭이 동시 PUT 으로 서로를 덮어쓰는 레이스 방지(즉시저장 공통 패턴).
  const busyRef = useRef(false);

  React.useEffect(() => {
    if (!dirty) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettings(categorySettings);
    }
  }, [categorySettings, dirty]);

  // next 스냅샷을 즉시 DB 에 커밋한다. 실패하면 provider 가 롤백하므로 로컬 미러도 원복한다.
  const commit = async (next: CategorySettings) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setSettings(next);
    setDirty(false);
    try {
      const ok = await updateCategorySettings(next);
      if (!ok) {
        setSettings(categorySettings);
        window.alert('저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      busyRef.current = false;
    }
  };

  const renderStringListEditor = (
    title: string,
    description: string,
    field: 'productCategories' | 'lifestyleCategories',
    icon: React.ReactNode
  ) => {
    const list = settings[field] || [];

    const withList = (nextList: string[]): CategorySettings => ({ ...settings, [field]: nextList });

    const addItem = () => {
      void commit(withList([...list, '새 항목']));
    };

    // 타이핑은 로컬만 갱신 — blur 에서 커밋한다(키 입력마다 PUT 방지).
    const updateItemLocal = (index: number, val: string) => {
      const newList = [...list];
      newList[index] = val;
      setSettings((prev) => ({ ...prev, [field]: newList }));
      setDirty(true);
    };

    const commitItemName = () => {
      if (!dirty) return;
      void commit(settings);
    };

    const removeItem = (index: number) => {
      void commit(withList(list.filter((_, i) => i !== index)));
    };

    const moveItem = (index: number, dir: -1 | 1) => {
      if (index + dir < 0 || index + dir >= list.length) return;
      const newList = [...list];
      const temp = newList[index + dir];
      newList[index + dir] = newList[index];
      newList[index] = temp;
      void commit(withList(newList));
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
                  onChange={(e) => updateItemLocal(index, e.target.value)}
                  onBlur={commitItemName}
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
      <PageHeader
        title="카테고리 관리"
        description="전체 사이트에서 사용되는 분류 체계와 카테고리를 관리합니다. 추가·삭제·순서 변경은 즉시 저장되고, 이름 수정은 입력칸을 벗어나는 순간 저장됩니다."
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
    </div>
  );
}
