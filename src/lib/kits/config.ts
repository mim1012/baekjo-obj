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
    { id: 'k1', name: '병원 회복 케어 키트', type: 'hospital', target: '퇴원 보호자', location: '제휴 동물병원', items: ['영양 캔', '유산균', '가이드북'], purpose: '치료 후 회복 지원', stock: 150, isVisible: true },
    { id: 'k2', name: '시니어 활력 키트', type: 'vitality', target: '시니어 강아지', location: '온라인 신청', items: ['관절 영양 앰플', '부드러운 간식'], purpose: '노령견 활력 증진', stock: 50, isVisible: true },
  ],
};
