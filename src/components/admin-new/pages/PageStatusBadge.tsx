'use client';

import StatusBadge from '@/components/admin-new/common/StatusBadge';
import type { CmsPageState } from './types';

export default function PageStatusBadge({ state }: { readonly state: CmsPageState }) {
  if (!state.available) return <StatusBadge status="error" label="DB 준비 필요" />;
  if (!state.managed) return <StatusBadge status="warning" label="활성화 필요" />;
  if (state.hasUnpublishedChanges) return <StatusBadge status="warning" label="게시 대기" />;
  if (state.publishedRevision === null) return <StatusBadge status="neutral" label="미게시" />;
  return <StatusBadge status="success" label="게시 완료" />;
}
