import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { assertLocalhostAppRuntimeSupabaseRefMatchesTestRef } from '../_lib/supabaseSafety';
import { bypassHeaders, CRUD_ENABLED, loginAsAdmin, loginWithCredentials } from './_lib/adminCrudHelpers';

const serviceKey = process.env.SUPABASE_SECRET_KEY;
const supabaseUrl = process.env.SUPABASE_URL;

function getStagingConfig(): { readonly url: string; readonly serviceKey: string } {
  if (!supabaseUrl || !serviceKey) throw new Error('staging Supabase credentials are required');
  return { url: supabaseUrl, serviceKey };
}

test.describe('실 staging 회원 탈퇴', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — staging 쓰기 스펙은 명시적으로 켜야 합니다');
  test.skip(!serviceKey || !supabaseUrl, 'SUPABASE_SECRET_KEY/SUPABASE_URL 미주입');

  test.use({ extraHTTPHeaders: bypassHeaders() });

  test('throwaway 회원을 실제로 탈퇴시키고 DB 익명화·토큰 삭제를 read-back한다', async ({ browser }) => {
    await assertLocalhostAppRuntimeSupabaseRefMatchesTestRef('golden');

    const staging = getStagingConfig();
    const supabase = createClient(staging.url, staging.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const runId = Date.now();
    const email = `e2e-withdraw-${runId}@test.baekjo`;
    const password = `E2Ewithdraw${runId}`;
    let memberId: string | undefined;
    let withdrawn = false;

    const setupPage = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    try {
      const signup = await setupPage.request.post('/api/members', {
        data: {
          name: `E2E탈퇴${runId}`,
          email,
          password,
          phone: '010-1111-2222',
          petType: 'dog',
          breed: '테스트견',
          mainConcern: 'skin',
          termsAgree: true,
          privacyAgree: true,
        },
      });
      expect(signup.status(), `throwaway 회원가입 실패: ${await signup.text()}`).toBe(201);

      await loginAsAdmin(setupPage);
      const membersResponse = await setupPage.request.get('/api/admin/members');
      expect(membersResponse.ok()).toBe(true);
      const members = (await membersResponse.json()) as {
        users: Array<{ readonly id: string; readonly email: string; readonly status: string }>;
      };
      const member = members.users.find((candidate) => candidate.email === email);
      expect(member, `${email} throwaway 회원이 관리자 목록에 없습니다`).toBeDefined();
      if (!member) throw new Error('throwaway member lookup failed');
      memberId = member.id;

      const verified = await supabase.from('members').update({ email_verified: true }).eq('id', memberId);
      expect(verified.error).toBeNull();
      const activated = await setupPage.request.patch(`/api/admin/members/${memberId}`, {
        data: { status: 'active' },
      });
      expect(activated.ok(), `throwaway 회원 활성화 실패: ${await activated.text()}`).toBe(true);

      const token = await supabase.from('member_tokens').insert({
        member_id: memberId,
        kind: 'reset',
        token_hash: `e2e-withdraw-${runId}`,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      });
      expect(token.error).toBeNull();

      const memberPage = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
      await loginWithCredentials(memberPage, email, password);
      const before = await memberPage.request.get('/api/members/me');
      expect(before.ok()).toBe(true);
      expect(((await before.json()) as { user: { email: string } }).user.email).toBe(email);

      const withdrawal = await memberPage.request.delete('/api/members/me');
      expect(withdrawal.status(), `탈퇴 API 실패: ${await withdrawal.text()}`).toBe(200);
      withdrawn = true;

      const stored = await supabase
        .from('members')
        .select('id, status, name, email, phone, profile_image, signup_data, password_hash, provider_id, company_name, business_number')
        .eq('id', memberId)
        .single();
      expect(stored.error).toBeNull();
      expect(stored.data).toMatchObject({
        id: memberId,
        status: 'withdrawn',
        name: '(탈퇴회원)',
        email: `withdrawn-${memberId}@deleted.baekjo`,
        phone: '',
        profile_image: null,
        signup_data: {},
        password_hash: null,
        provider_id: null,
        company_name: null,
        business_number: null,
      });

      const tokens = await supabase.from('member_tokens').select('id').eq('member_id', memberId);
      expect(tokens.error).toBeNull();
      expect(tokens.data).toEqual([]);
      await memberPage.close();
    } finally {
      await setupPage.close();
      if (memberId && !withdrawn) {
        const cleanup = await supabase.from('members').delete().eq('id', memberId);
        expect(cleanup.error).toBeNull();
      }
    }
  });
});
