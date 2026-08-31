// 케어 키트 config 타입 + 기본값(seed/폴백). 서버(API route)와 클라이언트(storage 콘센트) 양쪽에서
// 안전하게 import 할 수 있도록 'use client' 가 없는 순수 모듈로 둔다 — client 모듈에서 default 를
// import 하면 Next.js 가 client-reference 프록시로 치환해 서버(JSON.stringify)에서 {} 로 죽는다.
// value jsonb 에 통째로 담기는 모양 = { items: CareKit[] }. 기본값은 예전 admin/kits page.tsx 의
// 인라인 mockKits 를 그대로 옮긴 것이다(값 변경 없음).
import type { CareKit } from '@/types';

export interface KitsConfig {
  items: CareKit[];
}

/** DB 행이 없거나 조회 실패 시 관리자 케어키트 화면이 폴백하는 기본 키트 목록. */
export const defaultKitsConfig: KitsConfig = {
  items: [
    { id: 'k1', name: '웰컴 케어', type: 'welcome', target: '새로운 환경과 생활을 시작하는 순간', items: [], purpose: '새로운 환경과 생활을 시작하는 순간을 위한 구성을 고민합니다.', isVisible: true },
    { id: 'k2', name: '위로 케어', type: 'hospital', target: '위로와 마음을 전하고 싶은 순간', items: [], purpose: '보호자와 반려동물에게 위로와 마음을 전하고 싶은 순간을 위한 구성을 고민합니다.', isVisible: true },
    { id: 'k3', name: '기억 케어', type: 'funeral', target: '함께한 시간을 기억하고 싶은 순간', items: [], purpose: '함께한 시간을 기억하고 마음을 남길 수 있는 구성을 고민합니다.', isVisible: true },
    { id: 'k4', name: '맞춤 케어', type: 'sample', target: '파트너별 맞춤 프로젝트', items: [], purpose: '파트너의 목적과 대상, 상황에 따라 새로운 케어키트를 함께 기획합니다.', isVisible: true },
  ],
};

const legacyDefaultKitNames = new Set(['병원 회복 케어 키트', '시니어 활력 키트']);

/**
 * 현재 공개 케어키트 화면이 사용해 온 목록 계산 규칙.
 * 관리자와 공개 화면이 같은 함수를 써서, 직원이 보는 목록과 고객이 보는 목록이 어긋나지 않게 한다.
 * 기존 공개 화면의 값·순서·과거 데이터 보정 결과는 변경하지 않는다.
 */
export function resolvePublicKitsConfig(saved: KitsConfig | null): KitsConfig {
  const savedItems = saved?.items ?? [];
  const hasLegacyDefaults = savedItems.some((kit) => legacyDefaultKitNames.has(kit.name));
  const items = hasLegacyDefaults
    ? [
        ...defaultKitsConfig.items,
        ...savedItems.filter((kit) => !legacyDefaultKitNames.has(kit.name)),
      ]
    : (saved ?? defaultKitsConfig).items;

  return { items };
}
