import { FEATURES } from '@/config/features';
import type { Notice } from '@/types';

const INSURANCE_COPY_PATTERN = /보험|insurance/i;

/**
 * 비활성 기능의 공지는 관리자 데이터와 원문을 그대로 보존하고 공개 화면에서만 제외한다.
 * 일반 공지 본문에 보험 안내가 한 줄 섞인 경우에는 해당 줄만 숨겨 나머지 공지는 유지한다.
 */
export function getPublicNotices(items: Notice[]): Notice[] {
  if (FEATURES.insurance) return items;

  return items
    .filter((notice) => !INSURANCE_COPY_PATTERN.test(notice.title))
    .map((notice) => ({
      ...notice,
      content: notice.content
        .split('\n')
        .filter((line) => !INSURANCE_COPY_PATTERN.test(line))
        .join('\n'),
    }));
}
