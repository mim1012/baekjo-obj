'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ExternalLink, FilePenLine, RefreshCw, Search, Settings2 } from 'lucide-react';
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from '@/components/admin/AdminUi';
import {
  PUBLIC_PAGE_GROUPS,
  PUBLIC_PAGE_REGISTRY,
  type PublicPageAdminAction,
} from '@/lib/admin/publicPageRegistry';

interface CmsPageState {
  key: string;
  draftRevision: number | null;
  publishedRevision: number | null;
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
  available: boolean;
}

interface PublicFeatureFlags {
  experts: boolean;
}

async function requestCmsPageStates(): Promise<CmsPageState[]> {
  const response = await fetch('/api/admin/settings/pages', { cache: 'no-store' });
  if (!response.ok) throw new Error('페이지 게시 상태를 불러오지 못했습니다.');
  const data = await response.json() as { pages: CmsPageState[] };
  return data.pages;
}

async function requestPublicFeatureFlags(): Promise<PublicFeatureFlags> {
  const response = await fetch('/api/content/site-shell', { cache: 'no-store' });
  if (!response.ok) return { experts: false };
  const data = await response.json() as { content?: { features?: Partial<PublicFeatureFlags> } };
  return { experts: data.content?.features?.experts === true };
}

function ActionStatus({ action, state }: { action: PublicPageAdminAction; state?: CmsPageState }) {
  if (!action.cmsPageKey) {
    return <AdminStatusBadge tone={action.saveMode === '고객 행동으로 생성' ? 'neutral' : 'success'}>{action.saveMode}</AdminStatusBadge>;
  }
  if (!state?.available) return <AdminStatusBadge tone="danger">DB 적용 필요</AdminStatusBadge>;
  if (state.hasUnpublishedChanges) return <AdminStatusBadge tone="warning">게시 대기</AdminStatusBadge>;
  return <AdminStatusBadge tone="success">게시 완료</AdminStatusBadge>;
}

export default function AdminPagesPage() {
  const [states, setStates] = useState<CmsPageState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featureFlags, setFeatureFlags] = useState<PublicFeatureFlags>({ experts: false });
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('전체');

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.allSettled([requestCmsPageStates(), requestPublicFeatureFlags()])
      .then(([statesResult, featuresResult]) => {
        if (statesResult.status === 'fulfilled') setStates(statesResult.value);
        else setError(statesResult.reason instanceof Error ? statesResult.reason.message : '페이지 게시 상태를 불러오지 못했습니다.');
        if (featuresResult.status === 'fulfilled') setFeatureFlags(featuresResult.value);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([requestCmsPageStates(), requestPublicFeatureFlags()])
      .then(([statesResult, featuresResult]) => {
        if (cancelled) return;
        if (statesResult.status === 'fulfilled') setStates(statesResult.value);
        else setError(statesResult.reason instanceof Error ? statesResult.reason.message : '페이지 게시 상태를 불러오지 못했습니다.');
        if (featuresResult.status === 'fulfilled') setFeatureFlags(featuresResult.value);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const stateByKey = useMemo(() => new Map(states.map((state) => [state.key, state])), [states]);
  const visibleRegistry = useMemo(
    () => PUBLIC_PAGE_REGISTRY.filter((page) => !page.featureFlag || featureFlags[page.featureFlag]),
    [featureFlags],
  );
  const hiddenFeaturePages = useMemo(
    () => PUBLIC_PAGE_REGISTRY.filter((page) => page.featureFlag && !featureFlags[page.featureFlag]),
    [featureFlags],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase('ko');
  const filteredPages = useMemo(() => visibleRegistry.filter((page) => {
    if (activeGroup !== '전체' && page.group !== activeGroup) return false;
    if (!normalizedQuery) return true;
    return [
      page.title,
      page.publicRoute,
      page.description,
      ...page.editableAreas,
      ...page.actions.flatMap((action) => [action.label, action.description]),
    ].some((value) => value.toLocaleLowerCase('ko').includes(normalizedQuery));
  }), [activeGroup, normalizedQuery, visibleRegistry]);

  const cmsActions = visibleRegistry.flatMap((page) => page.actions).filter((action) => action.cmsPageKey);
  const pendingCount = cmsActions.filter((action) => stateByKey.get(action.cmsPageKey!)?.hasUnpublishedChanges).length;
  const missingCount = cmsActions.filter((action) => !stateByKey.get(action.cmsPageKey!)?.available).length;
  const actualScreenCount = visibleRegistry.filter((page) => page.routePattern !== '/_site-shell').length + 1;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="PUBLIC WEBSITE CONTROL"
        title="전체 화면 관리"
        description="현재 고객 홈페이지에서 실제로 열리는 화면만 모았습니다. 화면 이름을 검색한 뒤 ‘고객 화면 보기’로 위치를 확인하고, 바로 아래 관리 버튼으로 들어가면 됩니다. 보험 화면은 이번 목록에서 제외했습니다."
        actions={
          <button type="button" onClick={load} className="btn-secondary min-h-11 gap-2 px-4">
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /> 연결 상태 새로고침
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border border-[#E7E0D5] bg-white p-5">
          <p className="text-xs font-semibold text-[#6F766F]">실제 고객 화면</p>
          <p className="mt-3 text-3xl font-semibold text-[#17211D]">{actualScreenCount}</p>
          <p className="mt-2 text-xs leading-5 text-[#8A918B]">보험·화면 없는 로그인 콜백 제외</p>
        </div>
        <div className="border border-[#E7E0D5] bg-white p-5">
          <p className="text-xs font-semibold text-[#6F766F]">관리 연결</p>
          <p className="mt-3 text-3xl font-semibold text-[#17211D]">{visibleRegistry.reduce((sum, page) => sum + page.actions.length, 0)}</p>
          <p className="mt-2 text-xs leading-5 text-[#8A918B]">각 화면에서 바로 가는 실제 관리 작업</p>
        </div>
        <div className="border border-[#E7E0D5] bg-white p-5">
          <p className="text-xs font-semibold text-[#6F766F]">게시 대기</p>
          <p className="mt-3 text-3xl font-semibold text-[#A8742E]">{pendingCount}</p>
          <p className="mt-2 text-xs leading-5 text-[#8A918B]">임시저장 후 아직 고객에게 공개하지 않은 화면</p>
        </div>
        <div className="border border-[#E7E0D5] bg-white p-5">
          <p className="text-xs font-semibold text-[#6F766F]">연결 점검 필요</p>
          <p className={`mt-3 text-3xl font-semibold ${missingCount > 0 ? 'text-[#9E3939]' : 'text-[#2F7A4F]'}`}>{missingCount}</p>
          <p className="mt-2 text-xs leading-5 text-[#8A918B]">최신 데이터베이스 기능이 없으면 숫자로 표시</p>
        </div>
      </div>

      {hiddenFeaturePages.length > 0 && (
        <div className="border border-[#D8C4A3] bg-[#FFF8E8] px-5 py-4 text-sm leading-6 text-[#5E4A28]">
          <strong className="text-[#17211D]">현재 고객에게 숨긴 화면:</strong> {hiddenFeaturePages.map((page) => page.title).join(' · ')}
          <span className="ml-2">‘전체 화면 공통 영역 → 서비스 노출’에서 켜고 게시하면 이 목록과 고객 메뉴에 함께 나타납니다.</span>
        </div>
      )}

      <AdminPanel title="처음 온 직원은 이 순서만 따르면 됩니다" description="관리 메뉴 이름을 추측할 필요 없이 고객 화면에서 시작합니다.">
        <div className="grid gap-px bg-[#E7E0D5] sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['1', '화면 검색', '바꾸려는 고객 화면 이름이나 주소, 예: 상품·배변·후기를 검색합니다.'],
            ['2', '위치 확인', '고객 화면 보기를 눌러 실제로 어느 곳인지 먼저 확인합니다.'],
            ['3', '관리 버튼 선택', '카드에 적힌 바꿀 내용을 보고 해당 관리 버튼을 누릅니다.'],
            ['4', '저장 후 확인', '즉시 반영은 저장 후, 게시형은 게시 후 고객 화면에서 확인합니다.'],
          ].map(([number, title, description]) => (
            <div key={number} className="bg-white p-5">
              <span className="font-editorial text-lg text-[#A8742E]">0{number}</span>
              <h2 className="mt-3 font-semibold text-[#17211D]">{title}</h2>
              <p className="mt-2 break-keep text-sm leading-6 text-[#6F766F]">{description}</p>
            </div>
          ))}
        </div>
      </AdminPanel>

      {error && (
        <div role="alert" className="border border-[#DFC8C4] bg-[#F7ECEA] px-5 py-4 text-sm font-medium leading-6 text-[#8B3E38]">
          {error} 화면 목록은 계속 사용할 수 있습니다. CMS 전용 표가 없는 환경도 기존 사이트 설정 저장소로 자동 연결되므로, 로그인과 네트워크 상태를 확인한 뒤 새로고침해 주세요.
        </div>
      )}

      <AdminPanel title="고객 화면 찾기" description={`${filteredPages.length}개 화면이 검색되었습니다.`}>
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#8A918B]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="화면 이름·주소·바꿀 내용 검색 (예: 상품, 배변, 후기, 배송비)"
              aria-label="고객 화면 검색"
              className="min-h-12 w-full border border-[#D8D6CE] bg-white pl-12 pr-4 text-sm text-[#17211D] outline-none transition focus:border-[#A8742E]"
            />
          </div>
          <div className="flex flex-wrap gap-2" aria-label="화면 분류">
            {['전체', ...PUBLIC_PAGE_GROUPS].map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setActiveGroup(group)}
                aria-pressed={activeGroup === group}
                className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition ${activeGroup === group ? 'border-[#17211D] bg-[#17211D] text-white' : 'border-[#D8D6CE] bg-white text-[#59615B] hover:border-[#A8742E]'}`}
              >
                {group}
              </button>
            ))}
          </div>
        </div>
      </AdminPanel>

      {filteredPages.length === 0 ? (
        <div className="border border-dashed border-[#D8D6CE] bg-white px-6 py-16 text-center">
          <p className="font-semibold text-[#17211D]">해당하는 고객 화면이 없습니다.</p>
          <p className="mt-2 text-sm text-[#6F766F]">검색어를 지우거나 다른 화면 분류를 선택해 주세요.</p>
        </div>
      ) : (
        PUBLIC_PAGE_GROUPS.map((group) => {
          const groupPages = filteredPages.filter((page) => page.group === group);
          if (groupPages.length === 0) return null;
          return (
            <AdminPanel key={group} title={group} description={`${groupPages.length}개 고객 화면`}>
              <div className="grid gap-4 xl:grid-cols-2">
                {groupPages.map((page) => (
                  <article key={page.key} className="flex flex-col border border-[#E7E0D5] bg-white p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-[#17211D]">{page.title}</h2>
                          <AdminStatusBadge tone={page.screenType === '기능 화면' ? 'neutral' : 'success'}>{page.screenType}</AdminStatusBadge>
                        </div>
                        <p className="mt-1 font-mono text-xs text-[#8A918B]">{page.publicRoute}</p>
                      </div>
                      <Link href={page.previewRoute} target="_blank" className="btn-secondary min-h-10 gap-2 px-3 text-xs">
                        <ExternalLink className="size-4" /> 고객 화면 보기
                      </Link>
                    </div>

                    <p className="mt-4 break-keep text-sm leading-6 text-[#59615B]">{page.description}</p>

                    <div className="mt-5 rounded-lg bg-[#F7F4ED] p-4">
                      <p className="text-xs font-bold text-[#17211D]">직원이 바꿀 수 있는 내용</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {page.editableAreas.map((area) => (
                          <span key={area} className="rounded-full border border-[#D8C4A3] bg-white px-2.5 py-1 text-xs font-medium text-[#59615B]">{area}</span>
                        ))}
                      </div>
                      {page.systemAreas && page.systemAreas.length > 0 && (
                        <p className="mt-3 border-t border-[#E7E0D5] pt-3 text-xs leading-5 text-[#6F766F]">
                          자동으로 동작하는 기능: {page.systemAreas.join(' · ')}
                        </p>
                      )}
                    </div>

                    <details className="group mt-5" open={page.actions.length === 1}>
                      <summary className="flex cursor-pointer list-none items-center justify-between border-y border-[#E7E0D5] py-3 text-sm font-bold text-[#17211D]">
                        <span>이 화면의 관리 버튼 {page.actions.length}개</span>
                        <ChevronDown className="size-4 transition group-open:rotate-180" />
                      </summary>
                      <div className="divide-y divide-[#E7E0D5]">
                        {page.actions.map((action) => {
                          const state = action.cmsPageKey ? stateByKey.get(action.cmsPageKey) : undefined;
                          return (
                            <div key={`${page.key}-${action.adminRoute}-${action.label}`} className="py-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-sm font-bold text-[#17211D]">{action.label}</h3>
                                    <ActionStatus action={action} state={state} />
                                  </div>
                                  <p className="mt-2 break-keep text-xs leading-5 text-[#6F766F]">{action.description}</p>
                                  <p className="mt-2 text-xs font-semibold text-[#A8742E]">가능: {action.capabilities.join(' · ')}</p>
                                </div>
                                <Link
                                  href={action.adminRoute}
                                  className="btn-primary min-h-10 shrink-0 gap-2 px-3 text-xs"
                                >
                                  {action.saveMode === '고객 행동으로 생성' ? <Settings2 className="size-4" /> : <FilePenLine className="size-4" />}
                                  관리하기
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  </article>
                ))}
              </div>
            </AdminPanel>
          );
        })
      )}
    </div>
  );
}
