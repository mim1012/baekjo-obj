// 전시용 후기(showcase reviews) config 타입 + 기본값(seed/폴백). 서버(API route·server page)와
// 클라이언트(storage 콘센트) 양쪽에서 안전하게 import 할 수 있도록 'use client' 가 없는 순수
// 모듈로 둔다(notices/config.ts 와 동일한 이유 — client-reference 프록시 치환 방지).
//
// "전시용 후기"는 구매 기반 사용자 구매평(product_reviews 테이블, ProductReview 타입)과 별개의
// 도메인이다 — 공개 후기 목록(/reviews)·홈 후기 레일·브랜드/고민 상세의 후기 섹션에 노출되는
// 큐레이션 콘텐츠로, 관리자(/admin/reviews)가 등록·수정·삭제한다.
// value jsonb 에 통째로 담기는 모양 = { items: Review[] }. 기본값은 예전 src/data/reviews.ts
// 배열을 그대로 옮긴 것이다(값 변경 없음).
import type { Review } from '@/types';

export interface ShowcaseReviewsConfig {
  items: Review[];
}

// 운영 전 가짜 전시 후기(말티즈 3살·푸들 7살 등 r1~r6)를 제거 — DB(showcase_reviews_config)에 행이
// 없을 때 이 폴백이 그대로 공개 후기 화면(/reviews·홈·브랜드/고민 상세)에 노출되던 문제(2026-07-27)를
// 없애기 위해 빈 배열로 둔다. 실제 전시 후기는 관리자(/admin/reviews)가 등록하며 채운다.
// 빈 목록이어도 공개 화면은 "아직 등록된 후기 없음" 상태로 정상 렌더된다.
export const defaultShowcaseReviewsConfig: ShowcaseReviewsConfig = {
  items: [],
};
