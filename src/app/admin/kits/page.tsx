'use client';

import { useEffect, useRef, useState } from 'react';
import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { getKitsConfig, saveKitsConfig } from '@/lib/storage';
import type { CareKit } from '@/types';

const kitTypeOptions: Array<{ value: CareKit['type']; label: string }> = [
  { value: 'hospital', label: '병원 비치용' },
  { value: 'vitality', label: '활력 케어' },
  { value: 'funeral', label: '위로 키트' },
  { value: 'welcome', label: '웰컴 키트' },
  { value: 'sample', label: '샘플 키트' },
];

const visibleOptions = [
  { value: 'true', label: '노출중' },
  { value: 'false', label: '숨김' },
];

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function hasDraftValue(draft: Record<string, string | number>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(draft, key);
}

function draftText(
  draft: Record<string, string | number>,
  key: string,
  previousValue: string | undefined,
  defaultValue: string,
): string {
  return hasDraftValue(draft, key) ? asText(draft[key]) || defaultValue : previousValue || defaultValue;
}

function draftOptionalText(
  draft: Record<string, string | number>,
  key: string,
  previousValue: string | undefined,
): string | undefined {
  if (!hasDraftValue(draft, key)) return previousValue;
  return asText(draft[key]) || undefined;
}

function draftList(
  draft: Record<string, string | number>,
  key: string,
  previousValue: string[] | undefined,
): string[] {
  return hasDraftValue(draft, key) ? splitList(draft[key]) : previousValue ?? [];
}

function createKitId(): string {
  return `kit-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function splitList(value: unknown): string[] {
  return asText(value)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function asKitType(value: unknown): CareKit['type'] {
  return kitTypeOptions.some((option) => option.value === value) ? value as CareKit['type'] : 'sample';
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 'true';
}

function draftToCareKit(draft: Record<string, string | number>, previous?: CareKit): CareKit {
  return {
    id: previous?.id ?? createKitId(),
    name: draftText(draft, 'name', previous?.name, '새 케어 키트'),
    type: hasDraftValue(draft, 'type') ? asKitType(draft.type) : previous?.type ?? 'sample',
    target: draftText(draft, 'target', previous?.target, '-'),
    items: draftList(draft, 'items', previous?.items),
    purpose: draftText(draft, 'purpose', previous?.purpose, '-'),
    isVisible: hasDraftValue(draft, 'isVisible') ? asBoolean(draft.isVisible) : previous?.isVisible ?? true,
    description: draftOptionalText(draft, 'description', previous?.description),
  };
}

function typeLabel(type: CareKit['type']): string {
  return kitTypeOptions.find((option) => option.value === type)?.label ?? '샘플 키트';
}

export default function AdminKitsPage() {
  // draft = 현재 편집 중인 키트 목록. 마운트 후 콘센트로 실제 config 를 불러온다.
  // 초기값은 빈 값 — fallback 시드를 데이터처럼 렌더하면 로딩 동안 mock이 깜빡이는 오인을 만든다
  // (2026-07-18 prod 실측). 시드는 서버 폴백 전용(§4 원칙 0).
  const [items, setItems] = useState<CareKit[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // persisted = 마지막으로 DB 와 일치한 목록. 삭제는 이 기준으로 저장해 미저장 등록·수정
  // 드래프트가 삭제에 딸려 커밋되지 않게 한다(opus 리뷰 MEDIUM-1).
  const persistedItemsRef = useRef<CareKit[]>([]);
  // 저장·삭제 공용 상호배제 — 동시 PUT 이 서로를 덮어쓰는 레이스 방지(codex 2차 리뷰 HIGH).
  const busyRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    getKitsConfig()
      .then((config) => {
        if (cancelled) return;
        setLoadError(false);
        setItems(config.items);
        persistedItemsRef.current = config.items;
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 등록·수정·삭제 모두 batch save 를 기다리지 않고 즉시 DB 에 저장한다 — 모달에서 "목록에 반영"을
  // 눌러도 새로고침하면 사라지는 2단계 저장 함정 제거(2026-07-18 저장 유실 리포트). persisted 기준으로
  // 저장해 다른 미저장 편집이 함께 커밋되지 않게 한다(opus 리뷰 MEDIUM-1 확장). 로드 완료 전에는
  // default 목록을 저장하는 레이스를 막는다(opus 리뷰 MEDIUM-2). 관리자 PUT 라우트는 빈 배열을
  // 허용하므로 마지막 항목 차단은 없다.
  const handleDelete = async (id: string | number) => {
    if (!loaded || loadError) return false;
    if (busyRef.current) return false;
    busyRef.current = true;
    try {
      const nextItems = persistedItemsRef.current.filter((kit) => kit.id !== id);
      const { ok } = await saveKitsConfig({ items: nextItems });
      if (ok) {
        persistedItemsRef.current = nextItems;
        setItems((prev) => prev.filter((kit) => kit.id !== id));
        return true;
      } else {
        window.alert('삭제 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        return false;
      }
    } finally {
      busyRef.current = false;
    }
  };

  const handleCreate = async (draft: Record<string, string | number>) => {
    if (!loaded || loadError) return false;
    if (busyRef.current) return false;
    busyRef.current = true;
    try {
      const nextItems = [...persistedItemsRef.current, draftToCareKit(draft)];
      const { ok } = await saveKitsConfig({ items: nextItems });
      if (ok) {
        persistedItemsRef.current = nextItems;
        setItems(nextItems);
        return true;
      } else {
        window.alert('등록 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        return false;
      }
    } finally {
      busyRef.current = false;
    }
  };

  const handleUpdate = async (id: string | number, draft: Record<string, string | number>) => {
    if (!loaded || loadError) return false;
    if (busyRef.current) return false;
    busyRef.current = true;
    try {
      const nextItems = persistedItemsRef.current.map((kit) => (kit.id === id ? draftToCareKit(draft, kit) : kit));
      const { ok } = await saveKitsConfig({ items: nextItems });
      if (ok) {
        persistedItemsRef.current = nextItems;
        setItems(nextItems);
        return true;
      } else {
        window.alert('수정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        return false;
      }
    } finally {
      busyRef.current = false;
    }
  };

  const handleMove = async (id: string | number, direction: 'up' | 'down') => {
    if (!loaded || loadError || busyRef.current) return false;
    const currentIndex = persistedItemsRef.current.findIndex((kit) => kit.id === id);
    const targetIndex = currentIndex + (direction === 'up' ? -1 : 1);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= persistedItemsRef.current.length) return false;
    const nextItems = [...persistedItemsRef.current];
    [nextItems[currentIndex], nextItems[targetIndex]] = [nextItems[targetIndex], nextItems[currentIndex]];
    busyRef.current = true;
    try {
      const { ok } = await saveKitsConfig({ items: nextItems });
      if (!ok) return false;
      persistedItemsRef.current = nextItems;
      setItems(nextItems);
      return true;
    } finally {
      busyRef.current = false;
    }
  };

  const ready = loaded && !loadError;

  return (
    <AdminResourcePage
      title="케어 키트 관리"
      description={loadError ? '케어 키트 데이터를 불러오지 못했습니다. 저장을 막았습니다.' : !loaded ? '콘텐츠 로딩 중…' : '고객 화면에 실제로 보이는 케어 키트 카드를 관리합니다. 등록·수정·삭제·노출·순서가 모두 즉시 반영됩니다.'}
      actionLabel="키트 등록"
      affectedScreen="케어키트 소개 화면(/landing/care-kit)의 키트 카드"
      formIntro="케어키트 소개 화면의 카드에 보이는 내용만 입력합니다. 저장 버튼 한 번으로 등록 또는 수정이 끝납니다."
      searchPlaceholder="키트명, 구성품 검색"
      filters={['전체 유형', '병원 비치용', '이벤트 증정용', '노출 숨김']}
      columns={[
        { key: 'name', label: '키트명' },
        { key: 'typeLabel', label: '키트 유형' },
        { key: 'target', label: '제공 대상' },
        { key: 'purpose', label: '제공 목적' },
        { key: 'itemsLabel', label: '주요 구성품' },
        { key: 'status', label: '노출 상태' },
      ]}
      rows={items.map((kit) => ({
        id: kit.id,
        name: kit.name,
        type: kit.type,
        typeLabel: typeLabel(kit.type),
        target: kit.target,
        purpose: kit.purpose,
        items: kit.items.join('\n'),
        itemsLabel: kit.items.join(', '),
        isVisible: String(kit.isVisible),
        status: kit.isVisible ? '노출중' : '숨김',
        description: kit.description ?? '',
      }))}
      formFields={[
        { key: 'name', label: '키트명', group: '고객 화면의 키트 카드', required: true },
        { key: 'type', label: '키트 유형', type: 'select', options: kitTypeOptions, group: '고객 화면의 키트 카드' },
        { key: 'target', label: '추천 대상', group: '고객 화면의 키트 카드' },
        { key: 'purpose', label: '제공 목적', group: '고객 화면의 키트 카드' },
        { key: 'items', label: '주요 구성품', type: 'stringList', group: '고객 화면의 키트 카드', description: '구성품을 한 항목씩 추가합니다. 쉼표를 입력할 필요가 없습니다.' },
        { key: 'description', label: '키트 설명', type: 'textarea', group: '고객 화면의 키트 카드' },
        { key: 'isVisible', label: '고객 화면 노출 상태', type: 'select', options: visibleOptions, group: '고객 화면의 키트 카드', description: '숨김을 선택하면 고객 화면에서 카드가 보이지 않습니다.' },
      ]}
      onCreateRow={ready ? handleCreate : undefined}
      onUpdateRow={ready ? handleUpdate : undefined}
      onDeleteRow={ready ? handleDelete : undefined}
      onMoveRow={ready ? handleMove : undefined}
    />
  );
}
