'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, ExternalLink, History, RotateCcw, Save, Send } from 'lucide-react';
import ErrorState from '@/components/admin-new/common/ErrorState';
import FormSection from '@/components/admin-new/common/FormSection';
import LoadingState from '@/components/admin-new/common/LoadingState';
import PageHeader from '@/components/admin-new/common/PageHeader';
import SaveBar from '@/components/admin-new/common/SaveBar';
import StatusBadge from '@/components/admin-new/common/StatusBadge';
import { getAtPath, setAtPath } from './contentPath';
import {
  fetchCmsPageEditor,
  importCmsPageFromSource,
  publishCmsPageDraft,
  restoreCmsPageVersion,
  saveCmsPageDraft,
} from './cmsPageClient';
import FieldEditor from './FieldEditor';
import type { CmsContent, CmsPageDefinition, CmsVersionSummary } from './types';

function publicRouteFor(definition: CmsPageDefinition): string {
  return definition.route === '/_site-shell' ? '/' : definition.route;
}

export default function PageEditorPage() {
  const params = useParams<{ pageKey: string }>();
  return <PageEditor key={params.pageKey} pageKey={params.pageKey} />;
}

function PageEditor({ pageKey }: { readonly pageKey: string }) {
  const [definition, setDefinition] = useState<CmsPageDefinition | null>(null);
  const [content, setContent] = useState<CmsContent>({});
  const [draftRevision, setDraftRevision] = useState<number | null>(null);
  const [publishedRevision, setPublishedRevision] = useState<number | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [versions, setVersions] = useState<readonly CmsVersionSummary[]>([]);
  const [activeSection, setActiveSection] = useState('');
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 공개 화면(/api/content/{pageKey})이 아직 CMS 게시본을 쓰지 않으면(404) 이 페이지는 "현재 값
  // 가져오기(최초 활성화)" 전이다 — 원래 audit 전용이던 게이트를 전 페이지로 일반화한다(fail-closed:
  // 확인 전에는 게시를 막는다).
  const [publicContentActive, setPublicContentActive] = useState<boolean | null>(null);

  const refreshPublicContentActive = (key: string): Promise<boolean> =>
    fetch(`/api/content/${encodeURIComponent(key)}`, { cache: 'no-store' })
      .then((response) => response.ok)
      .catch(() => false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchCmsPageEditor(pageKey), refreshPublicContentActive(pageKey)])
      .then(([result, active]) => {
        if (cancelled) return;
        setDefinition(result.definition);
        setContent(result.content);
        setDraftRevision(result.draftRevision);
        setPublishedRevision(result.publishedRevision);
        setPublishedAt(result.publishedAt);
        setHasUnpublishedChanges(result.hasUnpublishedChanges);
        setVersions(result.versions);
        setActiveSection(result.definition.sections[0]?.id ?? '');
        setDirty(false);
        setPublicContentActive(active);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '편집 화면을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pageKey]);

  const section = useMemo(
    () => definition?.sections.find((item) => item.id === activeSection) ?? null,
    [activeSection, definition],
  );

  const change = (path: string, value: unknown) => {
    setContent((current) => setAtPath(current, path, value));
    setDirty(true);
    setMessage(null);
    setError(null);
  };

  const persistDraft = async (): Promise<number | null> => {
    if (draftRevision === null) return null;
    const result = await saveCmsPageDraft({ pageKey, content, expectedRevision: draftRevision });
    if (typeof result.draftRevision !== 'number') throw new Error(result.message ?? '임시저장 응답이 올바르지 않습니다.');
    if (result.content) setContent(result.content);
    setDraftRevision(result.draftRevision);
    setHasUnpublishedChanges(true);
    setDirty(false);
    return result.draftRevision;
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const nextRevision = await persistDraft();
      if (nextRevision !== null) setMessage(`편집본 v${nextRevision}으로 임시저장했습니다.`);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : '임시저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const revision = dirty ? await persistDraft() : draftRevision;
      if (revision === null) return;
      const result = await publishCmsPageDraft({ pageKey, expectedRevision: revision });
      if (typeof result.publishedRevision !== 'number') throw new Error(result.message ?? '게시 응답이 올바르지 않습니다.');
      const nextPublishedRevision = result.publishedRevision;
      const nextPublishedAt = result.publishedAt ?? new Date().toISOString();
      setPublishedRevision(nextPublishedRevision);
      setPublishedAt(nextPublishedAt);
      setVersions((current) => [
        { revision: nextPublishedRevision, publishedAt: nextPublishedAt },
        ...current.filter((item) => item.revision !== nextPublishedRevision),
      ].slice(0, 10));
      setHasUnpublishedChanges(false);
      setMessage(`편집본 v${nextPublishedRevision}을 고객 화면에 게시했습니다.`);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : '게시하지 못했습니다.');
    } finally {
      setPublishing(false);
    }
  };

  const importCurrentValues = async () => {
    if (draftRevision === null) return;
    setImporting(true);
    setError(null);
    try {
      const result = await importCmsPageFromSource({ pageKey, expectedRevision: draftRevision });
      if (typeof result.publishedRevision !== 'number') throw new Error(result.message ?? '가져오기 응답이 올바르지 않습니다.');
      const nextPublishedRevision = result.publishedRevision;
      const nextPublishedAt = result.publishedAt ?? new Date().toISOString();
      setPublishedRevision(nextPublishedRevision);
      setPublishedAt(nextPublishedAt);
      setVersions((current) => [
        { revision: nextPublishedRevision, publishedAt: nextPublishedAt },
        ...current.filter((item) => item.revision !== nextPublishedRevision),
      ].slice(0, 10));
      setHasUnpublishedChanges(false);
      setMessage(`현재 값을 v${nextPublishedRevision}으로 가져와 고객 화면에 활성화했습니다.`);
      setPublicContentActive(await refreshPublicContentActive(pageKey));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : '현재 값을 가져오지 못했습니다.');
    } finally {
      setImporting(false);
    }
  };

  const restore = async (sourceRevision: number) => {
    if (draftRevision === null || saving || publishing || dirty) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await restoreCmsPageVersion({ pageKey, sourceRevision, expectedRevision: draftRevision });
      if (!result.content || typeof result.draftRevision !== 'number') throw new Error(result.message ?? '이전 게시본 응답이 올바르지 않습니다.');
      setContent(result.content);
      setDraftRevision(result.draftRevision);
      setHasUnpublishedChanges(true);
      setDirty(false);
      setMessage(`게시본 v${sourceRevision}을 편집본으로 불러왔습니다. 확인 후 게시해 주세요.`);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : '이전 게시본을 불러오지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="페이지 편집기를 불러오는 중입니다..." />;
  if (!definition) return <ErrorState title="편집 화면을 열 수 없습니다" message={error ?? 'CMS 페이지 정보를 찾지 못했습니다.'} />;

  const publicRoute = publicRouteFor(definition);
  const isBusy = saving || publishing || importing;
  // "현재 값 가져오기(최초 활성화)"가 끝나기 전에는 게시를 막는다 — 원래 audit 페이지에만 있던
  // 게이트를 CMS_PAGE_DEFINITIONS 전 페이지로 일반화한다(fail-closed: 확인 실패/불명은 차단).
  const publishBlockedByImport = publicContentActive !== true;
  const canSave = dirty && draftRevision !== null && !isBusy;
  const canImport = draftRevision !== null && !isBusy && !dirty && publicContentActive !== true;
  const canPublish = draftRevision !== null && !isBusy && !publishBlockedByImport && (dirty || hasUnpublishedChanges);

  return (
    <div className="space-y-6 pb-24">
      <Link href="/admin/pages" className="inline-flex min-h-10 items-center gap-2 text-[14px] font-semibold text-gray-600 hover:text-[#17201B]">
        <ArrowLeft className="size-4" />
        페이지 목록
      </Link>

      <PageHeader title={definition.title} description={`${definition.description} 임시저장은 공개되지 않고, 게시 후 고객 화면에 반영됩니다.`}>
        <Link href={publicRoute} target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-[14px] font-medium text-gray-700 hover:bg-gray-50">
          <ExternalLink className="size-4" />
          현재 공개화면
        </Link>
        <button type="button" onClick={() => void save()} disabled={!canSave} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-[14px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <Save className="size-4" />
          {saving ? '저장 중...' : '임시저장'}
        </button>
        <button type="button" onClick={() => void importCurrentValues()} disabled={!canImport} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-[14px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <Download className="size-4" />
          {importing ? '가져오는 중...' : '현재 값 가져오기(최초 활성화)'}
        </button>
        <button type="button" onClick={() => void publish()} disabled={!canPublish} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#2F3B34] px-4 text-[14px] font-medium text-white hover:bg-[#1f2823] disabled:opacity-50">
          <Send className="size-4" />
          {publishing ? '게시 중...' : '게시'}
        </button>
      </PageHeader>

      <section className="flex flex-wrap items-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-3 text-[14px]">
        <StatusBadge status={dirty || hasUnpublishedChanges ? 'warning' : 'success'} label={dirty || hasUnpublishedChanges ? '게시 대기' : '게시 완료'} />
        <span className="font-semibold text-[#17201B]">편집본 v{draftRevision ?? '없음'}</span>
        <span className="text-gray-300">/</span>
        <span className="font-semibold text-[#17201B]">게시본 v{publishedRevision ?? '없음'}</span>
        {publishedAt && <span className="text-gray-500">최근 게시 {new Date(publishedAt).toLocaleString('ko-KR')}</span>}
        {message && <span className="text-[#2F7A4F]">{message}</span>}
        {error && <span role="alert" className="font-medium text-[#A65348]">{error}</span>}
      </section>

      <div role="alert" className="rounded-md border border-[#D8C4A3] bg-[#FFF8E8] px-5 py-4 text-[14px] leading-6 text-[#5E4A28]">
        {publicContentActive === true
          ? '공개 화면은 CMS 게시 경로가 활성화되어 있습니다. 임시저장 후 게시하면 고객 화면에 반영됩니다.'
          : '공개 화면은 아직 CMS 게시 경로를 쓰지 않습니다. "현재 값 가져오기(최초 활성화)"를 먼저 완료해야 게시할 수 있습니다 — 완료 전까지 임시저장은 가능하지만 게시는 막아 두었습니다.'}
      </div>

      <details className="rounded-md border border-gray-200 bg-white">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-[14px] font-semibold text-[#17201B]">
          <History className="size-4" />
          이전 게시본 · {versions.length}개
        </summary>
        <div className="border-t border-gray-200 p-4">
          <p className="mb-3 text-[13px] leading-5 text-gray-500">이전 게시본은 공개 화면에 바로 반영되지 않고 편집본으로만 불러옵니다.</p>
          <div className="flex flex-wrap gap-2">
            {versions.map((version) => (
              <button key={version.revision} type="button" onClick={() => void restore(version.revision)} disabled={isBusy || dirty} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-[13px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                <RotateCcw className="size-4" />
                v{version.revision} · {new Date(version.publishedAt).toLocaleDateString('ko-KR')}
              </button>
            ))}
            {versions.length === 0 && <p className="text-[14px] text-gray-500">아직 보관된 게시본이 없습니다.</p>}
          </div>
        </div>
      </details>

      <div className="grid min-h-[620px] gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-md border border-gray-200 bg-white p-3">
          <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">화면 영역</p>
          <div className="space-y-1">
            {definition.sections.map((item) => (
              <button key={item.id} type="button" onClick={() => setActiveSection(item.id)} className={`w-full rounded-md px-3 py-3 text-left text-[14px] font-semibold transition-colors ${activeSection === item.id ? 'bg-[#F3EEE6] text-[#17201B]' : 'text-gray-600 hover:bg-[#FAF8F3]'}`}>
                {item.label}
              </button>
            ))}
            {definition.sections.length === 0 && <p className="px-3 py-3 text-[13px] leading-5 text-gray-500">구조화 필드가 아직 준비되지 않았습니다.</p>}
          </div>
        </aside>

        {section ? (
          <FormSection title={section.label} description={section.description}>
            <fieldset disabled={isBusy} className="space-y-6 disabled:opacity-60">
              {section.fields.map((field) => (
                <FieldEditor key={field.path} field={field} pageKey={pageKey} value={getAtPath(content, field.path)} onChange={(value) => change(field.path, value)} />
              ))}
            </fieldset>
          </FormSection>
        ) : (
          <FormSection title="편집 준비 중" description="이 화면은 목록과 게시 상태만 준비되어 있고 구조화 필드는 아직 연결되지 않았습니다.">
            <p className="text-[14px] leading-6 text-gray-500">Foundation 정의에 sections가 추가되면 이 편집기에서 자동으로 입력 필드가 표시됩니다.</p>
          </FormSection>
        )}
      </div>

      <SaveBar
        isDirty={dirty}
        isVisible={dirty}
        isSaving={saving}
        disabled={!canSave}
        onSave={() => void save()}
        saveLabel="임시저장"
        message="게시 전 편집본으로만 저장됩니다."
      >
        <button type="button" onClick={() => void publish()} disabled={!canPublish} className="rounded-md border border-[#2F3B34] px-4 py-2 text-[14px] font-medium text-[#2F3B34] disabled:opacity-50">
          저장 후 게시
        </button>
      </SaveBar>
    </div>
  );
}
