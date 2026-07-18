'use client';

import { useEffect, useRef, useState } from 'react';
import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { getAdminShowcaseReviewsConfig, saveShowcaseReviewsConfig } from '@/lib/storage';
import { formatDate } from '@/lib/format';
import type { Review } from '@/types';

const PET_TYPE_VALUES = ['dog', 'cat'] as const;

const PET_TYPE_LABELS: Record<(typeof PET_TYPE_VALUES)[number], string> = {
  dog: '강아지',
  cat: '고양이',
};

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

function draftPetType(
  draft: Record<string, string | number>,
  previousValue: Review['petType'] | undefined,
): Review['petType'] {
  const raw = hasDraftValue(draft, 'petType') ? asText(draft['petType']) : previousValue;
  return PET_TYPE_VALUES.includes(raw as (typeof PET_TYPE_VALUES)[number])
    ? (raw as Review['petType'])
    : 'dog';
}

/** rating 은 1~5 범위만 허용 — 벗어나거나 숫자가 아니면 5로 되돌린다. */
function draftRating(draft: Record<string, string | number>, previousValue: number | undefined): number {
  const raw = hasDraftValue(draft, 'rating') ? Number(draft['rating']) : previousValue;
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 1 && raw <= 5 ? raw : 5;
}

/** formFields 의 select 는 AdminResourcePage.normalizeDraftValue 가 boolean 을 'true'/'false' 문자열로 넘긴다. */
function draftBoolean(
  draft: Record<string, string | number>,
  key: string,
  previousValue: boolean | undefined,
  defaultValue: boolean,
): boolean {
  if (!hasDraftValue(draft, key)) return previousValue ?? defaultValue;
  const raw = draft[key];
  if (typeof raw === 'boolean') return raw;
  return asText(raw) === 'true';
}

/** id 는 상세·목록 화면의 식별 키 — 생성 시 한 번 발급하고 이후 편집하지 않는다(폼 미노출). */
function createReviewId(): string {
  return `review-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

/** 오늘 날짜를 기존 데이터와 같은 YYYY-MM-DD 문자열로 만든다(신규 후기의 createdAt 기본값). */
function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function draftToReview(draft: Record<string, string | number>, previous?: Review): Review {
  const image = draftText(draft, 'image', previous?.image, '');
  return {
    // id 는 목록 화면의 편집 키라 편집 불가 — 생성 시 review-<uuid> 로 한 번 발급한다.
    id: previous?.id ?? createReviewId(),
    productId: draftText(draft, 'productId', previous?.productId, 'p1'),
    petType: draftPetType(draft, previous?.petType),
    breed: draftText(draft, 'breed', previous?.breed, '믹스'),
    age: draftText(draft, 'age', previous?.age, '1살'),
    usePeriod: draftText(draft, 'usePeriod', previous?.usePeriod, '1개월'),
    rating: draftRating(draft, previous?.rating),
    content: draftText(draft, 'content', previous?.content, '내용을 입력해 주세요.'),
    image: image === '' ? undefined : image,
    isPhotoReview: draftBoolean(draft, 'isPhotoReview', previous?.isPhotoReview, false),
    createdAt: previous?.createdAt ?? todayString(),
    isVisible: draftBoolean(draft, 'isVisible', previous?.isVisible, true),
    isBest: draftBoolean(draft, 'isBest', previous?.isBest, false),
  };
}

export default function AdminReviewsPage() {
  // items = 현재 편집 중인 전시 후기 목록. 마운트 후 관리자 콘센트로 실제 config 를 불러온다.
  // 초기값은 빈 값 — fallback 시드를 데이터처럼 렌더하면 로딩 동안 mock이 깜빡이는 오인을 만든다
  // (2026-07-18 prod 실측). 시드는 서버 폴백 전용(§4 원칙 0).
  // 관리자 getter(getAdminShowcaseReviewsConfig)는 실패·깨진 응답에 throw 한다
  // — 공개 폴백 콘센트를 쓰면 장애 시 default 콘텐츠가 뜬 채 저장돼 커스텀 콘텐츠를 덮어쓸 위험이
  // 있다(notices 미러). 로드 완료 전(loaded=false)·loadError 면 저장을 막는다 — 로드 완료 전 저장이
  // default 로 DB 를 덮어쓰는 레이스 방지(codex 리뷰 F-HIGH).
  const [items, setItems] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // persisted = 마지막으로 DB 와 일치한 목록. 삭제는 이 기준으로 저장해 미저장 등록·수정
  // 드래프트가 삭제에 딸려 커밋되지 않게 한다(opus 리뷰 MEDIUM-1).
  const persistedItemsRef = useRef<Review[]>([]);
  // 저장·삭제 공용 상호배제 — 동시 PUT 이 서로를 덮어쓰는 레이스 방지(codex 2차 리뷰 HIGH).
  // 저장 중(batch save PUT in flight)에 삭제를 누르면 삭제가 persisted 기준 nextItems 를 저장하고,
  // 뒤늦게 도착한 저장 PUT 이 방금 지운 항목을 되살릴 수 있었다 — busyRef 로 저장·삭제·삭제-삭제
  // 세 경우 모두 상호배제한다.
  const busyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getAdminShowcaseReviewsConfig()
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

  // 로드 완료 전·로드 실패 시에는 CRUD 콜백을 아예 안 넘긴다(→ AdminResourcePage 가 해당 UI 를 숨김).
  // 콜백 내부 !loaded 가드만으로는 버튼이 보이는데 눌러도 조용히 무시되는 no-op 이 된다(codex F3).
  const ready = loaded && !loadError;

  // 등록·수정·삭제 모두 batch save 를 기다리지 않고 즉시 DB 에 저장한다 — "등록/수정/삭제를 했는데
  // 새로고침하면 되돌아온다" 오인 방지(2026-07-18 저장 유실 리포트 — 2단계 저장 함정 제거).
  // persistedItemsRef(마지막으로 DB 와 일치한 목록) 기준으로 nextItems 를 만들어 저장한다 — items
  // (현재 draft)를 기준으로 저장하면 다른 미저장 편집이 이 저장에 딸려 함께 커밋된다(opus 리뷰
  // MEDIUM-1 의 연장). 성공 시에만 draft(items)·persisted 를 함께 갱신해 계속 서로 일치시킨다.
  // notices 와 달리 전시 후기는 빈 목록을 허용하므로 마지막 1건 삭제를 막지 않는다. busyRef 로
  // 등록·수정·삭제 세 액션을 전부 상호배제한다(codex 2차 리뷰 HIGH).
  const handleCreate = async (draft: Record<string, string | number>) => {
    if (!loaded || loadError || busyRef.current) return;
    const newReview = draftToReview(draft);
    const nextItems = [...persistedItemsRef.current, newReview];
    busyRef.current = true;
    try {
      const { ok } = await saveShowcaseReviewsConfig({ items: nextItems });
      if (ok) {
        persistedItemsRef.current = nextItems;
        setItems(nextItems);
      } else {
        window.alert('등록 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      busyRef.current = false;
    }
  };

  const handleUpdate = async (id: string | number, draft: Record<string, string | number>) => {
    if (!loaded || loadError || busyRef.current) return;
    const nextItems = persistedItemsRef.current.map((review) =>
      review.id === id ? draftToReview(draft, review) : review,
    );
    busyRef.current = true;
    try {
      const { ok } = await saveShowcaseReviewsConfig({ items: nextItems });
      if (ok) {
        persistedItemsRef.current = nextItems;
        setItems(nextItems);
      } else {
        window.alert('수정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      busyRef.current = false;
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!loaded || loadError || busyRef.current) return;
    const nextItems = persistedItemsRef.current.filter((review) => review.id !== id);
    busyRef.current = true;
    try {
      const { ok } = await saveShowcaseReviewsConfig({ items: nextItems });
      if (ok) {
        persistedItemsRef.current = nextItems;
        setItems((prev) => prev.filter((review) => review.id !== id));
      } else {
        window.alert('삭제 저장에 실패했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.');
      }
    } finally {
      busyRef.current = false;
    }
  };

  return (
    <AdminResourcePage
      title="후기 관리"
      description={loadError ? '후기 데이터를 불러오지 못했습니다. 저장을 막았습니다.' : !loaded ? '콘텐츠 로딩 중…' : '사진과 별점, 후기 내용을 확인하고 노출 및 베스트 상태를 관리합니다. 등록·수정·삭제가 모두 즉시 반영됩니다.'}
      actionLabel="후기 등록"
      searchPlaceholder="상품명, 견종, 후기 내용 검색"
      columns={[
        { key: 'product', label: '상품' },
        { key: 'pet', label: '반려동물' },
        { key: 'rating', label: '별점' },
        { key: 'photo', label: '사진' },
        { key: 'content', label: '후기 내용' },
        { key: 'status', label: '노출 상태' },
        { key: 'date', label: '작성일' },
      ]}
      rows={items.map((review) => ({
        id: review.id,
        product: review.productId,
        pet: `${review.breed} / ${review.age}`,
        rating: review.rating,
        photo: review.isPhotoReview ? '있음' : '없음',
        content: review.content,
        status: review.isVisible === false ? '숨김' : review.isBest ? '노출중 · BEST' : '노출중',
        date: formatDate(review.createdAt),
        // 편집 모달 프리필용 원본 필드(formFields.key 와 매칭).
        productId: review.productId,
        petType: review.petType,
        breed: review.breed,
        age: review.age,
        usePeriod: review.usePeriod,
        image: review.image ?? '',
        // ResourceRow 는 string|number 만 허용한다 — boolean 은 select formFields 와 같은
        // 'true'/'false' 문자열로 내려 편집 모달이 정확히 프리필되게 한다(AdminResourcePage.normalizeDraftValue 대칭).
        isPhotoReview: review.isPhotoReview ? 'true' : 'false',
        isVisible: review.isVisible === false ? 'false' : 'true',
        isBest: review.isBest ? 'true' : 'false',
      }))}
      formFields={[
        { key: 'productId', label: '상품 ID(p1 형식)' },
        {
          key: 'petType',
          label: '반려동물',
          type: 'select',
          options: PET_TYPE_VALUES.map((value) => ({ value, label: PET_TYPE_LABELS[value] })),
        },
        { key: 'breed', label: '견종/묘종' },
        { key: 'age', label: '나이' },
        { key: 'usePeriod', label: '사용 기간' },
        { key: 'rating', label: '별점(1~5)', type: 'number' },
        { key: 'content', label: '후기 내용', type: 'textarea' },
        { key: 'image', label: '사진 경로(선택, /reviews/… 형식)' },
        {
          key: 'isPhotoReview',
          label: '사진 후기 여부',
          type: 'select',
          options: [
            { value: 'true', label: '사진 후기' },
            { value: 'false', label: '일반 후기' },
          ],
        },
        {
          key: 'isVisible',
          label: '노출 상태',
          type: 'select',
          options: [
            { value: 'true', label: '노출' },
            { value: 'false', label: '숨김' },
          ],
        },
        {
          key: 'isBest',
          label: 'BEST 여부',
          type: 'select',
          options: [
            { value: 'true', label: 'BEST' },
            { value: 'false', label: '일반' },
          ],
        },
      ]}
      onCreateRow={ready ? handleCreate : undefined}
      onUpdateRow={ready ? handleUpdate : undefined}
      onDeleteRow={ready ? handleDelete : undefined}
    />
  );
}
