'use client';

import { useEffect, useRef, useState } from 'react';
import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { PRODUCT_TAGS_CHANGED_EVENT } from '@/components/providers/ProductTagSettingsProvider';
import { getAdminProductTagsConfig, saveAdminProductTagsConfig } from '@/lib/storage';
import {
  createProductTagSlug,
  type ProductTagDefinition,
  type ProductTagsConfig,
} from '@/lib/productTags/config';

const yesNoOptions = [
  { value: 'true', label: '예' },
  { value: 'false', label: '아니오' },
];

function asBoolean(value: unknown): boolean {
  return value === true || value === 'true';
}

function toTag(
  draft: Record<string, string | number>,
  existing: readonly ProductTagDefinition[],
  previous?: ProductTagDefinition,
): ProductTagDefinition {
  const label = String(draft.label ?? previous?.label ?? '새 상품 태그').trim() || '새 상품 태그';
  return {
    slug: previous?.slug ?? createProductTagSlug(label, existing),
    label,
    isVisible: Object.prototype.hasOwnProperty.call(draft, 'isVisible')
      ? asBoolean(draft.isVisible)
      : previous?.isVisible ?? true,
    showInShopFilter: Object.prototype.hasOwnProperty.call(draft, 'showInShopFilter')
      ? asBoolean(draft.showInShopFilter)
      : previous?.showInShopFilter ?? false,
  };
}

export default function ProductTagsAdminPage() {
  const [config, setConfig] = useState<ProductTagsConfig>({ items: [], hiddenSlugs: [] });
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [persistenceReady, setPersistenceReady] = useState(false);
  const persistedRef = useRef<ProductTagsConfig>({ items: [], hiddenSlugs: [] });
  const busyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getAdminProductTagsConfig()
      .then((next) => {
        if (cancelled) return;
        persistedRef.current = next;
        setConfig(next);
        setPersistenceReady(next.persistenceReady);
        setLoaded(true);
        setLoadError(false);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => { cancelled = true; };
  }, []);

  const commit = async (next: ProductTagsConfig): Promise<boolean> => {
    if (!loaded || loadError || busyRef.current) return false;
    busyRef.current = true;
    try {
      const { ok } = await saveAdminProductTagsConfig(next);
      if (!ok) {
        window.alert('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        return false;
      }
      persistedRef.current = next;
      setConfig(next);
      window.dispatchEvent(new Event(PRODUCT_TAGS_CHANGED_EVENT));
      return true;
    } finally {
      busyRef.current = false;
    }
  };

  const handleCreate = (draft: Record<string, string | number>) => {
    const previous = persistedRef.current;
    const item = toTag(draft, previous.items);
    return commit({
      items: [...previous.items, item],
      hiddenSlugs: previous.hiddenSlugs.filter((slug) => slug !== item.slug),
    });
  };

  const handleUpdate = (id: string | number, draft: Record<string, string | number>) => {
    const previous = persistedRef.current;
    return commit({
      ...previous,
      items: previous.items.map((item) => item.slug === id ? toTag(draft, previous.items, item) : item),
    });
  };

  const handleDelete = (id: string | number) => {
    const slug = String(id);
    const previous = persistedRef.current;
    return commit({
      items: previous.items.filter((item) => item.slug !== slug),
      hiddenSlugs: Array.from(new Set([...previous.hiddenSlugs, slug])),
    });
  };

  const handleMove = (id: string | number, direction: 'up' | 'down') => {
    const previous = persistedRef.current;
    const index = previous.items.findIndex((item) => item.slug === id);
    const target = index + (direction === 'up' ? -1 : 1);
    if (index < 0 || target < 0 || target >= previous.items.length) return false;
    const items = [...previous.items];
    [items[index], items[target]] = [items[target], items[index]];
    return commit({ ...previous, items });
  };

  const ready = loaded && !loadError && persistenceReady;

  return (
    <div className="space-y-5">
      {loaded && !loadError && !persistenceReady && (
        <div role="alert" className="border border-[#D8C4A3] bg-[#FFF8E8] px-5 py-4 text-sm leading-6 text-[#5E4A28]">
          <strong className="text-[#17211D]">DB 적용 전이라 태그 변경을 잠시 막았습니다.</strong>
          <span className="ml-2">현재 홈페이지의 태그 13개는 그대로 보이며, 저장용 DB 적용이 끝나면 등록·수정·삭제·순서 버튼이 자동으로 열립니다.</span>
        </div>
      )}
      <AdminResourcePage
      title="상품 태그 관리"
      description={loadError
        ? '현재 홈페이지의 상품 태그를 불러오지 못해 저장을 막았습니다. 새로고침 후 다시 시도해 주세요.'
        : !loaded
          ? '현재 홈페이지의 상품 태그를 불러오는 중입니다.'
          : !persistenceReady
            ? '현재 홈페이지의 상품 태그를 확인하는 화면입니다. DB 적용 전에는 실수로 저장을 시도하지 않도록 쓰기 버튼을 숨깁니다.'
          : '현재 홈페이지 상품 카드의 작은 태그와 스토어 고민 필터를 관리합니다. 홈페이지의 기존 문구와 순서를 그대로 불러왔습니다.'}
      actionLabel="상품 태그 등록"
      affectedScreen="홈·스토어·브랜드의 상품 카드 태그와 스토어 고민 필터"
      formIntro="고객에게 보이는 이름만 입력하면 됩니다. 연결값은 자동으로 만들며 직원이 코드를 입력할 필요가 없습니다."
      searchPlaceholder="상품 태그 이름 검색"
      columns={[
        { key: 'label', label: '고객에게 보이는 이름' },
        { key: 'cardStatus', label: '상품 카드' },
        { key: 'filterStatus', label: '스토어 필터' },
      ]}
      rows={config.items.map((item) => ({
        id: item.slug,
        label: item.label,
        isVisible: String(item.isVisible),
        showInShopFilter: String(item.showInShopFilter),
        cardStatus: item.isVisible ? '보임' : '숨김',
        filterStatus: item.isVisible && item.showInShopFilter ? '필터에 보임' : '필터에 안 보임',
      }))}
      formFields={[
        { key: 'label', label: '고객에게 보이는 태그 이름', required: true, group: '현재 홈페이지 표시', description: '예: 피부, 배변, 생활, 냄새' },
        { key: 'isVisible', label: '상품 카드에 보이기', type: 'select', options: yesNoOptions, group: '현재 홈페이지 표시' },
        { key: 'showInShopFilter', label: '스토어 고민 필터에도 보이기', type: 'select', options: yesNoOptions, group: '현재 홈페이지 표시', description: '예를 선택하면 현재 스토어 왼쪽 고민 필터에 같은 이름이 추가됩니다.' },
      ]}
      onCreateRow={ready ? handleCreate : undefined}
      onUpdateRow={ready ? handleUpdate : undefined}
      onDeleteRow={ready ? handleDelete : undefined}
      onMoveRow={ready ? handleMove : undefined}
      />
    </div>
  );
}
