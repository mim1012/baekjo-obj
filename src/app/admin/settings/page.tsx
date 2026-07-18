'use client';

import { useEffect, useState } from 'react';
import { Eye, Save, X } from 'lucide-react';
import { useSiteSettings } from '@/components/providers/SiteSettingsProvider';
import { HomeSettings } from '@/data/homeContent';
import { getPublicProducts, getPublicBrands, getNoticesConfig, getShowcaseReviews } from '@/lib/storage';
import HomeClient from '@/components/home/HomeClient';
import type { Brand, Notice, Product, Review } from '@/types';
import { AdminPageHeader } from '@/components/admin/AdminUi';

// 탭은 실제 홈(HomeClient)의 섹션 순서와 1:1 이다. 아이콘·href·이미지 등 "구조"는
// HomeClient 하드코딩이라 편집 대상이 아니고, 여기서는 "문구"만 편집한다(§ homeContent).
const TABS = [
  { id: 'hero', label: '메인 히어로' },
  { id: 'quickShop', label: '빠른 쇼핑' },
  { id: 'bestProducts', label: '오늘의 추천' },
  { id: 'curation', label: '맞춤 큐레이션' },
  { id: 'audit', label: '백조오브제 Audit' },
  { id: 'solutions', label: '3가지 솔루션' },
  { id: 'insuranceBanner', label: '펫보험 배너' },
  { id: 'trustBoard', label: '후기/소식' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function SiteSettingsPage() {
  const { settings, updateSettings, loaded, loadError } = useSiteSettings();
  const [draft, setDraft] = useState<HomeSettings>(settings);
  const [dirty, setDirty] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('hero');
  // 미리보기는 홈 화면(HomeClient)을 그대로 재사용한다 — repo(서버 전용)는 클라이언트
  // 컴포넌트에서 못 부르므로, 미리보기를 열 때 공개 API 로 상품·브랜드를 읽어 props 로 넘긴다.
  const [previewProducts, setPreviewProducts] = useState<Product[]>([]);
  const [previewBrands, setPreviewBrands] = useState<Brand[]>([]);
  const [previewNotices, setPreviewNotices] = useState<Notice[]>([]);
  const [previewReviews, setPreviewReviews] = useState<Review[]>([]);

  // provider 가 GET /api/settings 로 실제 저장값을 받아오면(첫 마운트/하드 리로드) draft 를 그 값에
  // 맞춘다. 단 관리자가 이미 편집 중(dirty)이면 편집 내용을 덮지 않는다.
  useEffect(() => {
    if (dirty) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(settings);
  }, [settings, dirty]);

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
  const handleSave = async () => {
    if (!loaded) return;
    const ok = await updateSettings(draft);
    if (ok) {
      setDirty(false);
      alert('설정이 저장되었습니다.');
    } else {
      alert('설정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
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
  const updateArrayField = (section: keyof HomeSettings, arrayField: string, index: number, itemField: string, value: string) => {
    if (!loaded) return;
    setDirty(true);
    setDraft((prev) => {
      const sectionData = prev[section] as Record<string, unknown>;
      const newArray = [...(sectionData[arrayField] as Array<Record<string, string>>)];
      newArray[index] = { ...newArray[index], [itemField]: value };
      return {
        ...prev,
        [section]: { ...sectionData, [arrayField]: newArray }
      } as HomeSettings;
    });
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
        description={loadError ? '설정을 불러오지 못했습니다. 저장이 차단되었습니다 — 새로고침 후 다시 시도해 주세요.' : '홈페이지의 주요 문구를 섹션별로 편집하고, 실제 화면을 미리 확인한 뒤 한 번에 저장합니다.'}
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
            disabled={!loaded}
            className="flex min-h-11 items-center gap-2 bg-[#17211D] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#202521] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            변경사항 저장
          </button>
        </>}
      />

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
                {renderInput('상단 영문 뱃지 (eyebrow)', draft.hero.eyebrow, (v) => updateDraft('hero', 'eyebrow', v))}
                {renderLinesInput('큰 제목', draft.hero.titleLines, (v) => updateDraft('hero', 'titleLines', v))}
                {renderLinesInput('설명문', draft.hero.descriptionLines, (v) => updateDraft('hero', 'descriptionLines', v))}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderInput('기본 버튼 텍스트 (primaryCta)', draft.hero.primaryCtaLabel, (v) => updateDraft('hero', 'primaryCtaLabel', v))}
                  {renderInput('보조 버튼 텍스트 (secondaryCta)', draft.hero.secondaryCtaLabel, (v) => updateDraft('hero', 'secondaryCtaLabel', v))}
                </div>
                {renderInput('신뢰 문구 (trustNote)', draft.hero.trustNote, (v) => updateDraft('hero', 'trustNote', v))}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderInput('이미지 뱃지 제목 (badgeTitle)', draft.hero.badgeTitle, (v) => updateDraft('hero', 'badgeTitle', v))}
                  {renderInput('이미지 뱃지 부제 (badgeSubtitle)', draft.hero.badgeSubtitle, (v) => updateDraft('hero', 'badgeSubtitle', v))}
                </div>
              </div>
            )}

            {/* 2. 빠른 쇼핑 */}
            {activeTab === 'quickShop' && (
              <div className="space-y-4">
                {renderInput('섹션 제목 (title)', draft.quickShop.title, (v) => updateDraft('quickShop', 'title', v))}
                <h4 className="text-sm font-bold text-gray-900 mt-6 pt-4 border-t border-gray-100">바로가기 이름 (아이콘·링크는 고정)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {draft.quickShop.links.map((link, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-sm border border-gray-200">
                      {renderInput(`바로가기 ${idx + 1} 이름`, link.name, (v) => updateArrayField('quickShop', 'links', idx, 'name', v))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. 오늘의 추천 */}
            {activeTab === 'bestProducts' && (
              <div className="space-y-4">
                {renderInput('섹션 제목 (title)', draft.bestProducts.title, (v) => updateDraft('bestProducts', 'title', v))}
                {renderInput('전체보기 링크 텍스트 (linkLabel)', draft.bestProducts.linkLabel, (v) => updateDraft('bestProducts', 'linkLabel', v))}
              </div>
            )}

            {/* 4. 맞춤 큐레이션 */}
            {activeTab === 'curation' && (
              <div className="space-y-6">
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
                  <h4 className="text-sm font-bold text-gray-900 mb-4">고민 4가지 카드 (아이콘·이미지·링크는 고정)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {draft.curation.cards.map((card, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 border border-gray-200 rounded-sm">
                        {renderInput(`카드 ${idx + 1} 제목`, card.title, (v) => updateArrayField('curation', 'cards', idx, 'title', v))}
                        {renderInput(`카드 ${idx + 1} 설명`, card.desc, (v) => updateArrayField('curation', 'cards', idx, 'desc', v))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. 백조오브제 Audit */}
            {activeTab === 'audit' && (
              <div className="space-y-6">
                {renderInput('상단 영문 뱃지 (badge)', draft.audit.badge, (v) => updateDraft('audit', 'badge', v))}
                {renderLinesInput('큰 제목', draft.audit.titleLines, (v) => updateDraft('audit', 'titleLines', v))}
                {renderInput('설명 (description)', draft.audit.description, (v) => updateDraft('audit', 'description', v), true)}
                {renderInput('링크 텍스트 (linkLabel)', draft.audit.linkLabel, (v) => updateDraft('audit', 'linkLabel', v))}

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
                {renderInput('섹션 제목 (title)', draft.solutions.title, (v) => updateDraft('solutions', 'title', v))}
                <h4 className="text-sm font-bold text-gray-900 mt-2">3가지 솔루션 카드 (이미지·링크는 고정)</h4>
                <div className="space-y-4">
                  {draft.solutions.cards.map((card, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-sm border border-gray-200">
                      <h5 className="text-xs font-bold mb-2">솔루션 {idx + 1}</h5>
                      {renderInput('제목 (title)', card.title, (v) => updateArrayField('solutions', 'cards', idx, 'title', v))}
                      {renderInput('설명 (desc)', card.desc, (v) => updateArrayField('solutions', 'cards', idx, 'desc', v), true)}
                      {renderInput('링크 텍스트 (linkLabel)', card.linkLabel, (v) => updateArrayField('solutions', 'cards', idx, 'linkLabel', v))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 9. 펫보험 배너 */}
            {activeTab === 'insuranceBanner' && (
              <div className="space-y-4">
                {renderInput('상단 영문 뱃지 (eyebrow)', draft.insuranceBanner.eyebrow, (v) => updateDraft('insuranceBanner', 'eyebrow', v))}
                {renderInput('섹션 제목 (title)', draft.insuranceBanner.title, (v) => updateDraft('insuranceBanner', 'title', v))}
                {renderInput('설명 (description)', draft.insuranceBanner.description, (v) => updateDraft('insuranceBanner', 'description', v), true)}
                {renderInput('버튼 텍스트 (buttonLabel)', draft.insuranceBanner.buttonLabel, (v) => updateDraft('insuranceBanner', 'buttonLabel', v))}
              </div>
            )}

            {/* 10. 후기/소식 */}
            {activeTab === 'trustBoard' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 border border-gray-200 rounded-sm">
                  {renderInput('후기 영역 제목', draft.trustBoard.reviewsTitle, (v) => updateDraft('trustBoard', 'reviewsTitle', v))}
                  {renderInput('후기 링크 텍스트', draft.trustBoard.reviewsLinkLabel, (v) => updateDraft('trustBoard', 'reviewsLinkLabel', v))}
                </div>
                <div className="bg-gray-50 p-4 border border-gray-200 rounded-sm">
                  {renderInput('소식 영역 제목', draft.trustBoard.noticesTitle, (v) => updateDraft('trustBoard', 'noticesTitle', v))}
                  {renderInput('소식 링크 텍스트', draft.trustBoard.noticesLinkLabel, (v) => updateDraft('trustBoard', 'noticesLinkLabel', v))}
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
                  disabled={!loaded}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2F3B34] text-white rounded-md hover:bg-[#1f2823] font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  현재 상태로 저장
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
