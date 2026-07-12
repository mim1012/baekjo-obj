import { NextResponse } from 'next/server';
import { defaultCategorySettings, type CategorySettings } from '@/lib/categorySettings/config';
import { getCategorySettings } from '@/lib/categorySettings/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * GET /api/category-settings — 공개 카테고리 설정 조회(스토어프론트 shop·brands 가 읽는다).
 * 저장된 행이 있으면 그 값을, 없거나 조회에 실패하면 defaultCategorySettings 로 폴백한다.
 * 공개 스토어프론트라 절대 500 을 내지 않는다 — 무슨 일이 있어도 필터엔 카테고리가 있어야 한다.
 */
export async function GET() {
  let settings: CategorySettings = defaultCategorySettings;
  try {
    const saved = await getCategorySettings();
    if (saved) settings = saved;
  } catch (error) {
    logServerError('[GET /api/category-settings] 조회 실패 — defaultCategorySettings 로 폴백', error);
  }
  return NextResponse.json({ settings }, { status: 200 });
}
