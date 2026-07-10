// 이메일 인증/비밀번호 재설정 토큰 발급·검증. 토큰 원본은 메일로만 나가고
// DB(member_tokens.token_hash)에는 SHA-256 해시만 저장한다(0002_email_tokens.sql).
import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
import { getSupabase } from '@/lib/supabase/server';

export type MemberTokenKind = 'verify' | 'reset';

const TOKEN_BYTES = 32;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24시간
const RESET_TTL_MS = 30 * 60 * 1000; // 30분

/** 메일 폭탄/SMTP 쿼터 소진 방지용 스로틀 기준 — 이 시간·건수를 넘으면 신규 발급을 생략한다. */
export const TOKEN_THROTTLE_WINDOW_MINUTES = 60;
export const TOKEN_THROTTLE_LIMIT = 3;

function ttlForKind(kind: MemberTokenKind): number {
  return kind === 'verify' ? VERIFY_TTL_MS : RESET_TTL_MS;
}

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

/** 토큰 생성 — 원본(hex)을 반환하고, DB에는 해시만 저장한다. */
export async function createMemberToken(memberId: string, kind: MemberTokenKind): Promise<string> {
  const rawToken = randomBytes(TOKEN_BYTES).toString('hex');
  const expiresAt = new Date(Date.now() + ttlForKind(kind)).toISOString();

  const { error } = await getSupabase().from('member_tokens').insert({
    member_id: memberId,
    kind,
    token_hash: hashToken(rawToken),
    expires_at: expiresAt,
  });
  if (error) throw error;

  return rawToken;
}

/** 최근 withinMinutes분 안에 해당 회원·종류로 발급된 토큰 수 — 발급 전 스로틀 체크용. */
export async function countRecentTokens(
  memberId: string,
  kind: MemberTokenKind,
  withinMinutes: number,
): Promise<number> {
  const since = new Date(Date.now() - withinMinutes * 60 * 1000).toISOString();

  const { count, error } = await getSupabase()
    .from('member_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('member_id', memberId)
    .eq('kind', kind)
    .gte('created_at', since);
  if (error) throw error;

  return count ?? 0;
}

/**
 * 토큰 소비 — 해시 일치·종류 일치·미사용·미만료면 used_at을 채우고 member_id를 반환한다.
 * 조건 불충족(위조·만료·재사용)이면 null.
 */
export async function consumeMemberToken(
  rawToken: string,
  kind: MemberTokenKind,
): Promise<string | null> {
  const tokenHash = hashToken(rawToken);

  const { data, error } = await getSupabase()
    .from('member_tokens')
    .select('id, member_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .eq('kind', kind)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as { id: string; member_id: string; expires_at: string; used_at: string | null };
  if (row.used_at !== null) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  // used_at이 아직 null인 행만 갱신 — 동시에 들어온 요청 두 개가 같은 토큰을 동시에
  // "미사용"으로 읽고 둘 다 통과하는 TOCTOU를 막는다. 이미 다른 요청이 선점했으면
  // 조건에 걸려 0행이 갱신되고 updated가 빈 배열로 온다.
  const { data: updated, error: updateError } = await getSupabase()
    .from('member_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('used_at', null)
    .select('id');
  if (updateError) throw updateError;
  if (!updated || updated.length === 0) return null;

  return row.member_id;
}
