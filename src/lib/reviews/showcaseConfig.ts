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

/** DB 행이 없거나 조회 실패 시 공개 후기 화면·관리자 화면이 폴백하는 기본 전시 후기 목록. */
export const defaultShowcaseReviewsConfig: ShowcaseReviewsConfig = {
  items: [
    {
      id: 'r1',
      productId: 'p1',
      petType: 'dog',
      breed: '말티즈',
      age: '3살',
      usePeriod: '3개월 이상',
      rating: 5,
      content: '사료 위에 조금씩 뿌려주니 새로운 향에도 부담 없이 잘 먹었어요. 다섯 가지를 번갈아 줄 수 있어 식사 시간이 전보다 즐거워졌습니다.',
      image: '/reviews/r1.svg',
      isPhotoReview: true,
      createdAt: '2026-06-18',
      isBest: true,
    },
    {
      id: 'r2',
      productId: 'p2',
      petType: 'dog',
      breed: '푸들',
      age: '7살',
      usePeriod: '1개월',
      rating: 5,
      content: '입맛이 자주 바뀌는 아이라 여러 종류를 먼저 맛볼 수 있는 구성이 좋았어요. 잘 먹는 맛을 찾는 데 도움이 됐습니다.',
      isPhotoReview: false,
      createdAt: '2026-06-09',
      isBest: false,
    },
    {
      id: 'r3',
      productId: 'p3',
      petType: 'dog',
      breed: '포메라니안',
      age: '2살',
      usePeriod: '6개월 이상',
      rating: 4,
      content: '처음부터 큰 용량을 사기 망설여졌는데 작은 구성으로 천천히 시작할 수 있어 편했어요. 사료에 섞는 방법도 어렵지 않았습니다.',
      image: '/reviews/r3.svg',
      isPhotoReview: true,
      createdAt: '2026-05-27',
      isBest: true,
    },
    {
      id: 'r4',
      productId: 'p6',
      petType: 'cat',
      breed: '코리안 숏헤어',
      age: '1살',
      usePeriod: '2주일',
      rating: 5,
      content: '강아지와 고양이를 함께 키워 종류별 제품을 따로 고르기 번거로웠는데 한 번에 챙길 수 있어 편했어요. 급여 방법도 이해하기 쉬웠습니다.',
      isPhotoReview: false,
      createdAt: '2026-05-14',
      isBest: false,
    },
    {
      id: 'r5',
      productId: 'p8',
      petType: 'cat',
      breed: '페르시안',
      age: '4살',
      usePeriod: '1개월',
      rating: 4,
      content: '칫솔을 어려워하는 날에 가볍게 사용할 수 있어 좋았어요. 분사 범위가 넓지 않아 처음 쓰는 데도 크게 부담스럽지 않았습니다.',
      image: '/reviews/r5.svg',
      isPhotoReview: true,
      createdAt: '2026-04-30',
      isBest: true,
    },
    {
      id: 'r6',
      productId: 'p11',
      petType: 'cat',
      breed: '코리안 숏헤어',
      age: '2살',
      usePeriod: '1주일',
      rating: 5,
      content: '브러시를 싫어하는 고양이인데 짧게 마사지하듯 빗어주니 전보다 편안해했어요. 손에 잡히는 크기도 적당했습니다.',
      isPhotoReview: false,
      createdAt: '2026-04-21',
      isBest: false,
    },
  ],
};
