'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, Plus, Save, Send, Trash2, X } from 'lucide-react';
import { defaultHomeSettings, type HomeSettings } from '@/data/homeContent';
import { getPublicProducts, getPublicBrands, getNoticesConfig, getShowcaseReviews } from '@/lib/storage';
import HomeClient from '@/components/home/HomeClient';
import type { Brand, Notice, Product, Review } from '@/types';
import { AdminPageHeader } from '@/components/admin/AdminUi';
import ImageUploader from '@/components/admin-new/common/ImageUploader';

// 탭은 실제 홈(HomeClient)의 섹션 순서와 1:1 이다. 문구·이미지·연결 주소·노출과 카드 순서를
// 모두 한곳에서 관리한다.
const TABS = [
  { id: 'hero', label: '메인 히어로' },
  { id: 'quickShop', label: '쇼핑 카테고리' },
  { id: 'bestProducts', label: '오늘의 추천' },
  { id: 'curation', label: '맞춤 큐레이션' },
  { id: 'audit', label: '백조오브제 Audit' },
  { id: 'solutions', label: '3가지 솔루션' },
  { id: 'insuranceBanner', label: '펫보험 배너' },
  { id: 'trustBoard', label: '후기/소식' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function SiteSettingsPage() {
  const [draft, setDraft] = useState<HomeSettings>(defaultHomeSettings);
  const [dirty, setDirty] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [draftRevision, setDraftRevision] = useState<number | null>(null);
  const [publishedRevision, setPublishedRevision] = useState<number | null>(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('hero');
  // 미리보기는 홈 화면(HomeClient)을 그대로 재사용한다 — repo(서버 전용)는 클라이언트
  // 컴포넌트에서 못 부르므로, 미리보기를 열 때 공개 API 로 상품·브랜드를 읽어 props 로 넘긴다.
  const [previewProducts, setPreviewProducts] = useState<Product[]>([]);
  const [previewBrands, setPreviewBrands] = useState<Brand[]>([]);
  const [previewNotices, setPreviewNotices] = useState<Notice[]>([]);
  const [previewReviews, setPreviewReviews] = useState<Review[]>([]);

  // 공개 GET이 아니라 관리자 CMS draft를 읽는다. 게시하지 않은 수정본이 있어도 이어서 편집해야 한다.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`load-failed:${response.status}`);
        return response.json() as Promise<{
          settings: HomeSettings;
          draftRevision: number;
          publishedRevision: number | null;
          hasUnpublishedChanges: boolean;
        }>;
      })
      .then((data) => {
        if (cancelled) return;
        setDraft(data.settings);
        setDraftRevision(data.draftRevision);
        setPublishedRevision(data.publishedRevision);
        setHasUnpublishedChanges(data.hasUnpublishedChanges);
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

  useEffect(() => {
    if (!isPreviewOpen) return;
    let cancelled = false;
    Promise.all([getPublicProducts(), getPublicBrands(), getNoticesConfig(), getShowcaseReviews()]).then(
      ([products, brands, noticesConfig, reviews]) => {
        if (cancelled) return;
        setPreviewProducts(products);
        setPreviewBrands(brands);
        setPreviewNotices(noticesConfig.items);
        // 실제 홈(page.tsx)과 동일하게 숨김 후기를 걸러 미리보기 충실도를 맞춘다(opus 리뷰 LOW-1).
        setPreviewReviews(reviews.filter((review) => review.isVisible !== false));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [isPreviewOpen]);

  // 미리보기 전체화면 모달은 ESC 로도 닫는다(X 버튼과 병행).
  useEffect(() => {
    if (!isPreviewOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPreviewOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewOpen]);

  // loaded 이전엔 저장을 막는다 — provider 의 GET 이 resolve 되기 전 저장은 draft 가 여전히
  // defaultHomeSettings 시드일 수 있어, 안 보인 섹션들이 default 값 그대로 실 DB 위에 PUT 된다
  // (전수조사 A-1, 2026-07-18).
  const saveDraft = async (): Promise<number | null> => {
    if (!loaded || draftRevision === null) return null;
    setIsSaving(true);
    setActionError(null);
    setSaveMessage(null);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: draft, expectedRevision: draftRevision }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        draftRevision?: number;
        message?: string;
      };
      if (!response.ok || typeof result.draftRevision !== 'number') {
        throw new Error(result.message || '임시저장에 실패했습니다.');
      }
      setDraftRevision(result.draftRevision);
      setDirty(false);
      setHasUnpublishedChanges(true);
      setSaveMessage(`편집본 v${result.draftRevision}으로 임시저장했습니다.`);
      return result.draftRevision;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '임시저장에 실패했습니다.');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    await saveDraft();
  };

  const handlePublish = async () => {
    if (!loaded || draftRevision === null) return;
    setIsPublishing(true);
    setActionError(null);
    setSaveMessage(null);
    try {
      const revisionToPublish = dirty ? await saveDraft() : draftRevision;
      if (revisionToPublish === null) return;
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedRevision: revisionToPublish }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        publishedRevision?: number;
        message?: string;
      };
      if (!response.ok || typeof result.publishedRevision !== 'number') {
        throw new Error(result.message || '게시하지 못했습니다.');
      }
      setPublishedRevision(result.publishedRevision);
      setHasUnpublishedChanges(false);
      setSaveMessage(`홈 편집본 v${result.publishedRevision}을 공개했습니다.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '게시하지 못했습니다.');
    } finally {
      setIsPublishing(false);
    }
  };

  // loaded 이전엔 편집(dirty=true)도 막는다 — dirty 락이 걸리면 그 뒤로 도착하는 실제 GET 값이
  // draft 에 절대 반영되지 못한다(아래 resync effect 의 `if (dirty) return;`). 그 상태로 저장하면
  // 화면에 보이지 않은 다른 섹션들이 default 값 그대로 커밋된다 — loaded 이전 편집을 원천 차단하는
  // 것이 dirty 락과 지연 도착 GET 이 충돌하지 않는 최소 변경이다(전수조사 A-1).
  const updateDraft = (section: keyof HomeSettings, field: string, value: unknown) => {
    if (!loaded) return;
    setDirty(true);
    setDraft((prev) => {
      const sectionData = prev[section] as unknown;
      if (typeof sectionData === 'object' && sectionData !== null) {
        return {
          ...prev,
          [section]: {
            ...(sectionData as Record<string, unknown>),
            [field]: value,
          },
        } as HomeSettings;
      }
      return {
        ...prev,
        [section]: value,
      } as HomeSettings;
    });
  };

  // ----------------------------------------------------
  // Array Handlers
  // ----------------------------------------------------
  const updateArrayField = (section: keyof HomeSettings, arrayField: string, index: number, itemField: string, value: unknown) => {
    if (!loaded) return;
    setDirty(true);
    setDraft((prev) => {
      const sectionData = prev[section] as Record<string, unknown>;
      const newArray = [...(sectionData[arrayField] as Array<Record<string, unknown>>)];
      newArray[index] = { ...newArray[index], [itemField]: value };
      return {
        ...prev,
        [section]: { ...sectionData, [arrayField]: newArray }
      } as HomeSettings;
    });
  };

  const replaceArray = (section: keyof HomeSettings, arrayField: string, next: Array<Record<string, unknown>>) => {
    if (!loaded) return;
    setDirty(true);
    setDraft((prev) => ({
      ...prev,
      [section]: { ...(prev[section] as unknown as Record<string, unknown>), [arrayField]: next },
    }) as HomeSettings);
  };

  const removeArrayItem = (section: keyof HomeSettings, arrayField: string, index: number) => {
    const items = ((draft[section] as unknown as Record<string, unknown>)[arrayField] as Array<Record<string, unknown>>);
    replaceArray(section, arrayField, items.filter((_, itemIndex) => itemIndex !== index));
  };

  const moveArrayItem = (section: keyof HomeSettings, arrayField: string, index: number, direction: -1 | 1) => {
    const items = [...((draft[section] as unknown as Record<string, unknown>)[arrayField] as Array<Record<string, unknown>>)] ;
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    replaceArray(section, arrayField, items);
  };

  const renderInput = (label: string, value: string, onChange: (v: string) => void, isTextarea = false) => (
    <div className="mb-4">
      <label className="block text-xs font-medium text-[#59615B] mb-1.5">{label}</label>
      {isTextarea ? (
        <textarea
          className="w-full border border-[#D1D0C8] rounded-sm px-3 py-2 text-sm bg-white focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34] outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <input
          type="text"
          className="w-full border border-[#D1D0C8] rounded-sm px-3 py-2 text-sm bg-white focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34] outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );

  const renderToggle = (label: string, value: boolean, onChange: (value: boolean) => void) => (
    <label className="flex items-center justify-between border border-[#E7E0D5] bg-[#FAF8F3] p-4">
      <span className="text-sm font-semibold text-[#17211D]">{label}</span>
      <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} className="size-5 accent-[#17211D]" />
    </label>
  );

  // 줄바꿈은 마크업(<br/>)이 아니라 구조(string[])로 다룬다 — 한 줄에 한 문장씩, 개행으로 구분한다.
  // 빈 줄은 저장 시 제거해 정본이 깨지지 않도록 한다(normalize 가 최종 방어).
  const renderLinesInput = (label: string, lines: string[], onChange: (lines: string[]) => void) =>
    renderInput(
      `${label} (한 줄에 한 문장, 줄바꿈으로 구분)`,
      lines.join('\n'),
      (v) => onChange(v.split('\n').map((line) => line.trimEnd())),
      true,
    );

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col gap-8">
      <AdminPageHeader
        title="사이트 콘텐츠 설정"
        // loadError 면 왜 편집·저장이 막혔는지 알려준다(opus 리뷰 MEDIUM — loaded 는 노출해도 소비하지
        // 않으면 버튼만 영문 모른 채 계속 비활성화된 것처럼 보인다). notices/concerns 화면과 같은 톤.
        description={loadError ? '편집본을 불러오지 못했습니다. 저장과 게시를 차단했습니다 — 새로고침 후 다시 시도해 주세요.' : '홈 화면을 편집해 임시저장하고, PC·모바일 미리보기에서 확인한 뒤 게시합니다.'}
        actions={<>
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="flex min-h-11 items-center gap-2 border border-[#E7E0D5] bg-white px-4 text-sm font-semibold text-[#17211D] transition-colors hover:bg-[#F3EEE6]"
          >
            <Eye className="w-4 h-4" />
            미리보기
          </button>
          <button
            onClick={handleSave}
            disabled={!loaded || isSaving || isPublishing || !dirty}
            className="flex min-h-11 items-center gap-2 border border-[#17211D] bg-white px-5 text-sm font-semibold text-[#17211D] transition-colors hover:bg-[#FAF8F3] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '저장 중…' : '임시저장'}
          </button>
          <button
            onClick={handlePublish}
            disabled={!loaded || isSaving || isPublishing || (!dirty && !hasUnpublishedChanges)}
            className="flex min-h-11 items-center gap-2 bg-[#17211D] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#202521] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {isPublishing ? '게시 중…' : '홈에 게시'}
          </button>
        </>}
      />

      <div className="flex flex-wrap items-center gap-3 border border-[#E7E0D5] bg-white px-4 py-3 text-sm">
        <span className="font-semibold text-[#17211D]">게시본 v{publishedRevision ?? '없음'}</span>
        <span className="text-[#9AA39B]">/</span>
        <span className="font-semibold text-[#17211D]">편집본 v{draftRevision ?? '불러오는 중'}</span>
        {(dirty || hasUnpublishedChanges) && (
          <span className="bg-[#FFF3D6] px-2 py-1 text-xs font-semibold text-[#8A5B00]">
            게시되지 않은 변경 있음
          </span>
        )}
        {saveMessage && <span className="text-[#2F6B45]">{saveMessage}</span>}
        {actionError && <span role="alert" className="font-medium text-[#A65348]">{actionError}</span>}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden lg:flex-row">
        {/* Left Tabs */}
        <div className="flex h-auto shrink-0 flex-col overflow-hidden border border-[#E7E0D5] bg-white lg:h-full lg:w-64">
          <div className="border-b border-[#E7E0D5] bg-[#FAF8F3] p-4">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#59615B]">콘텐츠 섹션</h2>
          </div>
          <div className="flex flex-1 overflow-x-auto lg:block lg:overflow-y-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 border-b px-4 py-3 text-left text-sm transition-colors lg:w-full ${
                  activeTab === tab.id
                    ? 'border-[#D8C4A3] bg-[#F3EEE6] font-bold text-[#17211D] lg:border-l-2 lg:border-l-[#A8742E]'
                    : 'border-[#E7E0D5] text-[#59615B] hover:bg-[#FAF8F3] lg:border-l-2 lg:border-l-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content */}
        <div className="relative h-full flex-1 overflow-y-auto border border-[#E7E0D5] bg-white">
          <div className="p-6 md:p-8 max-w-3xl">
            <h2 className="mb-6 border-b border-[#E7E0D5] pb-4 text-xl font-semibold text-[#17211D]">
              {TABS.find((t) => t.id === activeTab)?.label} 설정
            </h2>

            {/* 1. 메인 히어로 */}
            {activeTab === 'hero' && (
              <div className="space-y-4">
                {renderToggle('메인 첫 화면 보이기', draft.hero.visible, (v) => updateDraft('hero', 'visible', v))}
                <div className="grid gap-5 md:grid-cols-2">
                  <ImageUploader value={draft.hero.desktopImage} onChange={(v) => updateDraft('hero', 'desktopImage', v)} domain="banner" usage="hero" draftId="cms-home" label="PC 대표 이미지" description="가로형 이미지를 권장합니다." height="220px" />
                  <ImageUploader value={draft.hero.mobileImage} onChange={(v) => updateDraft('hero', 'mobileImage', v)} domain="banner" usage="hero" draftId="cms-home" label="모바일 대표 이미지" description="세로형 또는 정사각형 이미지를 권장합니다." height="220px" />
                </div>
                {renderInput('대표 이미지 설명', draft.hero.imageAlt, (v) => updateDraft('hero', 'imageAlt', v))}
                {renderInput('상단 영문 뱃지 (eyebrow)', draft.hero.eyebrow, (v) => updateDraft('hero', 'eyebrow', v))}
                {renderLinesInput('큰 제목', draft.hero.titleLines, (v) => updateDraft('hero', 'titleLines', v))}
                {renderLinesInput('설명문', draft.hero.descriptionLines, (v) => updateDraft('hero', 'descriptionLines', v))}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderInput('기본 버튼 텍스트 (primaryCta)', draft.hero.primaryCtaLabel, (v) => updateDraft('hero', 'primaryCtaLabel', v))}
                  {renderInput('보조 버튼 텍스트 (secondaryCta)', draft.hero.secondaryCtaLabel, (v) => updateDraft('hero', 'secondaryCtaLabel', v))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderInput('기본 버튼 연결 주소', draft.hero.primaryCtaHref, (v) => updateDraft('hero', 'primaryCtaHref', v))}
                  {renderInput('보조 버튼 연결 주소', draft.hero.secondaryCtaHref, (v) => updateDraft('hero', 'secondaryCtaHref', v))}
                </div>
                {renderInput('신뢰 문구 (trustNote)', draft.hero.trustNote, (v) => updateDraft('hero', 'trustNote', v))}
              </div>
            )}

            {activeTab === 'quickShop' && (
              <div className="space-y-4">
                {renderToggle('빠른 쇼핑 영역 보이기', draft.quickShop.visible, (v) => updateDraft('quickShop', 'visible', v))}
                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <h4 className="text-sm font-bold text-gray-900">바로가기 메뉴</h4>
                  <button type="button" onClick={() => replaceArray('quickShop', 'links', [...draft.quickShop.links, { name: '새 메뉴', href: '/shop', icon: 'health', visible: true }])} className="btn-secondary min-h-10 gap-2 px-3 text-xs"><Plus className="size-4" />추가</button>
                </div>
                <div className="space-y-4">
                  {draft.quickShop.links.map((link, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-sm border border-gray-200">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        {renderToggle('고객에게 표시', link.visible, (v) => updateArrayField('quickShop', 'links', idx, 'visible', v))}
                        <div className="flex gap-1">
                          <button type="button" onClick={() => moveArrayItem('quickShop', 'links', idx, -1)} disabled={idx === 0} aria-label="위로" className="inline-flex size-10 items-center justify-center border bg-white disabled:opacity-30"><ArrowUp className="size-4" /></button>
                          <button type="button" onClick={() => moveArrayItem('quickShop', 'links', idx, 1)} disabled={idx === draft.quickShop.links.length - 1} aria-label="아래로" className="inline-flex size-10 items-center justify-center border bg-white disabled:opacity-30"><ArrowDown className="size-4" /></button>
                          <button type="button" onClick={() => removeArrayItem('quickShop', 'links', idx)} aria-label="삭제" className="inline-flex size-10 items-center justify-center border border-red-200 bg-white text-red-600"><Trash2 className="size-4" /></button>
                        </div>
                      </div>
                      {renderInput(`바로가기 ${idx + 1} 이름`, link.name, (v) => updateArrayField('quickShop', 'links', idx, 'name', v))}
                      {renderInput('연결 주소', link.href, (v) => updateArrayField('quickShop', 'links', idx, 'href', v))}
                      <label className="block text-xs font-medium text-[#59615B]">아이콘
                        <select value={link.icon} onChange={(event) => updateArrayField('quickShop', 'links', idx, 'icon', event.target.value)} className="mt-1.5 min-h-11 w-full border border-[#D1D0C8] bg-white px-3 text-sm">
                          <option value="dog">강아지</option><option value="cat">고양이</option><option value="rabbit">소동물</option><option value="food">사료·간식</option><option value="care">위생·배변</option><option value="health">건강관리</option>
                        </select>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. 오늘의 추천 */}
            {activeTab === 'bestProducts' && (
              <div className="space-y-4">
                {renderToggle('추천 상품 영역 보이기', draft.bestProducts.visible, (v) => updateDraft('bestProducts', 'visible', v))}
                {renderInput('섹션 제목 (title)', draft.bestProducts.title, (v) => updateDraft('bestProducts', 'title', v))}
                {renderInput('전체보기 링크 텍스트 (linkLabel)', draft.bestProducts.linkLabel, (v) => updateDraft('bestProducts', 'linkLabel', v))}
                {renderInput('전체보기 연결 주소', draft.bestProducts.linkHref, (v) => updateDraft('bestProducts', 'linkHref', v))}
              </div>
            )}

            {/* 4. 맞춤 큐레이션 */}
            {activeTab === 'curation' && (
              <div className="space-y-6">
                {renderToggle('맞춤 큐레이션 영역 보이기', draft.curation.visible, (v) => updateDraft('curation', 'visible', v))}
                <div className="bg-gray-50 p-4 rounded-sm border border-gray-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-4">공통 영역</h4>
                  {renderInput('섹션 제목 (title)', draft.curation.title, (v) => updateDraft('curation', 'title', v))}
                  {renderInput('설명 (description)', draft.curation.description, (v) => updateDraft('curation', 'description', v), true)}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {renderInput('진단 링크 텍스트', draft.curation.diagnosisLinkLabel, (v) => updateDraft('curation', 'diagnosisLinkLabel', v))}
                    {renderInput('모든 고민 링크 텍스트', draft.curation.allConcernsLinkLabel, (v) => updateDraft('curation', 'allConcernsLinkLabel', v))}
                  </div>
                </div>

                <div>
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h4 className="text-sm font-bold text-gray-900">고민 카드</h4>
                    <button type="button" onClick={() => replaceArray('curation', 'cards', [...draft.curation.cards, { title: '새 고민', desc: '', href: '/concerns', image: '', visible: true }])} className="btn-secondary min-h-10 gap-2 px-3 text-xs"><Plus className="size-4" />카드 추가</button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {draft.curation.cards.map((card, idx) => (
                      <div key={idx} className="bg-gray-50 p-4 border border-gray-200 rounded-sm">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          {renderToggle('카드 표시', card.visible, (v) => updateArrayField('curation', 'cards', idx, 'visible', v))}
                          <div className="flex gap-1">
                            <button type="button" onClick={() => moveArrayItem('curation', 'cards', idx, -1)} disabled={idx === 0} aria-label="위로" className="inline-flex size-10 items-center justify-center border bg-white disabled:opacity-30"><ArrowUp className="size-4" /></button>
                            <button type="button" onClick={() => moveArrayItem('curation', 'cards', idx, 1)} disabled={idx === draft.curation.cards.length - 1} aria-label="아래로" className="inline-flex size-10 items-center justify-center border bg-white disabled:opacity-30"><ArrowDown className="size-4" /></button>
                            <button type="button" onClick={() => removeArrayItem('curation', 'cards', idx)} aria-label="삭제" className="inline-flex size-10 items-center justify-center border border-red-200 bg-white text-red-600"><Trash2 className="size-4" /></button>
                          </div>
                        </div>
                        <ImageUploader value={card.image} onChange={(v) => updateArrayField('curation', 'cards', idx, 'image', v)} domain="banner" usage="cover" draftId="cms-home" label={`카드 ${idx + 1} 이미지`} height="220px" />
                        {renderInput(`카드 ${idx + 1} 제목`, card.title, (v) => updateArrayField('curation', 'cards', idx, 'title', v))}
                        {renderInput(`카드 ${idx + 1} 설명`, card.desc, (v) => updateArrayField('curation', 'cards', idx, 'desc', v))}
                        {renderInput(`카드 ${idx + 1} 연결 주소`, card.href, (v) => updateArrayField('curation', 'cards', idx, 'href', v))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. 백조오브제 Audit */}
            {activeTab === 'audit' && (
              <div className="space-y-6">
                {renderToggle('Audit 소개 영역 보이기', draft.audit.visible, (v) => updateDraft('audit', 'visible', v))}
                <div className="grid gap-5 md:grid-cols-2">
                  <ImageUploader value={draft.audit.desktopImage} onChange={(v) => updateDraft('audit', 'desktopImage', v)} domain="banner" usage="cover" draftId="cms-home" label="PC Audit 이미지" height="220px" />
                  <ImageUploader value={draft.audit.mobileImage} onChange={(v) => updateDraft('audit', 'mobileImage', v)} domain="banner" usage="cover" draftId="cms-home" label="모바일 Audit 이미지" height="220px" />
                </div>
                {renderInput('Audit 이미지 설명', draft.audit.imageAlt, (v) => updateDraft('audit', 'imageAlt', v))}
                {renderInput('상단 영문 뱃지 (badge)', draft.audit.badge, (v) => updateDraft('audit', 'badge', v))}
                {renderLinesInput('큰 제목', draft.audit.titleLines, (v) => updateDraft('audit', 'titleLines', v))}
                {renderInput('설명 (description)', draft.audit.description, (v) => updateDraft('audit', 'description', v), true)}
                {renderInput('링크 텍스트 (linkLabel)', draft.audit.linkLabel, (v) => updateDraft('audit', 'linkLabel', v))}
                {renderInput('링크 연결 주소', draft.audit.linkHref, (v) => updateDraft('audit', 'linkHref', v))}

                <h4 className="text-sm font-bold text-gray-900 mt-6 pt-4 border-t border-gray-100">4가지 검증 기준 (아이콘은 고정)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {draft.audit.criteria.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-sm border border-gray-200">
                      {renderInput(`기준 ${idx + 1} 제목`, item.title, (v) => updateArrayField('audit', 'criteria', idx, 'title', v))}
                      {renderInput(`기준 ${idx + 1} 설명`, item.desc, (v) => updateArrayField('audit', 'criteria', idx, 'desc', v))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. 3가지 솔루션 */}
            {activeTab === 'solutions' && (
              <div className="space-y-6">
                {renderToggle('3가지 솔루션 영역 보이기', draft.solutions.visible, (v) => updateDraft('solutions', 'visible', v))}
                {renderInput('섹션 제목 (title)', draft.solutions.title, (v) => updateDraft('solutions', 'title', v))}
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-sm font-bold text-gray-900">솔루션 카드</h4>
                  <button type="button" onClick={() => replaceArray('solutions', 'cards', [...draft.solutions.cards, { title: '새 솔루션', desc: '', linkLabel: '자세히 보기', href: '/', image: '', visible: true }])} className="btn-secondary min-h-10 gap-2 px-3 text-xs"><Plus className="size-4" />카드 추가</button>
                </div>
                <div className="space-y-4">
                  {draft.solutions.cards.map((card, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-sm border border-gray-200">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        {renderToggle('카드 표시', card.visible, (v) => updateArrayField('solutions', 'cards', idx, 'visible', v))}
                        <div className="flex gap-1">
                          <button type="button" onClick={() => moveArrayItem('solutions', 'cards', idx, -1)} disabled={idx === 0} aria-label="위로" className="inline-flex size-10 items-center justify-center border bg-white disabled:opacity-30"><ArrowUp className="size-4" /></button>
                          <button type="button" onClick={() => moveArrayItem('solutions', 'cards', idx, 1)} disabled={idx === draft.solutions.cards.length - 1} aria-label="아래로" className="inline-flex size-10 items-center justify-center border bg-white disabled:opacity-30"><ArrowDown className="size-4" /></button>
                          <button type="button" onClick={() => removeArrayItem('solutions', 'cards', idx)} aria-label="삭제" className="inline-flex size-10 items-center justify-center border border-red-200 bg-white text-red-600"><Trash2 className="size-4" /></button>
                        </div>
                      </div>
                      <ImageUploader value={card.image} onChange={(v) => updateArrayField('solutions', 'cards', idx, 'image', v)} domain="banner" usage="cover" draftId="cms-home" label={`솔루션 ${idx + 1} 이미지`} height="220px" />
                      {renderInput('제목 (title)', card.title, (v) => updateArrayField('solutions', 'cards', idx, 'title', v))}
                      {renderInput('설명 (desc)', card.desc, (v) => updateArrayField('solutions', 'cards', idx, 'desc', v), true)}
                      {renderInput('링크 텍스트 (linkLabel)', card.linkLabel, (v) => updateArrayField('solutions', 'cards', idx, 'linkLabel', v))}
                      {renderInput('연결 주소', card.href, (v) => updateArrayField('solutions', 'cards', idx, 'href', v))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 9. 펫보험 배너 */}
            {activeTab === 'insuranceBanner' && (
              <div className="space-y-4">
                {renderToggle('펫보험 배너 보이기', draft.insuranceBanner.visible, (v) => updateDraft('insuranceBanner', 'visible', v))}
                <div className="grid gap-5 md:grid-cols-2">
                  <ImageUploader value={draft.insuranceBanner.desktopImage} onChange={(v) => updateDraft('insuranceBanner', 'desktopImage', v)} domain="banner" usage="cover" draftId="cms-home" label="PC 배너 이미지" height="220px" />
                  <ImageUploader value={draft.insuranceBanner.mobileImage} onChange={(v) => updateDraft('insuranceBanner', 'mobileImage', v)} domain="banner" usage="cover" draftId="cms-home" label="모바일 배너 이미지" height="220px" />
                </div>
                {renderInput('배너 이미지 설명', draft.insuranceBanner.imageAlt, (v) => updateDraft('insuranceBanner', 'imageAlt', v))}
                {renderInput('상단 영문 뱃지 (eyebrow)', draft.insuranceBanner.eyebrow, (v) => updateDraft('insuranceBanner', 'eyebrow', v))}
                {renderInput('섹션 제목 (title)', draft.insuranceBanner.title, (v) => updateDraft('insuranceBanner', 'title', v))}
                {renderInput('설명 (description)', draft.insuranceBanner.description, (v) => updateDraft('insuranceBanner', 'description', v), true)}
                {renderInput('버튼 텍스트 (buttonLabel)', draft.insuranceBanner.buttonLabel, (v) => updateDraft('insuranceBanner', 'buttonLabel', v))}
                {renderInput('버튼 연결 주소', draft.insuranceBanner.buttonHref, (v) => updateDraft('insuranceBanner', 'buttonHref', v))}
              </div>
            )}

            {/* 10. 후기/소식 */}
            {activeTab === 'trustBoard' && (
              <div className="space-y-4">
                {renderToggle('후기·소식 영역 보이기', draft.trustBoard.visible, (v) => updateDraft('trustBoard', 'visible', v))}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 border border-gray-200 rounded-sm">
                    {renderInput('후기 영역 제목', draft.trustBoard.reviewsTitle, (v) => updateDraft('trustBoard', 'reviewsTitle', v))}
                    {renderInput('후기 링크 텍스트', draft.trustBoard.reviewsLinkLabel, (v) => updateDraft('trustBoard', 'reviewsLinkLabel', v))}
                    {renderInput('후기 연결 주소', draft.trustBoard.reviewsLinkHref, (v) => updateDraft('trustBoard', 'reviewsLinkHref', v))}
                  </div>
                  <div className="bg-gray-50 p-4 border border-gray-200 rounded-sm">
                    {renderInput('소식 영역 제목', draft.trustBoard.noticesTitle, (v) => updateDraft('trustBoard', 'noticesTitle', v))}
                    {renderInput('소식 링크 텍스트', draft.trustBoard.noticesLinkLabel, (v) => updateDraft('trustBoard', 'noticesLinkLabel', v))}
                    {renderInput('소식 연결 주소', draft.trustBoard.noticesLinkHref, (v) => updateDraft('trustBoard', 'noticesLinkHref', v))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* 미리보기 모달 — HomeClient 는 settings 를 prop 으로 받으므로 draft 를 직접 넘긴다. */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[100] flex bg-black/80">
          <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 shrink-0">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-gray-900">홈페이지 미리보기</h2>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">실시간 편집 반영됨</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={!loaded || isSaving || isPublishing || !dirty}
                  className="flex items-center gap-2 px-4 py-2 border border-[#2F3B34] bg-white text-[#2F3B34] rounded-md hover:bg-[#F3EEE6] font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  임시저장
                </button>
                <button
                  onClick={handlePublish}
                  disabled={!loaded || isSaving || isPublishing || (!dirty && !hasUnpublishedChanges)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2F3B34] text-white rounded-md hover:bg-[#1f2823] font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  홈에 게시
                </button>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  aria-label="미리보기 닫기"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="w-full relative pointer-events-none">
                <HomeClient products={previewProducts} brands={previewBrands} notices={previewNotices} reviews={previewReviews} settings={draft} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
