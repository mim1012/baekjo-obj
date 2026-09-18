'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FilePenLine, RefreshCw, Search } from 'lucide-react';
import EmptyState from '@/components/admin-new/common/EmptyState';
import ErrorState from '@/components/admin-new/common/ErrorState';
import LoadingState from '@/components/admin-new/common/LoadingState';
import PageHeader from '@/components/admin-new/common/PageHeader';
import SummaryStrip from '@/components/admin-new/common/SummaryStrip';
import { fetchCmsPageStates } from './cmsPageClient';
import PageStatusBadge from './PageStatusBadge';
import type { CmsPageDefinition, CmsPageState } from './types';

const PAGE_GROUPS: readonly CmsPageDefinition['group'][] = ['공통 영역', '소개·콘텐츠', '서비스', '정책'];

function publicRouteFor(route: string): string {
  return route === '/_site-shell' ? '/' : route;
}

export default function PageListPage() {
  const [pages, setPages] = useState<readonly CmsPageState[]>([]);
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<CmsPageDefinition['group'] | '전체'>('전체');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);

    fetchCmsPageStates()
      .then(setPages)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : '페이지 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    let cancelled = false;
    fetchCmsPageStates()
      .then((result) => {
        if (!cancelled) setPages(result);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '페이지 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedQuery = query.trim().toLocaleLowerCase('ko');
  const filteredPages = useMemo(() => pages.filter((page) => {
    if (activeGroup !== '전체' && page.group !== activeGroup) return false;
    if (!normalizedQuery) return true;
    return `${page.title} ${page.route} ${page.description} ${page.group}`.toLocaleLowerCase('ko').includes(normalizedQuery);
  }), [activeGroup, normalizedQuery, pages]);

  const pendingCount = pages.filter((page) => page.hasUnpublishedChanges).length;
  const missingCount = pages.filter((page) => !page.available).length;
  const activationNeededCount = pages.filter((page) => page.available && !page.managed).length;
  const publishedCount = pages.filter((page) => page.publishedRevision !== null && !page.hasUnpublishedChanges).length;

  if (loading) return <LoadingState message="CMS 페이지 목록을 불러오는 중입니다..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="공개 화면 CMS"
        description="고객 화면의 구조화 콘텐츠를 임시저장하고, 게시 이력을 기준으로 공개 반영을 준비합니다."
      >
        <button
          type="button"
          onClick={() => load('refresh')}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
          disabled={refreshing}
        >
          <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          상태 새로고침
        </button>
      </PageHeader>

      <SummaryStrip
        items={[
          { label: '관리 화면', value: pages.length },
          { label: '게시 완료', value: publishedCount },
          { label: '게시 대기', value: pendingCount, highlight: pendingCount > 0 },
          { label: '활성화 필요', value: activationNeededCount, highlight: activationNeededCount > 0 },
          { label: 'DB 준비 필요', value: missingCount, highlight: missingCount > 0 },
        ]}
      />

      {error && <ErrorState title="CMS 상태를 확인하지 못했습니다" message={error} onRetry={() => load('refresh')} />}

      <section className="rounded-md border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <label className="relative block">
            <span className="sr-only">페이지 검색</span>
            <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="화면 이름, 주소, 설명 검색"
              className="min-h-11 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-[14px] outline-none transition focus:border-[#17201B]"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="페이지 그룹">
            {(['전체', ...PAGE_GROUPS] as const).map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setActiveGroup(group)}
                aria-pressed={activeGroup === group}
                className={`min-h-9 rounded-full border px-3 text-[13px] font-medium transition-colors ${
                  activeGroup === group
                    ? 'border-[#17201B] bg-[#17201B] text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-[#68776C]'
                }`}
              >
                {group}
              </button>
            ))}
          </div>
        </div>

        {filteredPages.length === 0 ? (
          <EmptyState title="검색된 화면이 없습니다" description="검색어를 지우거나 다른 그룹을 선택해 주세요." />
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPages.map((page) => (
              <article key={page.key} className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[16px] font-semibold text-[#17201B]">{page.title}</h2>
                    <PageStatusBadge state={page} />
                  </div>
                  <p className="mt-1 font-mono text-[12px] text-gray-500">{publicRouteFor(page.route)}</p>
                  <p className="mt-2 break-keep text-[14px] leading-6 text-gray-600">{page.description}</p>
                  <p className="mt-2 text-[12px] text-gray-500">
                    편집본 v{page.draftRevision ?? '없음'} · 게시본 v{page.publishedRevision ?? '없음'}
                    {page.publishedAt ? ` · 최근 게시 ${new Date(page.publishedAt).toLocaleDateString('ko-KR')}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={publicRouteFor(page.route)}
                    target="_blank"
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-gray-300 px-3 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <ExternalLink className="size-4" />
                    고객 화면
                  </Link>
                  <Link
                    href={`/admin/pages/${encodeURIComponent(page.key)}`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#2F3B34] px-3 text-[13px] font-medium text-white transition-colors hover:bg-[#1f2823]"
                  >
                    <FilePenLine className="size-4" />
                    편집하기
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
