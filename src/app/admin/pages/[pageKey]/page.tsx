'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, ExternalLink, History, Plus, RotateCcw, Save, Send, Trash2 } from 'lucide-react';
import { AdminPageHeader, AdminStatusBadge } from '@/components/admin/AdminUi';
import ImageUploader from '@/components/admin-new/common/ImageUploader';
import { getCmsPageDefinition, type CmsFieldDefinition, type CmsLinkItem, type CmsPageDefinition } from '@/lib/cms/pageDefinitions';
import BrandManager from '@/app/admin/brands/page';

type Content = Record<string, unknown>;

function isObject(value: unknown): value is Content {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getAtPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => isObject(current) ? current[key] : undefined, source);
}

function setAtPath(source: Content, path: string, value: unknown): Content {
  const next = structuredClone(source);
  const keys = path.split('.');
  let current = next;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) current[key] = value;
    else {
      if (!isObject(current[key])) current[key] = {};
      current = current[key] as Content;
    }
  });
  return next;
}

interface EditorResponse {
  definition: CmsPageDefinition;
  content: Content;
  draftRevision: number;
  publishedRevision: number | null;
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
  versions: Array<{ revision: number; publishedAt: string }>;
}

export default function AdminPageEditor() {
  const params = useParams<{ pageKey: string }>();
  const pageKey = params.pageKey;
  const [definition, setDefinition] = useState<CmsPageDefinition | null>(null);
  const [content, setContent] = useState<Content>({});
  const [draftRevision, setDraftRevision] = useState<number | null>(null);
  const [publishedRevision, setPublishedRevision] = useState<number | null>(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [versions, setVersions] = useState<Array<{ revision: number; publishedAt: string }>>([]);
  const [activeSection, setActiveSection] = useState('');
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const knownDefinition = useMemo(() => getCmsPageDefinition(pageKey), [pageKey]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/settings/pages/${encodeURIComponent(pageKey)}`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error((result as { message?: string }).message || '편집 화면을 불러오지 못했습니다.');
        }
        return result as EditorResponse;
      })
      .then((result) => {
        if (cancelled) return;
        setDefinition(result.definition);
        setContent(result.content);
        setDraftRevision(result.draftRevision);
        setPublishedRevision(result.publishedRevision);
        setHasUnpublishedChanges(result.hasUnpublishedChanges);
        setVersions(result.versions ?? []);
        const requestedSection = window.location.hash.replace(/^#/, '');
        setActiveSection(
          result.definition.sections.some((item) => item.id === requestedSection)
            ? requestedSection
            : result.definition.sections[0]?.id ?? '',
        );
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '편집 화면을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
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

  const saveDraft = async (): Promise<number | null> => {
    if (draftRevision === null || !definition) return null;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/settings/pages/${encodeURIComponent(pageKey)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, expectedRevision: draftRevision }),
      });
      const result = await response.json().catch(() => ({})) as { draftRevision?: number; content?: Content; message?: string };
      if (!response.ok || typeof result.draftRevision !== 'number') throw new Error(result.message || '임시저장하지 못했습니다.');
      if (result.content) setContent(result.content);
      setDraftRevision(result.draftRevision);
      setHasUnpublishedChanges(true);
      setDirty(false);
      setMessage(`편집본 v${result.draftRevision}으로 임시저장했습니다.`);
      return result.draftRevision;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '임시저장하지 못했습니다.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (draftRevision === null || !definition) return;
    setPublishing(true);
    setError(null);
    try {
      const revision = dirty ? await saveDraft() : draftRevision;
      if (revision === null) return;
      const response = await fetch(`/api/admin/settings/pages/${encodeURIComponent(pageKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedRevision: revision }),
      });
      const result = await response.json().catch(() => ({})) as { publishedRevision?: number; message?: string };
      if (!response.ok || typeof result.publishedRevision !== 'number') throw new Error(result.message || '게시하지 못했습니다.');
      setPublishedRevision(result.publishedRevision);
      setVersions((current) => [
        { revision: result.publishedRevision!, publishedAt: new Date().toISOString() },
        ...current.filter((item) => item.revision !== result.publishedRevision),
      ].slice(0, 10));
      setHasUnpublishedChanges(false);
      setMessage(`편집본 v${result.publishedRevision}을 고객 화면에 게시했습니다.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '게시하지 못했습니다.');
    } finally {
      setPublishing(false);
    }
  };

  const restoreVersion = async (sourceRevision: number) => {
    if (draftRevision === null || saving || publishing) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/settings/pages/${encodeURIComponent(pageKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedRevision: draftRevision, sourceRevision }),
      });
      const result = await response.json().catch(() => ({})) as { content?: Content; draftRevision?: number; message?: string };
      if (!response.ok || !result.content || typeof result.draftRevision !== 'number') {
        throw new Error(result.message || '이전 게시본을 불러오지 못했습니다.');
      }
      setContent(result.content);
      setDraftRevision(result.draftRevision);
      setHasUnpublishedChanges(true);
      setDirty(false);
      setMessage(`게시본 v${sourceRevision}을 편집본으로 불러왔습니다. 확인 후 게시해 주세요.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '이전 게시본을 불러오지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="border border-[#E7E0D5] bg-white p-12 text-center text-sm text-[#6F766F]">편집 화면을 불러오는 중입니다…</div>;
  if (!definition) {
    const unavailableRoute = knownDefinition?.route === '/_site-shell' ? '/' : knownDefinition?.route;
    return (
      <div className="space-y-7">
        <Link href="/admin/pages" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#59615B] hover:text-[#17211D]">
          <ArrowLeft className="size-4" /> 전체 화면 관리로 돌아가기
        </Link>
        <AdminPageHeader
          eyebrow="PAGE EDITOR"
          title={knownDefinition?.title ?? '화면 편집'}
          description={knownDefinition?.description ?? '고객 홈페이지 화면의 문구와 이미지를 관리합니다.'}
          actions={unavailableRoute ? (
            <Link href={unavailableRoute} target="_blank" className="btn-secondary min-h-11 gap-2 px-4">
              <ExternalLink className="size-4" /> 현재 고객 화면 보기
            </Link>
          ) : undefined}
        />
        <div role="alert" className="border border-[#D8C4A3] bg-[#FFF8E8] p-6 text-[#5E4A28] sm:p-8">
          <h2 className="text-lg font-bold text-[#17211D]">편집 내용을 불러오지 못했습니다</h2>
          <p className="mt-3 break-keep text-sm leading-7">
            로그인 상태나 네트워크 연결을 확인한 뒤 새로고침해 주세요. CMS 전용 표가 아직 없는 환경은 기존 사이트 설정 저장소로 자동 연결되므로 정상적인 경우에는 아래 안내가 아니라 실제 입력칸이 표시됩니다.
          </p>
          {error && <p className="mt-4 border-t border-[#E3D6BF] pt-4 text-sm font-semibold text-[#A65348]">오류 내용: {error}</p>}
          {knownDefinition && (
            <p className="mt-5 border-t border-[#E3D6BF] pt-4 text-xs leading-6 text-[#6F5B38]">
              이 화면에서 관리하는 영역: {knownDefinition.sections.map((item) => item.label).join(' · ')}
            </p>
          )}
        </div>
        {pageKey === 'brands' && (
          <section className="border border-[#E7E0D5] bg-white p-5 sm:p-7">
            <div className="mb-6 border-b border-[#E7E0D5] pb-5">
              <h2 className="text-lg font-semibold text-[#17211D]">5. 브랜드 카드·상세</h2>
              <p className="mt-1 text-sm leading-6 text-[#6F766F]">이 영역은 기존 브랜드 DB를 사용하므로 여기서 바로 등록·수정·삭제·노출 관리할 수 있습니다.</p>
            </div>
            <BrandManager />
          </section>
        )}
      </div>
    );
  }

  const publicRoute = definition.route === '/_site-shell' ? '/' : definition.route;

  return (
    <div className="space-y-7">
      <Link href="/admin/pages" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#59615B] hover:text-[#17211D]">
        <ArrowLeft className="size-4" /> 페이지 목록
      </Link>
      <AdminPageHeader
        eyebrow="PAGE EDITOR"
        title={definition.title}
        description={`${definition.description} 임시저장은 고객 화면에 바로 보이지 않으며, 게시 버튼을 눌러야 반영됩니다.`}
        actions={<>
          <Link href={publicRoute} target="_blank" className="btn-secondary min-h-11 gap-2 px-4"><ExternalLink className="size-4" /> 현재 공개화면</Link>
          <button type="button" onClick={() => void saveDraft()} disabled={!dirty || saving || publishing} className="btn-secondary min-h-11 gap-2 px-4 disabled:cursor-not-allowed disabled:opacity-40"><Save className="size-4" />{saving ? '저장 중…' : '임시저장'}</button>
          <button type="button" onClick={() => void publish()} disabled={saving || publishing || (!dirty && !hasUnpublishedChanges)} className="btn-primary min-h-11 gap-2 px-4 disabled:cursor-not-allowed disabled:opacity-40"><Send className="size-4" />{publishing ? '게시 중…' : '고객 화면에 게시'}</button>
        </>}
      />

      <div className="flex flex-wrap items-center gap-3 border border-[#E7E0D5] bg-white px-4 py-3 text-sm">
        <AdminStatusBadge tone={dirty || hasUnpublishedChanges ? 'warning' : 'success'}>{dirty || hasUnpublishedChanges ? '게시되지 않은 변경 있음' : '게시 완료'}</AdminStatusBadge>
        <span className="font-semibold text-[#17211D]">게시본 v{publishedRevision ?? '없음'}</span>
        <span className="text-[#9AA39B]">/</span>
        <span className="font-semibold text-[#17211D]">편집본 v{draftRevision}</span>
        {message && <span className="text-[#2F6B45]">{message}</span>}
        {error && <span role="alert" className="font-medium text-[#A65348]">{error}</span>}
      </div>

      <details className="border border-[#E7E0D5] bg-white">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-[#17211D]">
          <History className="size-4" /> 이전 게시본 보기 · {versions.length}개
        </summary>
        <div className="border-t border-[#E7E0D5] p-4">
          <p className="mb-3 text-xs leading-5 text-[#6F766F]">이전 게시본을 선택하면 바로 공개되지 않고 편집본으로 불러옵니다. 내용을 확인한 뒤 ‘고객 화면에 게시’를 눌러야 반영됩니다.</p>
          <div className="flex flex-wrap gap-2">
            {versions.map((version) => (
              <button key={version.revision} type="button" onClick={() => void restoreVersion(version.revision)} disabled={saving || publishing} className="btn-secondary min-h-10 gap-2 px-3 text-xs disabled:opacity-40">
                <RotateCcw className="size-3.5" /> v{version.revision} · {new Date(version.publishedAt).toLocaleDateString('ko-KR')}
              </button>
            ))}
            {versions.length === 0 && <p className="text-sm text-[#8A918B]">아직 보관된 게시본이 없습니다.</p>}
          </div>
        </div>
      </details>

      <div className="grid min-h-[620px] gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border border-[#E7E0D5] bg-white p-3">
          <p className="px-3 py-2 text-[11px] font-bold tracking-[0.14em] text-[#8A918B]">화면 영역</p>
          <div className="space-y-1">
            {definition.sections.map((item) => (
              <button key={item.id} type="button" onClick={() => setActiveSection(item.id)} className={`w-full px-3 py-3 text-left text-sm font-semibold transition-colors ${activeSection === item.id ? 'bg-[#F3EEE6] text-[#17211D]' : 'text-[#59615B] hover:bg-[#FAF8F3]'}`}>
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <section className="border border-[#E7E0D5] bg-white">
          <header className="border-b border-[#E7E0D5] px-5 py-5 sm:px-7">
            <h2 className="text-lg font-semibold text-[#17211D]">{section?.label}</h2>
            <p className="mt-1 text-sm leading-6 text-[#6F766F]">{section?.description}</p>
          </header>
          <div className="max-w-4xl space-y-6 p-5 sm:p-7">
            {section?.fields.map((field) => (
              <FieldEditor key={field.path} field={field} value={getAtPath(content, field.path)} onChange={(value) => change(field.path, value)} pageKey={pageKey} />
            ))}
          </div>
          {pageKey === 'brands' && activeSection === 'brandRecords' && (
            <div className="border-t border-[#E7E0D5] p-5 sm:p-7">
              <BrandManager />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FieldEditor({ field, value, onChange, pageKey }: { field: CmsFieldDefinition; value: unknown; onChange: (value: unknown) => void; pageKey: string }) {
  if (field.type === 'boolean') {
    return (
      <label className="flex cursor-pointer items-center justify-between gap-5 border border-[#E7E0D5] bg-[#FAF8F3] p-4">
        <span><span className="block text-sm font-semibold text-[#17211D]">{field.label}</span>{field.description && <span className="mt-1 block text-xs leading-5 text-[#6F766F]">{field.description}</span>}</span>
        <input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} className="size-5 accent-[#17211D]" />
      </label>
    );
  }

  if (field.type === 'image') {
    return <ImageUploader value={typeof value === 'string' ? value : ''} onChange={(urlValue) => onChange(urlValue)} domain="banner" usage="hero" draftId={`cms-${pageKey}`} label={field.label} description={field.description ?? '권장 형식: JPG, PNG, WEBP · 최대 8MB'} height="260px" />;
  }

  if (field.type === 'link-list') {
    const items = Array.isArray(value) ? value as CmsLinkItem[] : [];
    return <LinkListEditor label={field.label} description={field.description} items={items} onChange={onChange} />;
  }

  if (field.type === 'item-list') {
    const items = Array.isArray(value) ? value.filter(isObject) : [];
    return <ItemListEditor field={field} items={items} onChange={onChange} pageKey={pageKey} />;
  }

  const stringValue = typeof value === 'string' ? value : '';
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-[#17211D]">{field.label}</span>
      {field.description && <span className="mt-1 block text-xs leading-5 text-[#6F766F]">{field.description}</span>}
      {field.type === 'textarea' ? (
        <textarea value={stringValue} onChange={(event) => onChange(event.target.value)} rows={5} className="mt-2 w-full border border-[#D9DDD9] bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:border-[#A8742E]" />
      ) : (
        <input type={field.type === 'url' ? 'text' : 'text'} value={stringValue} onChange={(event) => onChange(event.target.value)} placeholder={field.type === 'url' ? '/shop 또는 https://…' : field.placeholder} className="mt-2 min-h-11 w-full border border-[#D9DDD9] bg-white px-3 text-sm outline-none focus:border-[#A8742E]" />
      )}
    </label>
  );
}

function ItemListEditor({
  field,
  items,
  onChange,
  pageKey,
}: {
  field: CmsFieldDefinition;
  items: Content[];
  onChange: (items: Content[]) => void;
  pageKey: string;
}) {
  const itemFields = field.itemFields ?? [];
  const update = (index: number, key: string, value: unknown) => {
    onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  };
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const add = () => {
    const next: Content = {};
    for (const itemField of itemFields) {
      next[itemField.key] = itemField.defaultValue ?? (itemField.type === 'boolean' ? true : itemField.options?.[0]?.value ?? '');
    }
    onChange([...items, next]);
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#17211D]">{field.label}</p>
          {field.description && <p className="mt-1 text-xs leading-5 text-[#6F766F]">{field.description}</p>}
        </div>
        <button type="button" onClick={add} className="btn-secondary min-h-10 gap-2 px-3 text-xs">
          <Plus className="size-4" /> {field.addLabel ?? '항목 추가'}
        </button>
      </div>
      <div className="mt-3 space-y-4">
        {items.length === 0 && (
          <div className="border border-dashed border-[#D9DDD9] p-6 text-center text-sm text-[#8A918B]">
            등록된 항목이 없습니다. ‘항목 추가’를 눌러 시작하세요.
          </div>
        )}
        {items.map((item, index) => (
          <article key={index} className="border border-[#E7E0D5] bg-[#FAF8F3] p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#E7E0D5] pb-3">
              <p className="text-sm font-semibold text-[#17211D]">{index + 1}번째 항목</p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="위로 이동" className="inline-flex size-10 items-center justify-center border border-[#D9DDD9] bg-white disabled:opacity-30"><ArrowUp className="size-4" /></button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="아래로 이동" className="inline-flex size-10 items-center justify-center border border-[#D9DDD9] bg-white disabled:opacity-30"><ArrowDown className="size-4" /></button>
                <button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label="항목 삭제" className="inline-flex size-10 items-center justify-center border border-[#DFC8C4] bg-white text-[#A65348]"><Trash2 className="size-4" /></button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {itemFields.map((itemField) => {
                const itemValue = item[itemField.key];
                if (itemField.type === 'boolean') {
                  return (
                    <label key={itemField.key} className="flex min-h-11 cursor-pointer items-center gap-3 border border-[#D9DDD9] bg-white px-3 text-sm font-semibold text-[#59615B]">
                      <input type="checkbox" checked={itemValue === true} onChange={(event) => update(index, itemField.key, event.target.checked)} className="size-4 accent-[#17211D]" />
                      {itemField.label}
                    </label>
                  );
                }
                if (itemField.type === 'image') {
                  return (
                    <div key={itemField.key} className="sm:col-span-2">
                      <ImageUploader
                        value={typeof itemValue === 'string' ? itemValue : ''}
                        onChange={(nextValue) => update(index, itemField.key, nextValue)}
                        domain="banner"
                        usage="hero"
                        draftId={`cms-${pageKey}-${field.path}-${index}`}
                        label={itemField.label}
                        description={itemField.description ?? '카드에 표시할 이미지를 선택하세요.'}
                        height="200px"
                      />
                    </div>
                  );
                }
                if (itemField.type === 'select') {
                  return (
                    <label key={itemField.key} className="block">
                      <span className="block text-xs font-semibold text-[#59615B]">{itemField.label}</span>
                      {itemField.description && <span className="mt-1 block text-xs leading-5 text-[#8A918B]">{itemField.description}</span>}
                      <select value={typeof itemValue === 'string' ? itemValue : ''} onChange={(event) => update(index, itemField.key, event.target.value)} className="mt-1 min-h-10 w-full border border-[#D9DDD9] bg-white px-3 text-sm">
                        <option value="">선택하세요</option>
                        {itemField.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                  );
                }
                const stringValue = typeof itemValue === 'string' ? itemValue : '';
                return (
                  <label key={itemField.key} className={itemField.type === 'textarea' ? 'block sm:col-span-2' : 'block'}>
                    <span className="block text-xs font-semibold text-[#59615B]">{itemField.label}</span>
                    {itemField.description && <span className="mt-1 block text-xs leading-5 text-[#8A918B]">{itemField.description}</span>}
                    {itemField.type === 'textarea' ? (
                      <textarea value={stringValue} onChange={(event) => update(index, itemField.key, event.target.value)} rows={4} className="mt-1 w-full border border-[#D9DDD9] bg-white px-3 py-2 text-sm leading-6" />
                    ) : (
                      <input value={stringValue} onChange={(event) => update(index, itemField.key, event.target.value)} placeholder={itemField.type === 'url' ? '/경로 또는 https://…' : itemField.placeholder} className="mt-1 min-h-10 w-full border border-[#D9DDD9] bg-white px-3 text-sm" />
                    )}
                  </label>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function LinkListEditor({ label, description, items, onChange }: { label: string; description?: string; items: CmsLinkItem[]; onChange: (items: CmsLinkItem[]) => void }) {
  const update = (index: number, patch: Partial<CmsLinkItem>) => onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div><p className="text-sm font-semibold text-[#17211D]">{label}</p>{description && <p className="mt-1 text-xs leading-5 text-[#6F766F]">{description}</p>}</div>
        <button type="button" onClick={() => onChange([...items, { label: '새 메뉴', href: '/', visible: true }])} className="btn-secondary min-h-10 gap-2 px-3 text-xs"><Plus className="size-4" /> 메뉴 추가</button>
      </div>
      <div className="mt-3 space-y-3">
        {items.length === 0 && <div className="border border-dashed border-[#D9DDD9] p-6 text-center text-sm text-[#8A918B]">등록된 메뉴가 없습니다. ‘메뉴 추가’를 눌러 시작하세요.</div>}
        {items.map((item, index) => (
          <div key={`${index}-${item.href}`} className="grid gap-3 border border-[#E7E0D5] bg-[#FAF8F3] p-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
            <label><span className="text-xs font-semibold text-[#59615B]">메뉴 이름</span><input value={item.label} onChange={(event) => update(index, { label: event.target.value })} className="mt-1 min-h-10 w-full border border-[#D9DDD9] bg-white px-3 text-sm" /></label>
            <label><span className="text-xs font-semibold text-[#59615B]">연결 주소</span><input value={item.href} onChange={(event) => update(index, { href: event.target.value })} className="mt-1 min-h-10 w-full border border-[#D9DDD9] bg-white px-3 text-sm" /></label>
            <div className="flex items-center gap-1">
              <label className="mr-2 flex min-h-10 items-center gap-2 text-xs font-semibold text-[#59615B]"><input type="checkbox" checked={item.visible} onChange={(event) => update(index, { visible: event.target.checked })} className="size-4 accent-[#17211D]" />표시</label>
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="위로 이동" className="inline-flex size-10 items-center justify-center border border-[#D9DDD9] bg-white disabled:opacity-30"><ArrowUp className="size-4" /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="아래로 이동" className="inline-flex size-10 items-center justify-center border border-[#D9DDD9] bg-white disabled:opacity-30"><ArrowDown className="size-4" /></button>
              <button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label="메뉴 삭제" className="inline-flex size-10 items-center justify-center border border-[#DFC8C4] bg-white text-[#A65348]"><Trash2 className="size-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
