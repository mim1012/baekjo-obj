import type {
  CmsContent,
  CmsDraftResponse,
  CmsEditorResponse,
  CmsPageState,
  CmsPublishResponse,
} from './types';

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}));
}

function messageFrom(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string') {
    return payload.message;
  }
  return fallback;
}

export async function fetchCmsPageStates(): Promise<readonly CmsPageState[]> {
  const response = await fetch('/api/admin/settings/pages', { cache: 'no-store' });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(messageFrom(payload, '페이지 목록을 불러오지 못했습니다.'));
  if (!payload || typeof payload !== 'object' || !('pages' in payload) || !Array.isArray(payload.pages)) {
    throw new Error('페이지 목록 응답 형식이 올바르지 않습니다.');
  }
  return payload.pages as readonly CmsPageState[];
}

export async function fetchCmsPageEditor(pageKey: string): Promise<CmsEditorResponse> {
  const response = await fetch(`/api/admin/settings/pages/${encodeURIComponent(pageKey)}`, { cache: 'no-store' });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(messageFrom(payload, '편집 화면을 불러오지 못했습니다.'));
  return payload as CmsEditorResponse;
}

export async function saveCmsPageDraft(input: {
  readonly pageKey: string;
  readonly content: CmsContent;
  readonly expectedRevision: number;
}): Promise<CmsDraftResponse> {
  const response = await fetch(`/api/admin/settings/pages/${encodeURIComponent(input.pageKey)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: input.content,
      expectedRevision: input.expectedRevision,
    }),
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(messageFrom(payload, '임시저장하지 못했습니다.'));
  return payload as CmsDraftResponse;
}

export async function publishCmsPageDraft(input: {
  readonly pageKey: string;
  readonly expectedRevision: number;
}): Promise<CmsPublishResponse> {
  const response = await fetch(`/api/admin/settings/pages/${encodeURIComponent(input.pageKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedRevision: input.expectedRevision }),
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(messageFrom(payload, '게시하지 못했습니다.'));
  return payload as CmsPublishResponse;
}

/**
 * 범용 "현재 값 가져오기(최초 활성화)" — 서버가 등록된 소스 매퍼로 계산한 콘텐츠를 활성화한다.
 * 클라이언트는 content를 보내지 않는다(서버 계산값만 신뢰, D1). 아직 소스 매퍼가 연결되지
 * 않은 페이지는 서버가 409 source-mapper-not-ready로 거절하며, 그 한국어 안내 문구는
 * 서버 응답의 message 필드를 그대로 보여준다(클라이언트에서 별도 매핑하지 않음).
 */
export async function importCmsPageFromSource(input: {
  readonly pageKey: string;
  readonly expectedRevision: number;
}): Promise<CmsPublishResponse> {
  const response = await fetch(`/api/admin/settings/pages/${encodeURIComponent(input.pageKey)}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedRevision: input.expectedRevision }),
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(messageFrom(payload, '현재 값을 가져오지 못했습니다.'));
  return payload as CmsPublishResponse;
}

export async function restoreCmsPageVersion(input: {
  readonly pageKey: string;
  readonly expectedRevision: number;
  readonly sourceRevision: number;
}): Promise<CmsDraftResponse> {
  const response = await fetch(`/api/admin/settings/pages/${encodeURIComponent(input.pageKey)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expectedRevision: input.expectedRevision,
      sourceRevision: input.sourceRevision,
    }),
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(messageFrom(payload, '이전 게시본을 불러오지 못했습니다.'));
  return payload as CmsDraftResponse;
}
