// GET /api/product-tags — 공개 상품 '고민' 태그 사전 조회(스토어프론트 상품 카드·필터가 읽는다).
// getPublicProductTagsConfig() 내부에서 이미 실패를 기본값으로 흡수하므로 이 라우트는 500을 내지
// 않는다 — 공개 스토어프론트라 무슨 일이 있어도 태그 표기가 있어야 한다(category-settings와 동일).
import { NextResponse } from 'next/server';
import { getPublicProductTagsConfig } from '@/lib/productTags/repo';

export async function GET() {
  const config = await getPublicProductTagsConfig();
  return NextResponse.json(config, { status: 200 });
}
