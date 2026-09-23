import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// 배경:
// dad가 홈에서 의도적으로 지운 UI 2개가, "CMS 편집기 노출 필드 ↔ 렌더러 소비 필드 정합" 작업인
// a1d8ab0 에서 되살아났다. dad는 JSX만 지우고 CMS 필드·기본값을 남겨뒀고, a1d8ab0 은 그걸
// "편집기엔 있는데 렌더러가 안 읽는 필드"로 오판해 필드를 지우는 대신 UI를 되살리는 방향으로
// 맞췄다. 이번에는 JSX 뿐 아니라 데이터·CMS 필드 정의까지 함께 지워서 같은 오판이 재발하지
// 않게 한다. 다음에 이 필드들이 편집기 정의에 없는 것을 보고 "누락이니 연결해야 한다"고
// 판단하지 말 것 — 의도적 제거다.
// - 2eea63e (dad, 08-30): 홈 /diagnosis CTA 삭제 → a1d8ab0 이 부활시킴
// - 645823b (dad, 09-07): 홈 히어로 "Audit Passed / 검증 기준 통과" 배지 삭제 → a1d8ab0 이 부활시킴
// - a1d8ab0: 위 두 UI를 필드 정합이라는 명목으로 되살린 회귀 커밋
//
// 대조 사례: 같은 시기 dad 가 지운 헤더 서브메뉴 설명(b6bfeeb)은 부재를 검증하는 가드 테스트를
// 함께 넣어서 드리프트가 없었다(tests/products/baekjo-0827-requirements.spec.ts 참고). 이 스펙은
// 그 패턴(소스 파일을 문자열로 읽어 부재를 단정하는 순수 계약 테스트)을 그대로 따른다.

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test.describe('홈 UI 드리프트 재발 방지 (2eea63e·645823b 삭제 → a1d8ab0 부활 → 재삭제)', () => {
  test('HomeClient.tsx 에 히어로 Audit 배지·진단 CTA 가 없다', () => {
    const home = read('src/components/home/HomeClient.tsx');

    // 645823b 가 지운 "Audit Passed / 검증 기준 통과" 배지. data-testid·필드명·아이콘 사용 모두
    // 부재해야 한다 — 하나라도 남아있으면 다음 정합 작업이 다시 되살릴 단서가 된다.
    expect(home).not.toContain('home-hero-badge');
    expect(home).not.toContain('badgeTitle');
    expect(home).not.toContain('badgeSubtitle');

    // 2eea63e 가 지운 홈 진단 CTA. /diagnosis 라우트·페이지·설문 기능 자체는 정상 운영 중이며
    // (관리자 "맞춤 진단 설계" 골든플로우 tests/golden/admin-crud-survey.spec.ts 가 별도로 검증한다)
    // 여기서 금지하는 것은 "홈에서 그리로 보내는 링크" 하나뿐이다.
    expect(home).not.toContain('href="/diagnosis"');
  });

  test('homeContent.ts 의 CMS 계약에 배지·진단 링크 필드가 없다', () => {
    // dad 가 JSX 만 지우고 필드·기본값을 남겨둔 것이 부활의 원인이었다. 타입 정의·기본값·
    // normalize 로직 세 곳 모두에서 없어야 재발하지 않는다.
    const homeContent = read('src/data/homeContent.ts');
    expect(homeContent).not.toContain('badgeTitle');
    expect(homeContent).not.toContain('badgeSubtitle');
    expect(homeContent).not.toContain('diagnosisLinkLabel');
  });

  test('pageDefinitions.ts 의 home 편집 필드에 배지·진단 링크가 없다', () => {
    // 편집기 노출 필드 정의에도 없어야, "편집기 필드가 렌더러에 연결 안 됐다"는 오판으로
    // a1d8ab0 처럼 되살리는 일이 재발하지 않는다.
    const pageDefinitions = read('src/lib/cms/pageDefinitions.ts');
    expect(pageDefinitions).not.toContain('hero.badgeTitle');
    expect(pageDefinitions).not.toContain('hero.badgeSubtitle');
    expect(pageDefinitions).not.toContain('curation.diagnosisLinkLabel');
  });

  test('src/ 전체에 "Audit를" 조사 오류가 없다 (Audit을 이 맞는 표기)', () => {
    // hero.trustNote("백조오브제 Audit을 통과한 브랜드만 소개합니다.")·audit.description
    // ("백조오브제 Audit을 진행합니다")과 같은 화면에서 bestProducts.title 만 "Audit를"을 써서
    // 불일치했다. src/ 전역을 훑어 같은 오류가 재발하지 않게 한다.
    const walk = (dir: string): string[] => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      let files: string[] = [];
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files = files.concat(walk(full));
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          files.push(full);
        }
      }
      return files;
    };

    const offenders: string[] = [];
    for (const file of walk(path.join(ROOT, 'src'))) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('Audit를')) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
