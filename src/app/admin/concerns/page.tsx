'use client';

import { useEffect, useRef, useState } from 'react';
import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { buildProductOptions } from '@/components/admin/adminPickerOptions';
import type { AdminIdPickerOption } from '@/components/admin/AdminIdMultiPicker';
import { getAdminBrands, getAdminConcernsConfig, getAdminProducts, saveConcernsConfig } from '@/lib/storage';
import type { Concern, ConcernQuickGuideItem, FAQ } from '@/types';

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
        .split(/\r?\n|,/)
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

function parseQuickGuideLines(value: unknown): ConcernQuickGuideItem[] {
  return (typeof value === 'string' ? value : '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const [title = '', description = '', href = '', rawIcon = 'search'] = line.split('|').map((part) => part.trim());
      const icon = rawIcon === 'home' || rawIcon === 'hospital' ? rawIcon : 'search';
      return title && description && href ? [{ title, description, href, icon }] : [];
    });
}

function quickGuideToLines(items: ConcernQuickGuideItem[] | undefined): string {
  return (items ?? []).map((item) => `${item.title}|${item.description}|${item.href}|${item.icon}`).join('\n');
}

function lineList(value: unknown): string[] {
  return (typeof value === 'string' ? value : '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
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
    // 아래 3개는 현재 고객 화면이 읽지 않는 이전 데이터다. 관리자 입력란으로 노출하면
    // 직원이 수정한 값이 홈페이지에 반영된다고 오해하므로 UI에서는 숨기고 기존 값만 보존한다.
    causes: previous?.causes ?? [],
    recommendedProductIds: draftList(draft, 'recommendedProductIds', previous?.recommendedProductIds),
    recommendedBrandIds: previous?.recommendedBrandIds ?? [],
    insuranceCta: previous?.insuranceCta ?? '무료 보험 분석으로 보장 범위를 확인해보세요.',
    faq: hasDraftValue(draft, 'faq') ? parseFaqLines(draft.faq) : previous?.faq ?? [],
    heroTitle: draftText(draft, 'heroTitle', previous?.heroTitle, `${title}, 어디서부터 살펴볼까요?`),
    heroDescription: draftText(draft, 'heroDescription', previous?.heroDescription, previous?.shortDescription || '케어 기준을 확인해 보세요.'),
    heroImage: draftText(draft, 'heroImage', previous?.heroImage, '/images/hero-curation-visual.png'),
    heroImagePosition: draftText(draft, 'heroImagePosition', previous?.heroImagePosition, 'center'),
    backLabel: draftText(draft, 'backLabel', previous?.backLabel, '케어 가이드로 돌아가기'),
    badgeSuffix: draftText(draft, 'badgeSuffix', previous?.badgeSuffix, '케어'),
    quickGuideItems: hasDraftValue(draft, 'quickGuideItems') ? parseQuickGuideLines(draft.quickGuideItems) : previous?.quickGuideItems ?? [],
    hospitalSigns: hasDraftValue(draft, 'hospitalSigns') ? lineList(draft.hospitalSigns) : previous?.hospitalSigns ?? [],
    signalsTitle: draftText(draft, 'signalsTitle', previous?.signalsTitle, '생활 속에서 보이는 신호'),
    hospitalTitle: draftText(draft, 'hospitalTitle', previous?.hospitalTitle, '병원 진료를 고려해야 할 신호'),
    hospitalDescription: draftText(draft, 'hospitalDescription', previous?.hospitalDescription, '아래 증상이 보인다면 집에서 관리하기보다 수의사와 상담해보세요.'),
    productsTitle: draftText(draft, 'productsTitle', previous?.productsTitle, '일상 관리에 함께 볼 상품'),
    productsLinkLabel: draftText(draft, 'productsLinkLabel', previous?.productsLinkLabel, `${title} 관련 상품 보기`),
    productsEmptyText: draftText(draft, 'productsEmptyText', previous?.productsEmptyText, '관련 상품을 준비하고 있습니다.'),
    insuranceTitle: draftText(draft, 'insuranceTitle', previous?.insuranceTitle, '우리 아이에게 필요한 보장은 무엇일까요?'),
    insuranceDescription: draftText(draft, 'insuranceDescription', previous?.insuranceDescription, '나이와 건강 상태를 바탕으로 우리 아이에게 맞는 보험을 살펴보세요.'),
    insuranceButtonLabel: draftText(draft, 'insuranceButtonLabel', previous?.insuranceButtonLabel, '보험 분석하기'),
    insuranceButtonHref: draftText(draft, 'insuranceButtonHref', previous?.insuranceButtonHref, '/insurance'),
    insuranceImage: draftText(draft, 'insuranceImage', previous?.insuranceImage, '/images/insurance-dog.webp'),
    insuranceImageAlt: draftText(draft, 'insuranceImageAlt', previous?.insuranceImageAlt, '펫보험 분석'),
    reviewsTitle: draftText(draft, 'reviewsTitle', previous?.reviewsTitle, '보호자 후기'),
    reviewsLinkLabel: draftText(draft, 'reviewsLinkLabel', previous?.reviewsLinkLabel, '후기 전체 보기'),
    faqTitle: draftText(draft, 'faqTitle', previous?.faqTitle, '많이 궁금해하시는 점'),
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
  // 추천 상품 이름 기반 선택 드롭다운 옵션. config 로드와 독립적으로 불러오고, 실패해도
  // 화면은 죽지 않는다(빈 옵션 → 기존 id 는 dangling chip 으로 계속 보인다).
  const [productOptions, setProductOptions] = useState<AdminIdPickerOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAdminProducts(), getAdminBrands()])
      .then(([products, brands]) => {
        if (cancelled) return;
        setProductOptions(buildProductOptions(products, brands));
      })
      .catch(() => {
        // 실패 시 옵션 없이 진행 — 텍스트 폴백 대신 dangling chip 으로 기존 값을 유지한다.
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!loaded || loadError) return false;
    if (busyRef.current) return false;
    busyRef.current = true;
    try {
      const newConcern = draftToConcern(draft, persistedItemsRef.current.map((concern) => concern.slug));
      const nextItems = [...persistedItemsRef.current, newConcern];
      const { ok } = await saveConcernsConfig({ items: nextItems });
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
      const existingSlugs = persistedItemsRef.current.map((concern) => concern.slug);
      const nextItems = persistedItemsRef.current.map((concern) =>
        concern.slug === id ? draftToConcern(draft, existingSlugs, concern) : concern,
      );
      const { ok } = await saveConcernsConfig({ items: nextItems });
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

  // 관리자 PUT 라우트가 items.length < 1 을 거부하므로 마지막 항목은 삭제를 막는다.
  const handleDelete = async (id: string | number) => {
    if (!loaded || loadError) return false;
    if (busyRef.current) return false;
    busyRef.current = true;
    try {
      const nextItems = persistedItemsRef.current.filter((concern) => concern.slug !== id);
      if (nextItems.length === 0) {
        window.alert('고민은 최소 1건 남아 있어야 합니다. 마지막 항목은 삭제할 수 없습니다.');
        return false;
      }
      const { ok } = await saveConcernsConfig({ items: nextItems });
      if (ok) {
        persistedItemsRef.current = nextItems;
        setItems((prev) => prev.filter((concern) => concern.slug !== id));
        return true;
      } else {
        window.alert('삭제 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        return false;
      }
    } finally {
      busyRef.current = false;
    }
  };

  const handleMove = async (id: string | number, direction: 'up' | 'down') => {
    if (!loaded || loadError || busyRef.current) return false;
    const currentIndex = persistedItemsRef.current.findIndex((concern) => concern.slug === id);
    const targetIndex = currentIndex + (direction === 'up' ? -1 : 1);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= persistedItemsRef.current.length) return false;
    const nextItems = [...persistedItemsRef.current];
    [nextItems[currentIndex], nextItems[targetIndex]] = [nextItems[targetIndex], nextItems[currentIndex]];
    busyRef.current = true;
    try {
      const { ok } = await saveConcernsConfig({ items: nextItems });
      if (!ok) return false;
      persistedItemsRef.current = nextItems;
      setItems(nextItems);
      return true;
    } finally {
      busyRef.current = false;
    }
  };

  // 로드 완료 전에는 CRUD 콜백을 아예 안 넘겨 버튼을 숨긴다 — 로드 전 클릭이 조용히 no-op 되는
  // 걸 막는다(notices/kits/partners 와 동일 컨벤션, wave-2 e2e 발견).
  const ready = loaded && !loadError;

  // 공개 /concerns 는 목록 순서 그대로 상위 6개를 메인 카드, 7~12번째를 서브 목록으로 표시한다.
  // (slice(8,12))으로 그리고 13번째부터는 어디에도 노출하지 않는다(src/app/concerns/page.tsx).
  // 관리자 화면엔 이 규칙이 어디에도 적혀 있지 않아 "등록했는데 안 보임" 문의가 반복됐다
  // (wave-2 e2e 발견). 정상 상태 설명에 규칙을 명시하고, 12개를 넘으면 경고를 덧붙인다.
  const exposureRuleNote = '목록 순서가 곧 공개 노출 순서입니다 — 1~6번째는 메인 카드, 7~12번째는 추가 생활 케어, 13번째부터는 공개 목록에 노출되지 않습니다.';
  const exposureOverflowWarning =
    items.length > 12 ? ` 현재 ${items.length}개 — 13번째 이후 고민은 공개 목록에 노출되지 않습니다.` : '';

  return (
    <AdminResourcePage
      title="고민 관리"
      description={
        loadError
          ? '고민 데이터를 불러오지 못했습니다. 저장을 막았습니다.'
          : !loaded
            ? '콘텐츠 로딩 중…'
            : `고민 카드와 상세 화면의 증상·생활 신호·추천 상품·보험 배너·FAQ를 연결합니다. 등록·수정·삭제가 모두 즉시 반영됩니다. ${exposureRuleNote}${exposureOverflowWarning}`
      }
      actionLabel="고민 등록"
      affectedScreen="케어 가이드 목록(/concerns) · 각 고민 상세 화면(/concerns/고민주소)"
      formIntro="화면에 보이는 순서대로 영역을 나눴습니다. 필요한 항목은 ‘추가’ 버튼으로 입력하고, 마지막 버튼 한 번으로 저장과 고객 화면 반영이 끝납니다."
      searchPlaceholder="고민명 검색"
      columns={[
        { key: 'icon', label: '아이콘' },
        { key: 'title', label: '고민명' },
        { key: 'symptomsCount', label: '증상' },
        { key: 'productsCount', label: '추천 상품' },
        { key: 'faqCount', label: 'FAQ' },
      ]}
      rows={items.map((concern) => ({
        id: concern.slug,
        icon: concern.icon,
        title: concern.title,
        shortDescription: concern.shortDescription,
        description: concern.description,
        symptoms: concern.symptoms.join('\n'),
        symptomsCount: `${concern.symptoms.length}개`,
        recommendedProductIds: concern.recommendedProductIds.join(', '),
        productsCount: `${concern.recommendedProductIds.length}개`,
        faq: faqToLines(concern.faq),
        faqCount: `${concern.faq.length}개`,
        heroTitle: concern.heroTitle ?? '',
        heroDescription: concern.heroDescription ?? '',
        heroImage: concern.heroImage ?? '',
        heroImagePosition: concern.heroImagePosition ?? 'center',
        backLabel: concern.backLabel ?? '',
        badgeSuffix: concern.badgeSuffix ?? '',
        quickGuideItems: quickGuideToLines(concern.quickGuideItems),
        hospitalSigns: (concern.hospitalSigns ?? []).join('\n'),
        signalsTitle: concern.signalsTitle ?? '',
        hospitalTitle: concern.hospitalTitle ?? '',
        hospitalDescription: concern.hospitalDescription ?? '',
        productsTitle: concern.productsTitle ?? '',
        productsLinkLabel: concern.productsLinkLabel ?? '',
        productsEmptyText: concern.productsEmptyText ?? '',
        insuranceTitle: concern.insuranceTitle ?? '',
        insuranceDescription: concern.insuranceDescription ?? '',
        insuranceButtonLabel: concern.insuranceButtonLabel ?? '',
        insuranceButtonHref: concern.insuranceButtonHref ?? '',
        insuranceImage: concern.insuranceImage ?? '',
        insuranceImageAlt: concern.insuranceImageAlt ?? '',
        reviewsTitle: concern.reviewsTitle ?? '',
        reviewsLinkLabel: concern.reviewsLinkLabel ?? '',
        faqTitle: concern.faqTitle ?? '',
      }))}
      formFields={[
        { key: 'title', label: '고민명', group: '1. 케어 가이드 목록 카드', required: true, description: '케어 가이드 목록의 카드 제목과 상세 화면의 고민 이름에 함께 사용됩니다.' },
        { key: 'icon', label: '카드 아이콘', group: '1. 케어 가이드 목록 카드', description: '목록 카드 앞에 보이는 이모지입니다. 예: 🐾' },
        { key: 'shortDescription', label: '카드 짧은 설명', group: '1. 케어 가이드 목록 카드', description: '목록 카드에서 고민명 아래에 보이는 한두 문장입니다.' },
        { key: 'description', label: '카드 자세한 설명', type: 'textarea', group: '1. 케어 가이드 목록 카드', description: '목록의 보조 설명과 기본 상세 안내에 사용됩니다.' },
        { key: 'heroTitle', label: '큰 제목', type: 'textarea', group: '2. 상세 화면 첫 화면', description: '고민 상세 화면을 열었을 때 가장 먼저 보이는 큰 제목입니다.' },
        { key: 'heroDescription', label: '첫 화면 설명', type: 'textarea', group: '2. 상세 화면 첫 화면' },
        { key: 'heroImage', label: '대표 이미지', type: 'image', group: '2. 상세 화면 첫 화면' },
        {
          key: 'heroImagePosition',
          label: '이미지에서 중심으로 보여줄 위치',
          type: 'select',
          group: '2. 상세 화면 첫 화면',
          options: [
            { value: 'center', label: '가운데' },
            { value: 'left center', label: '왼쪽' },
            { value: 'right center', label: '오른쪽' },
            { value: 'center top', label: '위쪽' },
            { value: 'center bottom', label: '아래쪽' },
          ],
        },
        { key: 'backLabel', label: '뒤로가기 버튼 이름', group: '2. 상세 화면 첫 화면', description: '누르면 케어 가이드 목록으로 돌아갑니다.' },
        { key: 'badgeSuffix', label: '고민명 옆 작은 표시', group: '2. 상세 화면 첫 화면', description: '예: “피부 케어”에서 ‘케어’ 부분입니다.' },
        { key: 'quickGuideItems', label: '상단 바로가기 카드', type: 'quickGuideList', group: '3. 상세 화면 상단 바로가기', description: '제목·설명·이동 위치·아이콘을 각각 선택합니다. 기호나 주소를 직접 입력할 필요가 없습니다.' },
        { key: 'signalsTitle', label: '생활 신호 영역 제목', group: '4. 생활 신호와 병원 방문 기준' },
        { key: 'symptoms', label: '확인할 생활 신호', type: 'stringList', group: '4. 생활 신호와 병원 방문 기준', description: '한 항목씩 추가합니다. 쉼표를 입력할 필요가 없습니다.' },
        { key: 'hospitalTitle', label: '병원 방문 기준 제목', group: '4. 생활 신호와 병원 방문 기준' },
        { key: 'hospitalDescription', label: '병원 방문 기준 안내문', type: 'textarea', group: '4. 생활 신호와 병원 방문 기준' },
        { key: 'hospitalSigns', label: '병원 방문을 고려할 신호', type: 'stringList', group: '4. 생활 신호와 병원 방문 기준', description: '위급하거나 진료가 필요한 신호를 한 항목씩 추가합니다.' },
        { key: 'productsTitle', label: '추천 상품 영역 제목', group: '5. 추천 상품' },
        { key: 'recommendedProductIds', label: '연결할 추천 상품', type: 'multiPicker', pickerOptions: productOptions, group: '5. 추천 상품', description: '상품 이름을 검색해 체크하면 상세 화면에 해당 상품이 표시됩니다.' },
        { key: 'productsLinkLabel', label: '관련 상품 보기 버튼 이름', group: '5. 추천 상품' },
        { key: 'productsEmptyText', label: '연결된 상품이 없을 때 문구', group: '5. 추천 상품' },
        { key: 'insuranceTitle', label: '보험 배너 제목', type: 'textarea', group: '6. 보험 안내 배너' },
        { key: 'insuranceDescription', label: '보험 배너 설명', type: 'textarea', group: '6. 보험 안내 배너' },
        { key: 'insuranceButtonLabel', label: '보험 버튼 이름', group: '6. 보험 안내 배너' },
        { key: 'insuranceButtonHref', label: '보험 버튼 연결 주소', group: '6. 보험 안내 배너', description: '홈페이지 안의 보험 화면은 /insurance처럼 입력합니다.' },
        { key: 'insuranceImage', label: '보험 배너 이미지', type: 'image', group: '6. 보험 안내 배너' },
        { key: 'insuranceImageAlt', label: '보험 이미지 설명', group: '6. 보험 안내 배너', description: '이미지를 볼 수 없는 고객을 위한 짧은 설명입니다.' },
        { key: 'reviewsTitle', label: '후기 영역 제목', group: '7. 후기와 자주 묻는 질문' },
        { key: 'reviewsLinkLabel', label: '후기 전체 보기 버튼 이름', group: '7. 후기와 자주 묻는 질문' },
        { key: 'faqTitle', label: '자주 묻는 질문 영역 제목', group: '7. 후기와 자주 묻는 질문' },
        { key: 'faq', label: '질문과 답변', type: 'faqList', group: '7. 후기와 자주 묻는 질문', description: '질문과 답변을 각각의 입력칸에 작성합니다.' },
      ]}
      onCreateRow={ready ? handleCreate : undefined}
      onUpdateRow={ready ? handleUpdate : undefined}
      onDeleteRow={ready ? handleDelete : undefined}
      onMoveRow={ready ? handleMove : undefined}
    />
  );
}
