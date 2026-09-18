// 케어 키트 config 타입 + 기본값(seed/폴백). 서버(API route)와 클라이언트(storage 콘센트) 양쪽에서
// 안전하게 import 할 수 있도록 'use client' 가 없는 순수 모듈로 둔다 — client 모듈에서 default 를
// import 하면 Next.js 가 client-reference 프록시로 치환해 서버(JSON.stringify)에서 {} 로 죽는다.
// value jsonb 에 통째로 담기는 모양 = { items: CareKit[] }. 기본값은 예전 admin/kits page.tsx 의
// 인라인 mockKits 를 그대로 옮긴 것이다(값 변경 없음).
import type { CareKit } from '@/types';

export interface KitsConfig {
  items: CareKit[];
}

const KIT_TYPES: ReadonlySet<CareKit['type']> = new Set([
  'hospital',
  'vitality',
  'funeral',
  'welcome',
  'sample',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeStoredKit(value: unknown): CareKit | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.target !== 'string' ||
    typeof value.purpose !== 'string' ||
    typeof value.type !== 'string' ||
    !KIT_TYPES.has(value.type as CareKit['type'])
  ) {
    return null;
  }

  const items = Array.isArray(value.items)
    ? value.items.filter((item): item is string => typeof item === 'string')
    : [];
  const stock = typeof value.stock === 'number' && Number.isFinite(value.stock)
    ? Math.max(0, Math.floor(value.stock))
    : 0;
  const kit: CareKit = {
    id: value.id,
    name: value.name,
    type: value.type as CareKit['type'],
    target: value.target,
    location: typeof value.location === 'string' ? value.location : '-',
    items,
    purpose: value.purpose,
    stock,
    isVisible: typeof value.isVisible === 'boolean' ? value.isVisible : true,
  };

  if (typeof value.partnerId === 'string' && value.partnerId.length > 0) kit.partnerId = value.partnerId;
  if (typeof value.description === 'string' && value.description.length > 0) kit.description = value.description;
  return kit;
}

export function normalizeStoredKitsConfig(value: unknown): KitsConfig | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  return { items: value.items.flatMap((item) => {
    const normalized = normalizeStoredKit(item);
    return normalized ? [normalized] : [];
  }) };
}

/** DB 행이 없거나 조회 실패 시 관리자 케어키트 화면이 폴백하는 기본 키트 목록. */
export const defaultKitsConfig: KitsConfig = {
  items: [
    { id: 'k1', name: '웰컴 케어', type: 'welcome', target: '새로운 환경과 생활을 시작하는 순간', location: '파트너 협의', items: [], purpose: '새로운 환경과 생활을 시작하는 순간을 위한 구성을 고민합니다.', stock: 0, isVisible: true },
    { id: 'k2', name: '위로 케어', type: 'hospital', target: '위로와 마음을 전하고 싶은 순간', location: '파트너 협의', items: [], purpose: '보호자와 반려동물에게 위로와 마음을 전하고 싶은 순간을 위한 구성을 고민합니다.', stock: 0, isVisible: true },
    { id: 'k3', name: '기억 케어', type: 'funeral', target: '함께한 시간을 기억하고 싶은 순간', location: '파트너 협의', items: [], purpose: '함께한 시간을 기억하고 마음을 남길 수 있는 구성을 고민합니다.', stock: 0, isVisible: true },
    { id: 'k4', name: '맞춤 케어', type: 'sample', target: '파트너별 맞춤 프로젝트', location: '파트너 협의', items: [], purpose: '파트너의 목적과 대상, 상황에 따라 새로운 케어키트를 함께 기획합니다.', stock: 0, isVisible: true },
  ],
};
