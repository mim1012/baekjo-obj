import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

function sliceBetween(source: string, startNeedle: string, endNeedle: string): string {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

/**
 * wave-6 발견: 마이페이지 "회원정보 저장"이 setCurrentUser(localStorage)만 쓰고 서버 API를
 * 전혀 부르지 않아, 고객이 이름/연락처/반려동물종/견종을 바꿔도 새로고침·재로그인하면 되돌아갔다.
 * 이 스펙은 그 실배선이 다시 생기지 않도록 "서버 왕복 → 성공 후에만 로컬 캐시 갱신" 경로를 고정한다.
 */
test.describe('마이페이지 회원정보 저장 → 실제 API 저장 바인딩 경로', () => {
  test('ProfileSection은 updateMyProfile(서버 API)을 거친 뒤에만 setCurrentUser로 로컬 캐시를 갱신한다', () => {
    const profileSection = src('src', 'app', 'mypage', 'components', 'ProfileSection.tsx');

    expect(profileSection).toContain("import { setCurrentUser, updateMyProfile } from '@/lib/storage'");

    const handleSubmit = sliceBetween(profileSection, 'const handleSubmit = async', 'const handleChange =');
    expect(handleSubmit).toContain('const result = await updateMyProfile(formData);');
    expect(handleSubmit).toContain('if (result.error) {');
    // localStorage만 갱신하고 끝나던 예전 버그: setCurrentUser가 API 응답과 무관하게 항상 호출됐다.
    // 이제는 result.user(= 서버 200 응답)가 있을 때만 호출해야 한다.
    expect(handleSubmit).toContain('if (result.user) setCurrentUser(result.user);');
    // handleSubmit 안에서 실패 이전에 무조건 setCurrentUser부터 부르는 예전 패턴이 없는지 확인.
    expect(handleSubmit.indexOf('await updateMyProfile')).toBeLessThan(handleSubmit.indexOf('setCurrentUser('));
  });

  test('storage 콘센트의 updateMyProfile은 PATCH /api/members/me 로 fetch하고 상태코드를 도메인 에러로 매핑한다', () => {
    const storageSource = src('src', 'lib', 'storage.ts');
    const fn = sliceBetween(
      storageSource,
      'export async function updateMyProfile(',
      '/** 비밀번호 변경',
    );

    expect(fn).toContain("fetch('/api/members/me'");
    expect(fn).toContain("method: 'PATCH'");
    expect(fn).toContain('body: JSON.stringify(input)');
    expect(fn).toContain('const { user } = (await response.json()) as { user: User };');
    expect(fn).toContain("if (response.status === 400) return { error: 'invalid-input' };");
    expect(fn).toContain("if (response.status === 404) return { error: 'not-found' };");
  });

  test('PATCH /api/members/me 는 세션 필수·본인 id로만 갱신하고 화이트리스트 필드만 통과시킨다', () => {
    const route = src('src', 'app', 'api', 'members', 'me', 'route.ts');
    const patchFunction = route.slice(route.indexOf('export async function PATCH('));

    expect(patchFunction).toContain('const session = await auth();');
    expect(patchFunction).toContain("if (!session?.user) {");
    expect(patchFunction).toContain("return NextResponse.json({ error: 'no-session' }, { status: 401 });");
    expect(patchFunction).toContain('const patch = validateProfilePatch(body);');
    expect(patchFunction).toContain('const updated = await updateMemberProfile(member.id, patch);');

    // 화이트리스트 검증기 자체가 role/status/email을 아예 다루지 않는지 확인 — 바디에 넣어도
    // 반영될 경로가 없다(이중 방어: repo의 컬럼 매핑도 별도로 확인).
    const validateFn = sliceBetween(route, 'function validateProfilePatch(', 'export async function PATCH(');
    expect(validateFn).not.toContain('role');
    expect(validateFn).not.toContain('status');
    expect(validateFn).not.toContain('email');
  });

  test('repo의 updateMemberProfile은 name/phone/petType/breed/mainConcern 5개 컬럼만 매핑한다', () => {
    const repoSource = src('src', 'lib', 'members', 'repo.ts');
    const fn = sliceBetween(
      repoSource,
      'export async function updateMemberProfile(',
      'export async function updateMemberPassword(',
    );

    expect(fn).toContain('if (patch.name !== undefined) columns.name = patch.name;');
    expect(fn).toContain('if (patch.phone !== undefined) columns.phone = patch.phone;');
    expect(fn).toContain("if (patch.petType !== undefined) columns.pet_type = patch.petType || null;");
    expect(fn).toContain("if (patch.breed !== undefined) columns.breed = patch.breed || null;");
    expect(fn).toContain("if (patch.mainConcern !== undefined) columns.main_concern = patch.mainConcern || null;");
    // role/status/email 컬럼을 쓰는 코드가 이 함수 안에 없어야 한다 — 화이트리스트가 타입/구현 양쪽에서 강제된다.
    expect(fn).not.toContain('columns.role');
    expect(fn).not.toContain('columns.status');
    expect(fn).not.toContain('columns.email');
    expect(fn).toContain(".eq('id', id)");
  });
});
