// 상품문의(Q&A) config 타입 + 기본값(seed/폴백). 서버(API route)와 클라이언트(storage 콘센트)
// 양쪽에서 안전하게 import 할 수 있도록 'use client' 가 없는 순수 모듈로 둔다 — client 모듈에서
// default 를 import 하면 Next.js 가 client-reference 프록시로 치환해 서버(JSON.stringify)에서 {} 로 죽는다.
// value jsonb 에 통째로 담기는 모양 = { items: QnA[] }. 정적 @/data/qna 는 이 기본값을 조립하기
// 위한 용도로만 남는다(상품상세·마이페이지·관리자 화면은 더 이상 @/data/qna 를 직접 import 하지 않는다).
import { qnaList } from '@/data/qna';
import type { QnA } from '@/types';

export interface QnaConfig {
  items: QnA[];
}

/** DB 행이 없거나 조회 실패 시 상품상세 Q&A 탭·마이페이지·관리자 화면이 폴백하는 기본 문의 목록. */
export const defaultQnaConfig: QnaConfig = {
  items: qnaList,
};
