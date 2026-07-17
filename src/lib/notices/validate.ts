// 공지(Notice) item 단위 형상 검증 — 순수 모듈('use client' 없음, Supabase/Node 의존 없음).
// repo(getNoticesConfig: DB에서 읽은 jsonb)와 관리자 API 라우트(PUT 본문)가 같은 규칙을 공유한다.
// jsonb 는 수동 조작·과거 버전 저장으로 기형 행이 존재할 수 있어, config 겉모양({ items: [...] })
// 검사만으로는 소비부(formatDate·CATEGORY_LABELS 인덱싱·상세 라우트)가 깨질 수 있다(codex 리뷰 F1).
import type { Notice } from '@/types';

export const NOTICE_CATEGORIES = ['notice', 'event', 'brand'] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** views/likes 는 표시 카운트 — 숫자가 아니거나 비유한·음수면 거부한다. */
export function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * category 는 undefined 또는 enum('notice'|'event'|'brand')만 허용한다.
 * null 도 통과시킨다 — optional 필드가 JSON 왕복(jsonb 저장)에서 null 로 저장될 수 있어
 * null 을 기형으로 취급하면 정상 데이터가 default 폴백으로 밀려난다. 대신 반환 전에
 * normalizeNotice 가 null → undefined 로 정규화하는 것이 전제다.
 */
function isNoticeCategory(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    NOTICE_CATEGORIES.includes(value as (typeof NOTICE_CATEGORIES)[number])
  );
}

/** item 이 소비부가 안전하게 렌더할 수 있는 Notice 형상인지 검사한다(category null 은 허용 — 위 주석). */
export function isNoticeShape(item: unknown): item is Notice {
  if (!item || typeof item !== 'object') return false;
  const notice = item as Partial<Record<keyof Notice, unknown>>;
  return (
    isNonEmptyString(notice.id) &&
    isNonEmptyString(notice.title) &&
    isNonEmptyString(notice.writer) &&
    isNonEmptyString(notice.date) &&
    isNonEmptyString(notice.content) &&
    isCount(notice.views) &&
    isCount(notice.likes) &&
    isNoticeCategory(notice.category)
  );
}

/** 형상 검증이 category null 을 허용하므로, 반환·저장 전 null → undefined 로 정규화한다. */
export function normalizeNotice(notice: Notice): Notice {
  return { ...notice, category: notice.category ?? undefined };
}
