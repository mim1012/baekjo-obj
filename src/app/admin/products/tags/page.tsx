'use client';

// 상품 '고민' 태그 관리 화면. 현재 고객 홈페이지 상품 카드의 작은 태그와 스토어 '고민' 필터를
// 관리자가 등록·수정·삭제·순서 변경한다(product_tags_config 한 행 — src/lib/productTags/repo.ts).
// AdminResourcePage는 필드마다 즉시저장(등록/수정/삭제 각각 commit) 패턴을 쓰므로 별도 저장 버튼이
// 없다 — 등록·수정 모달의 "저장" 버튼이 곧 확정이다(admin-cms-immediate-persist 규율).
import { useEffect, useRef, useState } from 'react';
import AdminResourcePage from '@/components/admin/AdminResourcePage';
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

/** 등록/수정 폼 draft → ProductTagDefinition. slug는 최초 등록 시 한 번만 만들고 이후 고정한다
 *  (상품 concernTags·스토어 필터 URL이 이 slug로 연결되므로 이름을 바꿔도 연결이 끊기지 않는다). */
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
  // AdminResourcePage는 draft를 자체 상태로 들지 않으므로, "지금 저장된 정본"을 이 ref에 두고
  // 매 커밋마다 그 위에 patch를 얹는다(레이스 방지 — CategorySettingsProvider와 동일 원칙).
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
    return () => {
      cancelled = true;
    };
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
      return true;
    } finally {
      busyRef.current = false;
    }
  };

  // onCreateRow/onUpdateRow는 void|Promise<void>만 허용한다 — commit()의 boolean 결과는
  // window.alert로 이미 소비했으므로 여기서는 값을 반환하지 않고 완료만 기다린다.
  const handleCreate = async (draft: Record<string, string | number>): Promise<void> => {
    const previous = persistedRef.current;
    const item = toTag(draft, previous.items);
    await commit({
      items: [...previous.items, item],
      // 과거에 삭제했던 slug를 같은 이름으로 다시 등록하면 hiddenSlugs에서 빼 다시 보이게 한다.
      hiddenSlugs: previous.hiddenSlugs.filter((slug) => slug !== item.slug),
    });
  };

  const handleUpdate = async (id: string | number, draft: Record<string, string | number>): Promise<void> => {
    const previous = persistedRef.current;
    await commit({
      ...previous,
      items: previous.items.map((item) => (item.slug === id ? toTag(draft, previous.items, item) : item)),
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

  const handleMove = (slug: string, direction: 'up' | 'down') => {
    const previous = persistedRef.current;
    const index = previous.items.findIndex((item) => item.slug === slug);
    const target = index + (direction === 'up' ? -1 : 1);
    if (index < 0 || target < 0 || target >= previous.items.length) return;
    const items = [...previous.items];
    [items[index], items[target]] = [items[target], items[index]];
    void commit({ ...previous, items });
  };

  // 조회 실패·미로드·DB 미적용이면 쓰기 UI를 전부 숨긴다 — 실수로 default 값을 실 DB 위에
  // 덮어쓰는 것을 막는다(CategorySettingsProvider의 loaded 가드와 동일 원칙).
  const ready = loaded && !loadError && persistenceReady;

  return (
    <div className="space-y-5">
      {loaded && !loadError && !persistenceReady && (
        <div role="alert" className="border border-[#D8C4A3] bg-[#FFF8E8] px-5 py-4 text-sm leading-6 text-[#5E4A28]">
          <strong className="text-[#17211D]">DB 적용 전이라 태그 변경을 잠시 막았습니다.</strong>
          <span className="ml-2">
            현재 홈페이지의 태그는 그대로 보이며, 저장용 DB 적용이 끝나면 등록·수정·삭제·순서 버튼이 자동으로 열립니다.
          </span>
        </div>
      )}
      <AdminResourcePage
        title="상품 태그 관리"
        description={
          loadError
            ? '현재 홈페이지의 상품 태그를 불러오지 못해 저장을 막았습니다. 새로고침 후 다시 시도해 주세요.'
            : !loaded
              ? '현재 홈페이지의 상품 태그를 불러오는 중입니다.'
              : !persistenceReady
                ? '현재 홈페이지의 상품 태그를 확인하는 화면입니다. DB 적용 전에는 실수로 저장을 시도하지 않도록 쓰기 버튼을 숨깁니다.'
                : '현재 홈페이지 상품 카드의 작은 태그와 스토어 고민 필터를 관리합니다. 홈페이지의 기존 문구와 순서를 그대로 불러왔습니다.'
        }
        actionLabel="상품 태그 등록"
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
          // AdminResourcePage의 FormField에는 description이 없다 — 안내는 라벨 문구 자체와
          // 아래 페이지 description(예/아니오 셀렉트 의미)으로 대신한다.
          { key: 'label', label: '고객에게 보이는 태그 이름 (예: 피부, 배변, 생활, 냄새)', required: true },
          { key: 'isVisible', label: '상품 카드에 보이기', type: 'select', options: yesNoOptions },
          {
            key: 'showInShopFilter',
            label: '스토어 고민 필터에도 보이기(예 = 왼쪽 고민 필터에 같은 이름 추가)',
            type: 'select',
            options: yesNoOptions,
          },
        ]}
        onCreateRow={ready ? handleCreate : undefined}
        onUpdateRow={ready ? handleUpdate : undefined}
        onDeleteRow={ready ? handleDelete : undefined}
        customActions={
          ready
            ? (row) => {
                const slug = String(row.id);
                const index = config.items.findIndex((item) => item.slug === slug);
                return (
                  <span className="mr-4 inline-flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleMove(slug, 'up')}
                      disabled={index <= 0}
                      aria-label={`${row.label} 위로 이동`}
                      className="inline-flex size-7 items-center justify-center border border-[#D1D0C8] bg-white text-[#59615B] disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(slug, 'down')}
                      disabled={index === config.items.length - 1}
                      aria-label={`${row.label} 아래로 이동`}
                      className="inline-flex size-7 items-center justify-center border border-[#D1D0C8] bg-white text-[#59615B] disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </span>
                );
              }
            : undefined
        }
      />
    </div>
  );
}
