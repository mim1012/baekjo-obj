import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { CMS_PAGE_DEFINITIONS } from '@/lib/cms/pageDefinitions';
import { listCmsPageStates } from '@/lib/cms/repo';
import { logServerError } from '@/lib/logServerError';

/** 페이지 관리 목록 — 공개 화면에는 draft 내용이나 revision 정보를 노출하지 않는다. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const states = await listCmsPageStates();
    const stateByKey = new Map(states.map((state) => [state.pageKey, state]));
    return NextResponse.json({
      pages: CMS_PAGE_DEFINITIONS.map((definition) => {
        const state = stateByKey.get(definition.key);
        return {
          key: definition.key,
          title: definition.title,
          route: definition.route,
          group: definition.group,
          description: definition.description,
          draftRevision: state?.draftRevision ?? null,
          publishedRevision: state?.publishedRevision ?? null,
          publishedAt: state?.publishedAt ?? null,
          hasUnpublishedChanges: state
            ? state.draftRevision !== state.publishedRevision
            : false,
          available: Boolean(state),
        };
      }),
    });
  } catch (error) {
    logServerError('[GET /api/admin/settings/pages] 페이지 목록 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
