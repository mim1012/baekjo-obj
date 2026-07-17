'use client';

import { useEffect, useState } from 'react';
import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { getAdminInsuranceContentConfig, saveInsuranceContentConfig } from '@/lib/storage';
import { defaultInsuranceContentConfig, type ConsentDoc, type InsuranceFaq } from '@/lib/insuranceContent/config';

const booleanOptions = [
  { value: 'true', label: '예' },
  { value: 'false', label: '아니오' },
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

/** id 는 공개 폼 체크 상태 매핑 키라 편집 불가 — 생성 시 한 번 고정한다(시각 기반 발급 금지). */
function createContentId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function draftToConsent(draft: Record<string, string | number>, previous?: ConsentDoc): ConsentDoc {
  return {
    // id 는 공개 폼 체크 상태 매핑 키라 편집 불가(폼에 노출하지 않음) — 생성 시 고정.
    id: previous?.id ?? createContentId('consent'),
    title: draftText(draft, 'title', previous?.title, '새 동의 문서'),
    required: hasDraftValue(draft, 'required') ? draft.required === 'true' : previous?.required ?? true,
    body: draftText(draft, 'body', previous?.body, '내용을 입력해 주세요.'),
  };
}

function draftToFaq(draft: Record<string, string | number>, previous?: InsuranceFaq): InsuranceFaq {
  return {
    id: previous?.id ?? createContentId('faq'),
    q: draftText(draft, 'q', previous?.q, '새 질문'),
    a: draftText(draft, 'a', previous?.a, '답변을 입력해 주세요.'),
  };
}

function summarize(text: string, max = 60): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export default function AdminInsuranceContentPage() {
  // draft = 현재 편집 중인 동의 문서·FAQ 목록. 초기값은 기본 config, 마운트 후 관리자 콘센트로 실제 config 를
  // 불러온다. 관리자 getter(getAdminInsuranceContentConfig)는 실패·깨진 응답에 throw 한다 — 공개 폴백 콘센트를
  // 쓰면 장애 시 default 콘텐츠가 뜬 채 저장돼 커스텀 콘텐츠를 덮어쓸 위험이 있다(codex 리뷰 F5). loadError 면
  // 저장을 막는다(partners 패턴 미러링).
  const [consents, setConsents] = useState<ConsentDoc[]>(defaultInsuranceContentConfig.consents);
  const [faqs, setFaqs] = useState<InsuranceFaq[]>(defaultInsuranceContentConfig.faqs);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAdminInsuranceContentConfig()
      .then((config) => {
        if (cancelled) return;
        setLoadError(false);
        setConsents(config.consents);
        setFaqs(config.faqs);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 한쪽 섹션의 저장 버튼이 동의 문서·FAQ 전체를 함께 저장한다(싱글턴 config 통째 저장).
  const handleSave = () => (loadError ? Promise.resolve({ ok: false }) : saveInsuranceContentConfig({ consents, faqs }));

  return (
    <div className="space-y-10">
      <AdminResourcePage
        title="보험 동의 문서"
        description={loadError ? '콘텐츠를 불러오지 못했습니다. 저장을 막았습니다.' : '공개 보험 신청 폼(/insurance)의 동의 체크박스와 전문 모달을 관리합니다. 저장 버튼은 동의 문서·FAQ 전체를 함께 저장합니다.'}
        actionLabel="동의 문서 등록"
        searchPlaceholder="동의 문서 제목 검색"
        columns={[
          { key: 'title', label: '제목' },
          { key: 'requiredLabel', label: '필수 여부' },
          { key: 'bodySummary', label: '전문 요약' },
        ]}
        rows={consents.map((consent) => ({
          id: consent.id,
          title: consent.title,
          required: String(consent.required),
          requiredLabel: consent.required ? '필수' : '선택',
          body: consent.body,
          bodySummary: summarize(consent.body),
        }))}
        formFields={[
          { key: 'title', label: '제목' },
          { key: 'required', label: '필수 여부', type: 'select', options: booleanOptions },
          { key: 'body', label: '전문(줄바꿈 유지)', type: 'textarea' },
        ]}
        onCreateRow={(draft) => setConsents((prev) => [...prev, draftToConsent(draft)])}
        onUpdateRow={(id, draft) => setConsents((prev) => prev.map((consent) => (consent.id === id ? draftToConsent(draft, consent) : consent)))}
        onDeleteRow={(id) => setConsents((prev) => prev.filter((consent) => consent.id !== id))}
        onSave={handleSave}
      />

      <AdminResourcePage
        title="보험 자주 묻는 질문"
        description={loadError ? '콘텐츠를 불러오지 못했습니다. 저장을 막았습니다.' : '공개 보험 페이지(/insurance) 하단의 FAQ 아코디언을 관리합니다. 저장 버튼은 동의 문서·FAQ 전체를 함께 저장합니다.'}
        actionLabel="FAQ 등록"
        searchPlaceholder="질문 검색"
        columns={[
          { key: 'q', label: '질문' },
          { key: 'aSummary', label: '답변 요약' },
        ]}
        rows={faqs.map((faq) => ({
          id: faq.id,
          q: faq.q,
          a: faq.a,
          aSummary: summarize(faq.a),
        }))}
        formFields={[
          { key: 'q', label: '질문' },
          { key: 'a', label: '답변', type: 'textarea' },
        ]}
        onCreateRow={(draft) => setFaqs((prev) => [...prev, draftToFaq(draft)])}
        onUpdateRow={(id, draft) => setFaqs((prev) => prev.map((faq) => (faq.id === id ? draftToFaq(draft, faq) : faq)))}
        onDeleteRow={(id) => setFaqs((prev) => prev.filter((faq) => faq.id !== id))}
        onSave={handleSave}
      />
    </div>
  );
}
