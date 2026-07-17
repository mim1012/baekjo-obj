'use client';

import { useEffect, useState } from 'react';
import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { getAdminConcernsConfig, saveConcernsConfig } from '@/lib/storage';
import { defaultConcernsConfig } from '@/lib/concerns/config';
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
  return asText(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function draftList(
  draft: Record<string, string | number>,
  key: string,
  previousValue: string[] | undefined,
): string[] {
  return hasDraftValue(draft, key) ? splitList(draft[key]) : previousValue ?? [];
}

/** faq textarea 형식: 한 줄에 "질문|답변" 하나. 구분자(|)가 없는 줄은 버린다. */
function parseFaqLines(value: unknown): FAQ[] {
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
    .filter((faq) => faq.question && faq.answer);
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
  // draft = 현재 편집 중인 고민 목록. 초기값은 기본 config, 마운트 후 관리자 콘센트로 실제 config 를
  // 불러온다. 관리자 getter(getAdminConcernsConfig)는 실패·깨진 응답에 throw 한다 — 공개 폴백 콘센트를
  // 쓰면 장애 시 default 콘텐츠가 뜬 채 저장돼 커스텀 콘텐츠를 덮어쓸 위험이 있다(insurance-content 미러).
  // loadError 면 저장을 막는다.
  const [items, setItems] = useState<Concern[]>(defaultConcernsConfig.items);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAdminConcernsConfig()
      .then((config) => {
        if (cancelled) return;
        setLoadError(false);
        setItems(config.items);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = (draft: Record<string, string | number>) => {
    setItems((prev) => [...prev, draftToConcern(draft, prev.map((concern) => concern.slug))]);
  };

  const handleUpdate = (id: string | number, draft: Record<string, string | number>) => {
    setItems((prev) =>
      prev.map((concern) =>
        concern.slug === id ? draftToConcern(draft, prev.map((item) => item.slug), concern) : concern,
      ),
    );
  };

  const handleDelete = (id: string | number) => {
    setItems((prev) => prev.filter((concern) => concern.slug !== id));
  };

  const handleSave = () => (loadError ? Promise.resolve({ ok: false }) : saveConcernsConfig({ items }));

  return (
    <AdminResourcePage
      title="고민 관리"
      description={loadError ? '고민 데이터를 불러오지 못했습니다. 저장을 막았습니다.' : '증상과 원인 정보, 추천 상품·브랜드, 보험 CTA와 FAQ를 연결합니다. 저장 버튼을 눌러야 공개 화면에 반영됩니다.'}
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
        { key: 'faq', label: 'FAQ(한 줄에 질문|답변)', type: 'textarea' },
      ]}
      onCreateRow={handleCreate}
      onUpdateRow={handleUpdate}
      onDeleteRow={handleDelete}
      onSave={handleSave}
    />
  );
}
