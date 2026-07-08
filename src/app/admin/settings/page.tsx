'use client';

import { useState } from 'react';
import { Settings, Eye, Save, X, Plus, Trash2 } from 'lucide-react';
import { useSiteSettings } from '@/components/providers/SiteSettingsProvider';
import { HomeSettings } from '@/data/homeContent';
import Home from '@/app/page';

export default function SiteSettingsPage() {
  const { settings, updateSettings } = useSiteSettings();
  const [draft, setDraft] = useState<HomeSettings>(settings);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleSave = () => {
    updateSettings(draft);
    alert('설정이 저장되었습니다.');
  };

  const handlePreview = () => {
    setIsPreviewOpen(true);
  };

  const updateDraft = (section: keyof HomeSettings, field: string, value: any) => {
    setDraft((prev) => {
      const sectionData = prev[section] as any;
      if (typeof sectionData === 'object' && sectionData !== null) {
        return {
          ...prev,
          [section]: {
            ...sectionData,
            [field]: value,
          },
        };
      }
      return {
        ...prev,
        [section]: value,
      };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-gray-400" />
            환경설정 (CMS)
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            홈페이지의 전체 콘텐츠를 관리하고 미리 볼 수 있습니다. (HTML 태그 사용 가능)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePreview}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium text-sm transition-colors"
          >
            <Eye className="w-4 h-4" />
            미리보기
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            저장
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 인트로 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">인트로 영상</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">영상 경로 (videoSrc)</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={draft.intro.videoSrc}
                onChange={(e) => updateDraft('intro', 'videoSrc', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* How to start 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">시작하는 3가지 방법 (How to Start)</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">제목 (Title)</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={2}
                value={draft.howToStart.title}
                onChange={(e) => updateDraft('howToStart', 'title', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">설명 (Description)</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={2}
                value={draft.howToStart.description}
                onChange={(e) => updateDraft('howToStart', 'description', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Audit 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">오딧(Audit) 안내</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">배지 텍스트 (Badge)</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={draft.audit.badge}
                onChange={(e) => updateDraft('audit', 'badge', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">메인 카피 (Title)</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono text-xs"
                rows={3}
                value={draft.audit.title}
                onChange={(e) => updateDraft('audit', 'title', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">서브 카피 제목 (Description Title)</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={draft.audit.descriptionTitle}
                onChange={(e) => updateDraft('audit', 'descriptionTitle', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">서브 카피 설명 (Description Text)</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={3}
                value={draft.audit.descriptionText}
                onChange={(e) => updateDraft('audit', 'descriptionText', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">서명 텍스트 (Signature)</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono text-xs"
                rows={2}
                value={draft.audit.signatureText}
                onChange={(e) => updateDraft('audit', 'signatureText', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">하단 배너 텍스트 (Banner Text)</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={draft.audit.bannerText}
                onChange={(e) => updateDraft('audit', 'bannerText', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Curation 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">맞춤 큐레이션 (Curation)</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">배지 텍스트 (Badge)</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={draft.curation.badge}
                onChange={(e) => updateDraft('curation', 'badge', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">메인 카피 (Title)</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={2}
                value={draft.curation.title}
                onChange={(e) => updateDraft('curation', 'title', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">설명 (Description)</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={4}
                value={draft.curation.description}
                onChange={(e) => updateDraft('curation', 'description', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">버튼 1 텍스트</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={draft.curation.button1Text}
                  onChange={(e) => updateDraft('curation', 'button1Text', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">버튼 2 텍스트</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={draft.curation.button2Text}
                  onChange={(e) => updateDraft('curation', 'button2Text', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 미리보기 모달 */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative w-full h-full bg-white flex flex-col overflow-hidden">
            {/* 상단 컨트롤 바 */}
            <div className="h-14 shrink-0 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 text-white shadow-lg">
              <div className="flex items-center gap-3">
                <span className="font-semibold flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-400" />
                  홈페이지 실시간 미리보기
                </span>
                <span className="text-sm text-gray-400">|</span>
                <span className="text-sm text-gray-400">현재 작성 중인 초안이 적용된 상태입니다.</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md text-sm font-medium transition-colors"
                >
                  에디터로 돌아가기
                  <X className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
            
            {/* 실제 홈페이지 미리보기 영역 */}
            <div className="flex-1 overflow-y-auto bg-[#F4F2EC]">
              <PreviewWrapper draft={draft} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 미리보기 화면을 렌더링하기 위해 SiteSettingsContext를 덮어씌우는 래퍼 컴포넌트
function PreviewWrapper({ draft }: { draft: HomeSettings }) {
  const { SiteSettingsContext } = require('@/components/providers/SiteSettingsProvider');
  
  // Context를 덮어씌워서 <Home /> 내부의 useSiteSettings가 draft를 반환하도록 함
  return (
    <div className="pointer-events-auto h-full">
      <SiteSettingsContext.Provider value={{ settings: draft, updateSettings: () => {} }}>
        <Home />
      </SiteSettingsContext.Provider>
    </div>
  );
}
