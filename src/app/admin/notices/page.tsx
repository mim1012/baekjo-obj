'use client';

import { useEffect, useState } from 'react';
import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { getAdminNoticesConfig, saveNoticesConfig } from '@/lib/storage';
import { defaultNoticesConfig } from '@/lib/notices/config';
import { formatDate } from '@/lib/format';
import type { Notice } from '@/types';

const CATEGORY_VALUES = ['notice', 'event', 'brand'] as const;

const CATEGORY_LABELS: Record<(typeof CATEGORY_VALUES)[number], string> = {
  notice: '공지',
  event: '이벤트',
  brand: '브랜드 소식',
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

function draftCategory(
  draft: Record<string, string | number>,
  previousValue: Notice['category'],
): Notice['category'] {
  const raw = hasDraftValue(draft, 'category') ? asText(draft['category']) : previousValue;
  return CATEGORY_VALUES.includes(raw as (typeof CATEGORY_VALUES)[number])
    ? (raw as Notice['category'])
    : 'notice';
}

/** id 는 상세 라우트(/notices/[id]) 링크 키 — 생성 시 한 번 발급하고 이후 편집하지 않는다(폼 미노출). */
function createNoticeId(): string {
  return `notice-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

/** 오늘 날짜를 기존 데이터와 같은 YYYY-MM-DD 문자열로 만든다(신규 공지의 date 기본값). */
function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function draftToNotice(draft: Record<string, string | number>, previous?: Notice): Notice {
  return {
    // id 는 상세 라우트 링크 키라 편집 불가 — 생성 시 notice-<uuid> 로 한 번 발급한다.
    id: previous?.id ?? createNoticeId(),
    title: draftText(draft, 'title', previous?.title, '새 공지'),
    writer: draftText(draft, 'writer', previous?.writer, '관리자'),
    date: draftText(draft, 'date', previous?.date, todayString()),
    // views/likes 는 폼에 노출하지 않는다 — 신규는 0, 기존값은 그대로 보존한다.
    views: previous?.views ?? 0,
    likes: previous?.likes ?? 0,
    category: draftCategory(draft, previous?.category),
    content: draftText(draft, 'content', previous?.content, '내용을 입력해 주세요.'),
  };
}

export default function AdminNoticesPage() {
  // draft = 현재 편집 중인 공지 목록. 초기값은 기본 config, 마운트 후 관리자 콘센트로 실제 config 를
  // 불러온다. 관리자 getter(getAdminNoticesConfig)는 실패·깨진 응답에 throw 한다 — 공개 폴백 콘센트를
  // 쓰면 장애 시 default 콘텐츠가 뜬 채 저장돼 커스텀 콘텐츠를 덮어쓸 위험이 있다(concerns 미러).
  // 로드 완료 전(loaded=false)·loadError 면 저장을 막는다 — 로드 완료 전 저장이 default 로 DB 를
  // 덮어쓰는 레이스 방지(codex 리뷰 F-HIGH).
  const [items, setItems] = useState<Notice[]>(defaultNoticesConfig.items);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAdminNoticesConfig()
      .then((config) => {
        if (cancelled) return;
        setLoadError(false);
        setItems(config.items);
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

  const handleCreate = (draft: Record<string, string | number>) => {
    if (!loaded) return;
    setItems((prev) => [...prev, draftToNotice(draft)]);
  };

  const handleUpdate = (id: string | number, draft: Record<string, string | number>) => {
    if (!loaded) return;
    setItems((prev) => prev.map((notice) => (notice.id === id ? draftToNotice(draft, notice) : notice)));
  };

  const handleDelete = (id: string | number) => {
    if (!loaded) return;
    setItems((prev) => prev.filter((notice) => notice.id !== id));
  };

  const handleSave = () => (!loaded || loadError ? Promise.resolve({ ok: false }) : saveNoticesConfig({ items }));

  return (
    <AdminResourcePage
      title="공지사항 관리"
      description={loadError ? '공지 데이터를 불러오지 못했습니다. 저장을 막았습니다.' : !loaded ? '콘텐츠 로딩 중…' : '공지, 이벤트, 브랜드 소식을 등록하고 관리합니다. 저장 버튼을 눌러야 공개 화면에 반영됩니다.'}
      actionLabel="공지 등록"
      searchPlaceholder="제목, 본문, 작성자 검색"
      columns={[
        { key: 'typeLabel', label: '유형' },
        { key: 'title', label: '제목' },
        { key: 'writer', label: '작성자' },
        { key: 'views', label: '조회수' },
        { key: 'likes', label: '좋아요' },
        { key: 'dateLabel', label: '작성일' },
      ]}
      rows={items.map((notice) => ({
        id: notice.id,
        typeLabel: CATEGORY_LABELS[notice.category ?? 'notice'],
        title: notice.title,
        category: notice.category ?? 'notice',
        content: notice.content,
        writer: notice.writer,
        views: notice.views,
        likes: notice.likes,
        date: notice.date,
        dateLabel: formatDate(notice.date),
      }))}
      formFields={[
        { key: 'title', label: '제목' },
        {
          key: 'category',
          label: '유형',
          type: 'select',
          options: CATEGORY_VALUES.map((value) => ({ value, label: CATEGORY_LABELS[value] })),
        },
        { key: 'content', label: '본문', type: 'textarea' },
        { key: 'writer', label: '작성자' },
        { key: 'date', label: '작성일(YYYY-MM-DD 형식)' },
      ]}
      onCreateRow={ready ? handleCreate : undefined}
      onUpdateRow={ready ? handleUpdate : undefined}
      onDeleteRow={ready ? handleDelete : undefined}
      onSave={handleSave}
    />
  );
}
