// B2B 제휴처 config 타입 + 기본값(seed/폴백). 서버(API route)와 클라이언트(storage 콘센트) 양쪽에서
// 안전하게 import 할 수 있도록 'use client' 가 없는 순수 모듈로 둔다 — client 모듈에서 default 를
// import 하면 Next.js 가 client-reference 프록시로 치환해 서버(JSON.stringify)에서 {} 로 죽는다.
// value jsonb 에 통째로 담기는 모양 = { items: Partner[] }. 기본값은 예전 admin/partners page.tsx 의
// 인라인 mockPartners 를 그대로 옮긴 것이다(값 변경 없음).
import type { Partner } from '@/types';

export interface PartnersConfig {
  items: Partner[];
}

/** DB 행이 없거나 조회 실패 시 관리자 B2B 제휴 화면이 폴백하는 기본 제휴처 목록. */
export const defaultPartnersConfig: PartnersConfig = {
  items: [
    {
      id: 'pt1',
      name: '서울 동물 메디컬센터',
      type: 'hospital',
      contactPerson: '김원장',
      phone: '02-1234-5678',
      address: '서울시 강남구',
      cooperationType: '병원 케어 키트 비치',
      providedKits: ['k1'],
      status: '운영중',
      isContracted: true,
      isDelivered: true,
    },
    {
      id: 'pt2',
      name: '펫프렌들리 호텔 마리나',
      type: 'etc',
      contactPerson: '이매니저',
      phone: '032-987-6543',
      address: '인천시 중구',
      cooperationType: '투숙객 웰컴 키트',
      providedKits: ['k1'],
      status: '상담중',
      isContracted: false,
      isDelivered: false,
    },
  ],
};
