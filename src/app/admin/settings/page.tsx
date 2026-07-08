'use client';

import { useState } from 'react';
import { Settings, Eye, Save, X } from 'lucide-react';
import { useSiteSettings } from '@/components/providers/SiteSettingsProvider';
import { HomeSettings } from '@/data/homeContent';
import Home from '@/app/page';

const TABS = [
  { id: 'intro', label: '메인 영상' },
  { id: 'howToStart', label: '소개 (How to Start)' },
  { id: 'audit', label: '오딧 (Audit)' },
  { id: 'curation', label: '맞춤 큐레이션' },
  { id: 'brands', label: '검증 브랜드관' },
  { id: 'bestProducts', label: '오늘의 추천' },
  { id: 'insurance', label: '펫보험 분석' },
  { id: 'trustBoard', label: 'Trust Board (후기/공지)' },
  { id: 'b2b', label: '하단 B2B 안내' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function SiteSettingsPage() {
  const { settings, updateSettings } = useSiteSettings();
  const [draft, setDraft] = useState<HomeSettings>(settings);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('intro');

  const handleSave = () => {
    updateSettings(draft);
    alert('설정이 저장되었습니다.');
  };

  const updateDraft = (section: keyof HomeSettings, field: string, value: unknown) => {
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

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))]">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-gray-400" />
            환경설정 (CMS)
          </h1>
          <p className="mt-1 text-sm text-[#737A74]">
            홈페이지의 전체 콘텐츠를 관리합니다. (HTML 태그 사용 가능)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#D1D0C8] text-[#17211D] rounded-sm hover:bg-gray-50 font-medium text-sm transition-colors"
          >
            <Eye className="w-4 h-4" />
            미리보기
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-[#2F3B34] text-white rounded-sm hover:bg-[#1f2823] font-medium text-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            변경사항 저장
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
        {/* Left Tabs */}
        <div className="w-64 shrink-0 bg-white border border-[#D1D0C8] rounded-sm overflow-hidden flex flex-col h-full">
          <div className="p-3 bg-[#F8F7F2] border-b border-[#D1D0C8]">
            <h2 className="text-xs font-bold text-[#2F3B34] uppercase tracking-wider">메뉴 섹션</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-l-blue-600'
                    : 'text-[#59615B] hover:bg-gray-50 border-l-4 border-l-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 bg-white border border-[#D1D0C8] rounded-sm overflow-y-auto h-full relative">
          <div className="p-6 md:p-8 max-w-3xl">
            <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
              {TABS.find((t) => t.id === activeTab)?.label} 설정
            </h2>

            {/* 메인 영상 */}
            {activeTab === 'intro' && (
              <div className="space-y-4">
                {renderInput('영상 경로 (videoSrc)', draft.intro.videoSrc, (v) => updateDraft('intro', 'videoSrc', v))}
              </div>
            )}

            {/* 소개 (How to Start) */}
            {activeTab === 'howToStart' && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-sm border border-gray-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-4">공통 영역</h4>
                  {renderInput('섹션 제목 (Title)', draft.howToStart.title, (v) => updateDraft('howToStart', 'title', v), true)}
                  {renderInput('설명문 (Description)', draft.howToStart.description, (v) => updateDraft('howToStart', 'description', v), true)}
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-900">3가지 스텝 설정</h4>
                  {draft.howToStart.steps.map((step, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-sm border border-gray-200 relative">
                      <div className="absolute top-0 right-0 bg-[#F8F7F2] text-[#2F3B34] text-[10px] font-bold px-2 py-1 rounded-bl-sm border-b border-l border-gray-200">
                        Step {idx + 1}
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        {renderInput('넘버 라벨 (num)', step.num, (v) => updateArrayField('howToStart', 'steps', idx, 'num', v))}
                        {renderInput('스텝 제목 (title)', step.title, (v) => updateArrayField('howToStart', 'steps', idx, 'title', v))}
                        <div className="col-span-2">
                          {renderInput('스텝 설명 (desc)', step.desc, (v) => updateArrayField('howToStart', 'steps', idx, 'desc', v), true)}
                        </div>
                        {renderInput('링크 텍스트 (linkText)', step.linkText, (v) => updateArrayField('howToStart', 'steps', idx, 'linkText', v))}
                        {renderInput('이동할 경로 (linkHref)', step.linkHref, (v) => updateArrayField('howToStart', 'steps', idx, 'linkHref', v))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 오딧 (Audit) */}
            {activeTab === 'audit' && (
              <div className="space-y-6">
                {renderInput('상단 영문 뱃지 (badge)', draft.audit.badge, (v) => updateDraft('audit', 'badge', v))}
                {renderInput('큰 제목 (title)', draft.audit.title, (v) => updateDraft('audit', 'title', v), true)}
                {renderInput('설명 제목 (descriptionTitle)', draft.audit.descriptionTitle, (v) => updateDraft('audit', 'descriptionTitle', v))}
                {renderInput('상세 설명 (descriptionText)', draft.audit.descriptionText, (v) => updateDraft('audit', 'descriptionText', v), true)}
                {renderInput('자필 서명 텍스트 (signatureText)', draft.audit.signatureText, (v) => updateDraft('audit', 'signatureText', v), true)}
                {renderInput('하단 띠배너 문구 (bannerText)', draft.audit.bannerText, (v) => updateDraft('audit', 'bannerText', v))}
                
                <h4 className="text-sm font-bold text-gray-900 mt-6 pt-4 border-t border-gray-100">4가지 기준 아이콘 설정</h4>
                <div className="grid grid-cols-2 gap-4">
                  {draft.audit.icons.map((icon, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-sm border border-gray-200">
                      {renderInput(`아이콘 ${idx + 1} 제목`, icon.title, (v) => updateArrayField('audit', 'icons', idx, 'title', v))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 맞춤 큐레이션 */}
            {activeTab === 'curation' && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-sm border border-gray-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-4">왼쪽 패널 텍스트</h4>
                  {renderInput('상단 영문 뱃지 (badge)', draft.curation.badge, (v) => updateDraft('curation', 'badge', v))}
                  {renderInput('메인 타이틀 (title)', draft.curation.title, (v) => updateDraft('curation', 'title', v), true)}
                  {renderInput('상세 설명 (description)', draft.curation.description, (v) => updateDraft('curation', 'description', v), true)}
                  <div className="grid grid-cols-2 gap-4">
                    {renderInput('버튼 1 텍스트', draft.curation.button1Text, (v) => updateDraft('curation', 'button1Text', v))}
                    {renderInput('버튼 2 텍스트', draft.curation.button2Text, (v) => updateDraft('curation', 'button2Text', v))}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-sm border border-gray-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-4">우측 보드 텍스트</h4>
                  {renderInput('보드 상단 제목', draft.curation.boardTitle, (v) => updateDraft('curation', 'boardTitle', v))}
                  {renderInput('보드 상단 설명', draft.curation.boardDesc, (v) => updateDraft('curation', 'boardDesc', v))}
                  
                  <h5 className="text-xs font-bold mt-4 mb-2">고민 4가지 카드</h5>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {draft.curation.cards.map((card, idx) => (
                      <div key={idx} className="bg-white p-3 border border-gray-200 rounded-sm">
                        {renderInput(`카드 ${idx+1} 제목`, card.title, (v) => updateArrayField('curation', 'cards', idx, 'title', v))}
                        {renderInput(`카드 ${idx+1} 설명`, card.desc, (v) => updateArrayField('curation', 'cards', idx, 'desc', v), true)}
                      </div>
                    ))}
                  </div>

                  <h5 className="text-xs font-bold mt-4 mb-2">Step 2 (중앙)</h5>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {renderInput('제목', draft.curation.step2Title, (v) => updateDraft('curation', 'step2Title', v))}
                    {renderInput('설명', draft.curation.step2Desc, (v) => updateDraft('curation', 'step2Desc', v), true)}
                  </div>

                  <h5 className="text-xs font-bold mt-4 mb-2">Step 3 (하단 결과)</h5>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-3 border border-gray-200 rounded-sm">
                      {renderInput('좌측 제목', draft.curation.step3LeftTitle, (v) => updateDraft('curation', 'step3LeftTitle', v))}
                      {renderInput('좌측 설명', draft.curation.step3LeftDesc, (v) => updateDraft('curation', 'step3LeftDesc', v), true)}
                    </div>
                    <div className="bg-white p-3 border border-gray-200 rounded-sm">
                      {renderInput('우측 제목', draft.curation.step3RightTitle, (v) => updateDraft('curation', 'step3RightTitle', v))}
                      {renderInput('우측 설명', draft.curation.step3RightDesc, (v) => updateDraft('curation', 'step3RightDesc', v), true)}
                    </div>
                  </div>

                  {renderInput('가장 하단 가이드 문구', draft.curation.bottomGuide, (v) => updateDraft('curation', 'bottomGuide', v))}
                </div>
              </div>
            )}

            {/* 검증 브랜드관 */}
            {activeTab === 'brands' && (
              <div className="space-y-4">
                {renderInput('영문 뱃지 (eyebrow)', draft.brands.eyebrow, (v) => updateDraft('brands', 'eyebrow', v))}
                {renderInput('섹션 제목 (title)', draft.brands.title, (v) => updateDraft('brands', 'title', v))}
                {renderInput('섹션 설명 (description)', draft.brands.description, (v) => updateDraft('brands', 'description', v), true)}
                {renderInput('버튼 텍스트 (buttonText)', draft.brands.buttonText, (v) => updateDraft('brands', 'buttonText', v))}
              </div>
            )}

            {/* 오늘의 추천 */}
            {activeTab === 'bestProducts' && (
              <div className="space-y-4">
                {renderInput('영문 뱃지 (eyebrow)', draft.bestProducts.eyebrow, (v) => updateDraft('bestProducts', 'eyebrow', v))}
                {renderInput('섹션 제목 (title)', draft.bestProducts.title, (v) => updateDraft('bestProducts', 'title', v))}
                {renderInput('섹션 설명 (description)', draft.bestProducts.description, (v) => updateDraft('bestProducts', 'description', v), true)}
                {renderInput('버튼 텍스트 (linkLabel)', draft.bestProducts.linkLabel, (v) => updateDraft('bestProducts', 'linkLabel', v))}
              </div>
            )}

            {/* 펫보험 분석 */}
            {activeTab === 'insurance' && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-sm border border-gray-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-4">공통 영역</h4>
                  {renderInput('영문 뱃지 (eyebrow)', draft.insurance.eyebrow, (v) => updateDraft('insurance', 'eyebrow', v))}
                  {renderInput('섹션 타이틀', draft.insurance.title, (v) => updateDraft('insurance', 'title', v), true)}
                  {renderInput('섹션 설명', draft.insurance.description, (v) => updateDraft('insurance', 'description', v), true)}
                  {renderInput('안내 문구 (disclaimer)', draft.insurance.disclaimer, (v) => updateDraft('insurance', 'disclaimer', v))}
                  {renderInput('버튼 텍스트', draft.insurance.buttonText, (v) => updateDraft('insurance', 'buttonText', v))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 border border-gray-200 rounded-sm">
                    <h5 className="text-xs font-bold mb-2">Step 1</h5>
                    {renderInput('제목', draft.insurance.step1Title, (v) => updateDraft('insurance', 'step1Title', v))}
                    {renderInput('설명', draft.insurance.step1Desc, (v) => updateDraft('insurance', 'step1Desc', v), true)}
                  </div>
                  <div className="bg-white p-3 border border-gray-200 rounded-sm">
                    <h5 className="text-xs font-bold mb-2">Step 2</h5>
                    {renderInput('제목', draft.insurance.step2Title, (v) => updateDraft('insurance', 'step2Title', v))}
                    {renderInput('설명', draft.insurance.step2Desc, (v) => updateDraft('insurance', 'step2Desc', v), true)}
                  </div>
                  <div className="bg-white p-3 border border-gray-200 rounded-sm">
                    <h5 className="text-xs font-bold mb-2">Step 3</h5>
                    {renderInput('제목', draft.insurance.step3Title, (v) => updateDraft('insurance', 'step3Title', v))}
                    {renderInput('설명', draft.insurance.step3Desc, (v) => updateDraft('insurance', 'step3Desc', v), true)}
                  </div>
                </div>
              </div>
            )}

            {/* Trust Board (후기/공지) */}
            {activeTab === 'trustBoard' && (
              <div className="space-y-4">
                {renderInput('영문 뱃지 (eyebrow)', draft.trustBoard.eyebrow, (v) => updateDraft('trustBoard', 'eyebrow', v))}
                {renderInput('섹션 메인 제목 (title)', draft.trustBoard.title, (v) => updateDraft('trustBoard', 'title', v), true)}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-gray-50 p-4 border border-gray-200 rounded-sm">
                    {renderInput('후기 영역 제목', draft.trustBoard.reviewsTitle, (v) => updateDraft('trustBoard', 'reviewsTitle', v))}
                    {renderInput('후기 버튼 텍스트', draft.trustBoard.reviewsLinkText, (v) => updateDraft('trustBoard', 'reviewsLinkText', v))}
                  </div>
                  <div className="bg-gray-50 p-4 border border-gray-200 rounded-sm">
                    {renderInput('공지사항 영역 제목', draft.trustBoard.noticesTitle, (v) => updateDraft('trustBoard', 'noticesTitle', v))}
                    {renderInput('공지사항 버튼 텍스트', draft.trustBoard.noticesLinkText, (v) => updateDraft('trustBoard', 'noticesLinkText', v))}
                  </div>
                </div>
              </div>
            )}

            {/* B2B 하단 배너 */}
            {activeTab === 'b2b' && (
              <div className="space-y-4">
                {renderInput('안내 텍스트', draft.b2b.text, (v) => updateDraft('b2b', 'text', v), true)}
                {renderInput('링크(버튼) 텍스트', draft.b2b.linkText, (v) => updateDraft('b2b', 'linkText', v))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* 미리보기 모달 */}
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
                  className="flex items-center gap-2 px-4 py-2 bg-[#2F3B34] text-white rounded-md hover:bg-[#1f2823] font-medium text-sm transition-colors"
                >
                  <Save className="w-4 h-4" />
                  현재 상태로 저장
                </button>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {/* SiteSettingsContext.Provider 로 임시 draft 설정 덮어씌우기 */}
              <SiteSettingsContext.Provider value={{ settings: draft, updateSettings }}>
                <div className="w-full relative pointer-events-none">
                  <Home />
                </div>
              </SiteSettingsContext.Provider>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 이 하단 부분은 Context의 임시 재정의를 위해 필요합니다
import { SiteSettingsContext } from '@/components/providers/SiteSettingsProvider';
