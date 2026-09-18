import { expect, test } from '@playwright/test';
import {
  MISSING_SUPABASE_ENV_MESSAGE,
  isMissingSupabaseEnvironmentError,
} from '../../src/lib/logServerError';

test.describe('로컬 Supabase 환경 누락 판별', () => {
  test('정확한 설정 누락 오류만 개발용 폴백 대상으로 판별한다', () => {
    expect(isMissingSupabaseEnvironmentError(new Error(MISSING_SUPABASE_ENV_MESSAGE))).toBe(true);
    expect(isMissingSupabaseEnvironmentError(new Error('database unavailable'))).toBe(false);
    expect(isMissingSupabaseEnvironmentError({ message: MISSING_SUPABASE_ENV_MESSAGE })).toBe(false);
  });
});
