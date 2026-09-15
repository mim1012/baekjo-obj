'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, RotateCcw, Save, Search } from 'lucide-react';
import {
  defaultPageTextSettings,
  normalizePageTextSettings,
  pageTextDefinitions,
  type PageTextSettings,
} from '@/data/pageTextContent';

export default function PageTextSettingsEditor() {
  const [settings, setSettings] = useState<PageTextSettings>(defaultPageTextSettings);
  const [selectedPageId, setSelectedPageId] = useState('common');
  const [query, setQuery] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/page-texts', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`page-texts ${response.status}`);
        return response.json() as Promise<{ settings?: unknown }>;
      })
      .then((payload) => {
        if (cancelled || !payload.settings) return;
        setSettings(normalizePageTextSettings(payload.settings));
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

  const visiblePages = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return pageTextDefinitions;
    return pageTextDefinitions.filter((page) =>
      `${page.label} ${page.path}`.toLowerCase().includes(normalized),
    );
  }, [query]);

  const selectedPage = pageTextDefinitions.find((page) => page.id === selectedPageId)
    ?? pageTextDefinitions[0];

  const updateValue = (key: string, value: string) => {
    if (!loaded || selectedPage.id === 'audit') return;
    setDirty(true);
    setMessage('');
    setSettings((current) => ({
      ...current,
      values: { ...current.values, [key]: value },
    }));
  };

  const resetSelectedPage = () => {
    if (!loaded || selectedPage.id === 'audit') return;
    setDirty(true);
    setMessage('');
    setSettings((current) => {
      const values = { ...current.values };
      for (const item of selectedPage.fields) {
        const key = `${selectedPage.id}.${item.id}`;
        values[key] = defaultPageTextSettings.values[key];
      }
      return { ...current, values };
    });
  };

  const save = async () => {
    if (!loaded || !dirty || saving) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/page-texts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error(`save ${response.status}`);
      setDirty(false);
      setMessage('전체 페이지 문구를 저장했습니다. 고객 화면을 새로고침하면 반영됩니다.');
    } catch {
      setMessage('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section data-page-text-editor className="border border-[#E7E0D5] bg-white">
      <div className="flex flex-col gap-4 border-b border-[#E7E0D5] bg-[#FAF8F3] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#17211D]">전체 페이지 텍스트</h2>
          <p className="mt-1 text-sm leading-6 text-[#59615B]">
            공통 메뉴와 고객 페이지 문구를 수정합니다. 홈은 아래의 홈 섹션 설정에서, 브랜드 상세는 각 브랜드의 상세 편집에서 수정합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetSelectedPage}
            disabled={!loaded || selectedPage.id === 'audit'}
            className="inline-flex min-h-11 items-center gap-2 border border-[#D8D0C3] bg-white px-4 text-sm font-semibold text-[#17211D] disabled:opacity-50"
          >
            <RotateCcw className="size-4" /> 현재 페이지 기본값
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!loaded || !dirty || saving}
            className="inline-flex min-h-11 items-center gap-2 bg-[#17211D] px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Save className="size-4" /> {saving ? '저장 중…' : '전체 페이지 문구 저장'}
          </button>
        </div>
      </div>

      {loadError && (
        <p role="alert" className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700">
          저장된 문구를 불러오지 못해 편집을 차단했습니다. 새로고침 후 다시 시도해 주세요.
        </p>
      )}
      {message && (
        <p role="status" className="border-b border-[#D8C4A3] bg-[#F6F1E8] px-5 py-3 text-sm font-semibold text-[#6D522B]">
          {message}
        </p>
      )}

      <div className="grid min-h-[520px] lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-[#E7E0D5] p-4 lg:border-b-0 lg:border-r">
          <label className="relative block">
            <span className="sr-only">페이지 검색</span>
            <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[#7A817B]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="페이지 검색"
              className="min-h-11 w-full border border-[#D8D0C3] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#17211D]"
            />
          </label>
          <div className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
            {visiblePages.map((page) => (
              <button
                type="button"
                key={page.id}
                onClick={() => setSelectedPageId(page.id)}
                className={`w-full px-3 py-2.5 text-left text-sm ${selectedPage.id === page.id ? 'bg-[#F3EEE6] font-bold text-[#17211D]' : 'text-[#59615B] hover:bg-[#FAF8F3]'}`}
              >
                <span className="block">{page.label}</span>
                <span className="mt-0.5 block text-[11px] font-normal text-[#858B86]">{page.path}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="p-5 md:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E0D5] pb-4">
            <div>
              <h3 className="text-xl font-bold text-[#17211D]">{selectedPage.label}</h3>
              <p className="mt-1 text-xs text-[#747B75]">{selectedPage.path} · {selectedPage.fields.length}개 문구</p>
            </div>
            {selectedPage.path !== '*' && !selectedPage.path.includes('[') && (
              <Link
                href={selectedPage.path}
                target="_blank"
                className="inline-flex min-h-10 items-center gap-2 border border-[#D8D0C3] px-3 text-xs font-semibold text-[#17211D]"
              >
                고객 화면 열기 <ExternalLink className="size-3.5" />
              </Link>
            )}
          </div>

          {selectedPage.id === 'audit' ? (
            <div className="space-y-4 text-sm leading-6 text-[#59615B]">
              <p>Audit 문구는 페이지 관리에서 초안을 작성하고 발행합니다. 기존 문구 이관이 완료되기 전에는 현재 고객 화면이 유지됩니다.</p>
              <Link href="/admin/pages/audit" className="inline-flex min-h-11 items-center border border-[#D8D0C3] px-4 font-semibold text-[#17211D]">Audit 페이지 편집 열기</Link>
            </div>
          ) : <div className="space-y-5">
            {selectedPage.fields.map((item) => {
              const key = `${selectedPage.id}.${item.id}`;
              const value = settings.values[key] ?? item.defaultValue;
              return (
                <label key={key} className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-[#59615B]">{item.label}</span>
                  {item.multiline || value.length > 120 ? (
                    <textarea
                      value={value}
                      onChange={(event) => updateValue(key, event.target.value)}
                      disabled={!loaded}
                      maxLength={20_000}
                      rows={Math.min(12, Math.max(3, value.split('\n').length + 1))}
                      className="w-full border border-[#D1D0C8] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#17211D] disabled:bg-gray-50"
                    />
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(event) => updateValue(key, event.target.value)}
                      disabled={!loaded}
                      maxLength={20_000}
                      className="min-h-11 w-full border border-[#D1D0C8] bg-white px-3 text-sm outline-none focus:border-[#17211D] disabled:bg-gray-50"
                    />
                  )}
                  <span className="mt-1 block text-[11px] text-[#8A908B]">기본값: {item.defaultValue || '(빈 문구)'}</span>
                </label>
              );
            })}
          </div>}
        </div>
      </div>
    </section>
  );
}
