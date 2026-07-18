'use client';

import { useEffect, useRef, useState } from 'react';
import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { getAdminConcernsConfig, saveConcernsConfig } from '@/lib/storage';
import type { Concern, FAQ } from '@/types';

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

function splitList(value: unknown): string[] {
  // 중복 값 제거 — 공개 화면이 배열 값을 React key 로 쓰므로 중복이 key 충돌을 만든다.
  return Array.from(
    new Set(
      asText(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function draftList(
  draft: Record<string, string | number>,
  key: string,
  previousValue: string[] | undefined,
): string[] {
  return hasDraftValue(draft, key) ? splitList(draft[key]) : previousValue ?? [];
}

/**
 * faq textarea 형식: 한 줄에 "질문|답변" 하나. 구분자(|)가 없거나 질문/답변 한쪽이 빈 줄은 버린다
 * (폼 라벨에 명시). 같은 질문이 여러 줄이면 첫 줄만 남긴다 — 공개 화면이 question 을 React key 로 쓴다.
 */
function parseFaqLines(value: unknown): FAQ[] {
  const seenQuestions = new Set<string>();
  return (typeof value === 'string' ? value : '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('|'))
    .map((line) => {
      const separatorIndex = line.indexOf('|');
      return {
        question: line.slice(0, separatorIndex).trim(),
        answer: line.slice(separatorIndex + 1).trim(),
      };
    })
    .filter((faq) => {
      if (!faq.question || !faq.answer || seenQuestions.has(faq.question)) return false;
      seenQuestions.add(faq.question);
      return true;
    });
}

function faqToLines(faq: FAQ[]): string {
  return faq.map((item) => `${item.question}|${item.answer}`).join('\n');
}

/**
 * slug 는 상세 라우트(/concerns/[slug]) 링크 안정성 때문에 생성 시 한 번 고정하고 이후 편집하지
 * 않는다(폼에 노출하지 않음). title 의 영문·숫자를 살려 만들고, 한글 제목처럼 남는 글자가 없으면
 * 'care' 를 기본으로 쓴다. 기존 slug 와 겹치면 숫자 suffix 로 유일성을 보장한다.
 */
function createConcernSlug(title: string, existingSlugs: string[]): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'care';
  if (!existingSlugs.includes(base)) return base;
  let suffix = 2;
  while (existingSlugs.includes(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function draftToConcern(
  draft: Record<string, string | number>,
  existingSlugs: string[],
  previous?: Concern,
): Concern {
  const title = draftText(draft, 'title', previous?.title, '새 고민');
  return {
    // slug 는 상세 라우트 링크 키라 편집 불가 — 생성 시 title 기반으로 한 번 발급한다.
    slug: previous?.slug ?? createConcernSlug(title, existingSlugs),
    title,
    icon: draftText(draft, 'icon', previous?.icon, '🐾'),
    shortDescription: draftText(draft, 'shortDescription', previous?.shortDescription, '짧은 설명을 입력해 주세요.'),
    description: draftText(draft, 'description', previous?.description, '설명을 입력해 주세요.'),
    symptoms: draftList(draft, 'symptoms', previous?.symptoms),
    causes: draftList(draft, 'causes', previous?.causes),
    recommendedProductIds: draftList(draft, 'recommendedProductIds', previous?.recommendedProductIds),
    recommendedBrandIds: draftList(draft, 'recommendedBrandIds', previous?.recommendedBrandIds),
    insuranceCta: draftText(draft, 'insuranceCta', previous?.insuranceCta, '무료 보험 분석으로 보장 범위를 확인해보세요.'),
    faq: hasDraftValue(draft, 'faq') ? parseFaqLines(draft.faq) : previous?.faq ?? [],
  };
}

export default function AdminConcernsPage() {
  // draft = 현재 편집 중인 고민 목록. 마운트 후 관리자 콘센트로 실제 config 를 불러온다.
  // 초기값은 빈 값 — fallback 시드를 데이터처럼 렌더하면 로딩 동안 mock이 깜빡이는 오인을 만든다
  // (2026-07-18 prod 실측). 시드는 서버 폴백 전용(§4 원칙 0).
  // 관리자 getter(getAdminConcernsConfig)는 실패·깨진 응답에 throw 한다 — 공개 폴백 콘센트를
  // 쓰면 장애 시 default 콘텐츠가 뜬 채 저장돼 커스텀 콘텐츠를 덮어쓸 위험이 있다(insurance-content 미러).
  // 로드 완료 전(loaded=false)·loadError 면 저장을 막는다 — 로드 완료 전 저장이 default 로 DB 를
  // 덮어쓰는 레이스 방지(codex 리뷰 F-HIGH).
  const [items, setItems] = useState<Concern[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // persisted = 마지막으로 DB 와 일치한 목록. 삭제는 이 기준으로 저장해 미저장 등록·수정
  // 드래프트가 삭제에 딸려 커밋되지 않게 한다(opus 리뷰 MEDIUM-1).
  const persistedItemsRef = useRef<Concern[]>([]);
  // 저장·삭제 공용 상호배제 — 동시 PUT 이 서로를 덮어쓰는 레이스 방지(codex 2차 리뷰 HIGH).
  const busyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getAdminConcernsConfig()
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
  // 눌러도 새로고침하면 사라지는 2단계 저장 함정 제거(2026-07-18 저장 유실 리포트). persisted 기준
  // (마지막 DB 일치 목록)으로 저장해 다른 미저장 편집이 함께 커밋되지 않게 한다(opus 리뷰 MEDIUM-1 확장).
  // 저장 성공 시에만 draft 를 갱신한다.
  const handleCreate = async (draft: Record<string, string | number>) => {
    if (!loaded || loadError) return;
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const newConcern = draftToConcern(draft, persistedItemsRef.current.map((concern) => concern.slug));
      const nextItems = [...persistedItemsRef.current, newConcern];
      const { ok } = await saveConcernsConfig({ items: nextItems });
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
    if (!loaded || loadError) return;
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const existingSlugs = persistedItemsRef.current.map((concern) => concern.slug);
      const nextItems = persistedItemsRef.current.map((concern) =>
        concern.slug === id ? draftToConcern(draft, existingSlugs, concern) : concern,
      );
      const { ok } = await saveConcernsConfig({ items: nextItems });
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

  // 관리자 PUT 라우트가 items.length < 1 을 거부하므로 마지막 항목은 삭제를 막는다.
  const handleDelete = async (id: string | number) => {
    if (!loaded || loadError) return;
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const nextItems = persistedItemsRef.current.filter((concern) => concern.slug !== id);
      if (nextItems.length === 0) {
        window.alert('고민은 최소 1건 남아 있어야 합니다. 마지막 항목은 삭제할 수 없습니다.');
        return;
      }
      const { ok } = await saveConcernsConfig({ items: nextItems });
      if (ok) {
        persistedItemsRef.current = nextItems;
        setItems((prev) => prev.filter((concern) => concern.slug !== id));
      } else {
        window.alert('삭제 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      busyRef.current = false;
    }
  };

  return (
    <AdminResourcePage
      title="고민 관리"
      description={loadError ? '고민 데이터를 불러오지 못했습니다. 저장을 막았습니다.' : !loaded ? '콘텐츠 로딩 중…' : '증상과 원인 정보, 추천 상품·브랜드, 보험 CTA와 FAQ를 연결합니다. 등록·수정·삭제가 모두 즉시 반영됩니다.'}
      actionLabel="고민 등록"
      searchPlaceholder="고민명 검색"
      columns={[
        { key: 'icon', label: '아이콘' },
        { key: 'title', label: '고민명' },
        { key: 'symptomsCount', label: '증상' },
        { key: 'productsCount', label: '추천 상품' },
        { key: 'brandsCount', label: '추천 브랜드' },
        { key: 'faqCount', label: 'FAQ' },
      ]}
      rows={items.map((concern) => ({
        id: concern.slug,
        icon: concern.icon,
        title: concern.title,
        shortDescription: concern.shortDescription,
        description: concern.description,
        symptoms: concern.symptoms.join(', '),
        symptomsCount: `${concern.symptoms.length}개`,
        causes: concern.causes.join(', '),
        recommendedProductIds: concern.recommendedProductIds.join(', '),
        productsCount: `${concern.recommendedProductIds.length}개`,
        recommendedBrandIds: concern.recommendedBrandIds.join(', '),
        brandsCount: `${concern.recommendedBrandIds.length}개`,
        insuranceCta: concern.insuranceCta,
        faq: faqToLines(concern.faq),
        faqCount: `${concern.faq.length}개`,
      }))}
      formFields={[
        { key: 'title', label: '고민명' },
        { key: 'icon', label: '아이콘(이모지)' },
        { key: 'shortDescription', label: '짧은 설명' },
        { key: 'description', label: '설명', type: 'textarea' },
        { key: 'symptoms', label: '확인 증상(쉼표 구분)', type: 'textarea' },
        { key: 'causes', label: '원인 정보(쉼표 구분)', type: 'textarea' },
        { key: 'recommendedProductIds', label: '추천 상품 ID(쉼표 구분)' },
        { key: 'recommendedBrandIds', label: '추천 브랜드 ID(쉼표 구분)' },
        { key: 'insuranceCta', label: '보험 CTA' },
        { key: 'faq', label: 'FAQ(한 줄에 질문|답변 — 형식이 어긋난 줄은 저장 시 제외됨)', type: 'textarea' },
      ]}
      onCreateRow={handleCreate}
      onUpdateRow={handleUpdate}
      onDeleteRow={handleDelete}
    />
  );
}
