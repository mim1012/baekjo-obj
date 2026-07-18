'use client';

import { useEffect, useRef, useState } from 'react';
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

/**
 * 법정 동의 문서 id — 관리자 PUT 라우트(src/app/api/admin/insurance-content/route.ts)의
 * REQUIRED_LEGAL_CONSENT_IDS 를 그대로 미러링한다. 삭제 시 이 id 를 서버 왕복 없이 클라이언트에서
 * 먼저 막아, 400 이 "네트워크 오류"처럼 보이는 오해를 방지한다(opus 리뷰 LOW-2).
 */
const REQUIRED_LEGAL_CONSENT_IDS = ['privacy', 'analysis'] as const;

export default function AdminInsuranceContentPage() {
  // draft = 현재 편집 중인 동의 문서·FAQ 목록. 초기값은 기본 config, 마운트 후 관리자 콘센트로 실제 config 를
  // 불러온다. 관리자 getter(getAdminInsuranceContentConfig)는 실패·깨진 응답에 throw 한다 — 공개 폴백 콘센트를
  // 쓰면 장애 시 default 콘텐츠가 뜬 채 저장돼 커스텀 콘텐츠를 덮어쓸 위험이 있다(codex 리뷰 F5). loadError 면
  // 저장을 막는다(partners 패턴 미러링). 로드 완료 전(loaded=false)에도 저장·편집을 막는다 —
  // 로드 완료 전 저장이 default 로 DB 를 덮어쓰는 레이스 방지(codex 리뷰 F-HIGH, concerns 미러).
  const [consents, setConsents] = useState<ConsentDoc[]>(defaultInsuranceContentConfig.consents);
  const [faqs, setFaqs] = useState<InsuranceFaq[]>(defaultInsuranceContentConfig.faqs);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // persisted = 마지막으로 DB 와 일치한 동의 문서·FAQ. 두 섹션이 하나의 싱글턴 config 를 공유하므로
  // ref 도 { consents, faqs } 를 함께 들고, 성공한 저장(배치 저장 포함)마다 두 필드를 함께 갱신한다.
  // 삭제는 이 기준으로 저장해 미저장 등록·수정 드래프트가 삭제에 딸려 커밋되지 않게 한다(opus 리뷰 MEDIUM-1).
  const persistedRef = useRef<{ consents: ConsentDoc[]; faqs: InsuranceFaq[] }>({
    consents: defaultInsuranceContentConfig.consents,
    faqs: defaultInsuranceContentConfig.faqs,
  });
  // 저장·삭제 공용 상호배제 — 동시 PUT 이 서로를 덮어쓰는 레이스 방지(codex 2차 리뷰 HIGH). 두 섹션의
  // 삭제 핸들러와 배치 저장이 같은 싱글턴 config 를 쓰므로 하나의 ref 로 셋을 함께 배타한다.
  const busyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getAdminInsuranceContentConfig()
      .then((config) => {
        if (cancelled) return;
        setLoadError(false);
        setConsents(config.consents);
        setFaqs(config.faqs);
        persistedRef.current = { consents: config.consents, faqs: config.faqs };
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
  // 눌러도 새로고침하면 사라지는 2단계 저장 함정 제거(2026-07-18 저장 유실 리포트). 두 섹션이 하나의
  // 싱글턴 config 를 공유하므로 각 핸들러는 persisted 기준에서 자기 섹션만 바꾸고 다른 섹션은 그대로
  // 전달한다 — 상대 섹션의 미저장 드래프트를 절대 함께 커밋하지 않는다.
  const handleCreateConsent = async (draft: Record<string, string | number>) => {
    if (!loaded || loadError) return;
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const nextConsents = [...persistedRef.current.consents, draftToConsent(draft)];
      const { ok } = await saveInsuranceContentConfig({ consents: nextConsents, faqs: persistedRef.current.faqs });
      if (ok) {
        persistedRef.current = { consents: nextConsents, faqs: persistedRef.current.faqs };
        setConsents(nextConsents);
      } else {
        window.alert('등록 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      busyRef.current = false;
    }
  };

  const handleUpdateConsent = async (id: string | number, draft: Record<string, string | number>) => {
    if (!loaded || loadError) return;
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const nextConsents = persistedRef.current.consents.map((consent) =>
        consent.id === id ? draftToConsent(draft, consent) : consent,
      );
      const { ok } = await saveInsuranceContentConfig({ consents: nextConsents, faqs: persistedRef.current.faqs });
      if (ok) {
        persistedRef.current = { consents: nextConsents, faqs: persistedRef.current.faqs };
        setConsents(nextConsents);
      } else {
        window.alert('수정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      busyRef.current = false;
    }
  };

  const handleCreateFaq = async (draft: Record<string, string | number>) => {
    if (!loaded || loadError) return;
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const nextFaqs = [...persistedRef.current.faqs, draftToFaq(draft)];
      const { ok } = await saveInsuranceContentConfig({ consents: persistedRef.current.consents, faqs: nextFaqs });
      if (ok) {
        persistedRef.current = { consents: persistedRef.current.consents, faqs: nextFaqs };
        setFaqs(nextFaqs);
      } else {
        window.alert('등록 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      busyRef.current = false;
    }
  };

  const handleUpdateFaq = async (id: string | number, draft: Record<string, string | number>) => {
    if (!loaded || loadError) return;
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const nextFaqs = persistedRef.current.faqs.map((faq) => (faq.id === id ? draftToFaq(draft, faq) : faq));
      const { ok } = await saveInsuranceContentConfig({ consents: persistedRef.current.consents, faqs: nextFaqs });
      if (ok) {
        persistedRef.current = { consents: persistedRef.current.consents, faqs: nextFaqs };
        setFaqs(nextFaqs);
      } else {
        window.alert('수정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      busyRef.current = false;
    }
  };

  // 관리자 PUT 라우트가 consents.length < 1 을 거부하므로 마지막 항목도 막는다. 법정 동의 문서
  // ('privacy'/'analysis') 삭제는 서버 왕복 없이 클라이언트에서 먼저 막아 정직한 메시지를 보여준다
  // (opus 리뷰 LOW-2).
  const handleDeleteConsent = async (id: string | number) => {
    if (!loaded || loadError) return;
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      if ((REQUIRED_LEGAL_CONSENT_IDS as readonly (string | number)[]).includes(id)) {
        window.alert('필수(법정) 동의 문서는 삭제할 수 없습니다.');
        return;
      }
      const nextConsents = persistedRef.current.consents.filter((consent) => consent.id !== id);
      if (nextConsents.length === 0) {
        window.alert('동의 문서는 최소 1건 남아 있어야 합니다. 마지막 항목은 삭제할 수 없습니다.');
        return;
      }
      const { ok } = await saveInsuranceContentConfig({ consents: nextConsents, faqs: persistedRef.current.faqs });
      if (ok) {
        persistedRef.current = { consents: nextConsents, faqs: persistedRef.current.faqs };
        setConsents((prev) => prev.filter((consent) => consent.id !== id));
      } else {
        window.alert('삭제 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      busyRef.current = false;
    }
  };

  // faqs 는 관리자 PUT 라우트가 빈 배열을 허용하므로 마지막 항목 차단은 없다.
  const handleDeleteFaq = async (id: string | number) => {
    if (!loaded || loadError) return;
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const nextFaqs = persistedRef.current.faqs.filter((faq) => faq.id !== id);
      const { ok } = await saveInsuranceContentConfig({ consents: persistedRef.current.consents, faqs: nextFaqs });
      if (ok) {
        persistedRef.current = { consents: persistedRef.current.consents, faqs: nextFaqs };
        setFaqs((prev) => prev.filter((faq) => faq.id !== id));
      } else {
        window.alert('삭제 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      busyRef.current = false;
    }
  };

  return (
    <div className="space-y-10">
      <AdminResourcePage
        title="보험 동의 문서"
        description={loadError ? '콘텐츠를 불러오지 못했습니다. 저장을 막았습니다.' : !loaded ? '콘텐츠 로딩 중…' : '공개 보험 신청 폼(/insurance)의 동의 체크박스와 전문 모달을 관리합니다. 등록·수정·삭제가 모두 즉시 반영됩니다(동의 문서·FAQ 는 같은 콘텐츠를 공유합니다).'}
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
        onCreateRow={handleCreateConsent}
        onUpdateRow={handleUpdateConsent}
        onDeleteRow={handleDeleteConsent}
      />

      <AdminResourcePage
        title="보험 자주 묻는 질문"
        description={loadError ? '콘텐츠를 불러오지 못했습니다. 저장을 막았습니다.' : !loaded ? '콘텐츠 로딩 중…' : '공개 보험 페이지(/insurance) 하단의 FAQ 아코디언을 관리합니다. 등록·수정·삭제가 모두 즉시 반영됩니다(동의 문서·FAQ 는 같은 콘텐츠를 공유합니다).'}
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
        onCreateRow={handleCreateFaq}
        onUpdateRow={handleUpdateFaq}
        onDeleteRow={handleDeleteFaq}
      />
    </div>
  );
}
