import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// 배경:
// dad의 PR #344가 globals.css의 공통 폭 기준(site-container-wide 등 = max-w-[1280px] +
// --page-gutter)을 바꿨는데도, 페이지마다 `max-w-[1120px] px-5 md:px-6 ...` 식으로 폭·좌우
// 여백을 인라인 Tailwind 클래스로 직접 적은 최상위 컨테이너 43곳이 이 기준을 따라가지 않아
// 헤더(Header.tsx, site-container-wide 사용)와 본문·푸터의 좌측 시작선이 어긋나는 회귀가
// 발생했다(1440px 화면 기준 브랜드 상세 64px, 푸터 34px, 홈 섹션 8px 밀림, 2026-08-25 레이아웃
// 통일 감사). src/components/common/PageContainer.tsx로 전량 교체했다.
//
// 공개 페이지의 최상위 폭 컨테이너는 폭(max-w-[...])·좌우 여백(px-*)을 인라인으로 직접 적지
// 말고 반드시 PageContainer를 써서, globals.css의 공통 기준이 다시 바뀌어도 헤더와 함께
// 자동으로 따라가게 한다. 이 스펙은 "같은 className 문자열 안에 max-w-[1NNNpx](1000~1999)와
// 좌우 여백 px- 클래스가 함께 있는 경우"가 0건임을 단정해 재발을 막는다.
//
// 예외: 여백 없는 안쪽 폭 제한(예: max-w-[1040px], px- 클래스 없이 텍스트/그리드 폭만 제한)은
// 정당한 패턴이라 허용한다 — 이 스펙이 잡는 건 "폭 + 여백"이 함께 인라인으로 적힌 경우뿐이다.

const ROOT = path.resolve(__dirname, '..', '..');
const SEARCH_DIRS = ['src/app', 'src/components'];
const EXCLUDED_DIR_SEGMENTS = [
  `${path.sep}app${path.sep}admin`,
  `${path.sep}components${path.sep}admin`,
  `${path.sep}components${path.sep}admin-new`,
];

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walk(full));
    } else if (entry.name.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

function isExcluded(absPath: string): boolean {
  return EXCLUDED_DIR_SEGMENTS.some((segment) => absPath.includes(segment));
}

// className="...", className='...', className={`...`} 세 형태를 모두 잡는다.
const CLASS_NAME_REGEX = /className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g;
// 1000~1999px 범위의 max-w 인라인 값만 대상으로 한다(§ 작업 지시 — 1NNN 범위).
const MAX_W_REGEX = /max-w-\[1\d{3}px\]/;
// 좌우 여백 px- 클래스(반응형 접두사 포함).
const PADDING_X_REGEX = /(?:^|\s)(?:sm:|md:|lg:|xl:|2xl:)?px-/;

interface Offender {
  file: string;
  className: string;
}

test.describe('페이지 최상위 폭 컨테이너 가드 (#344 이후 인라인 컨테이너 43곳 드리프트 재발 방지)', () => {
  test('src/app·src/components(관리자 제외)에 max-w-[1NNNpx] + px- 인라인 조합이 없다', () => {
    const offenders: Offender[] = [];

    for (const dir of SEARCH_DIRS) {
      const absDir = path.join(ROOT, dir);
      if (!fs.existsSync(absDir)) continue;

      for (const file of walk(absDir)) {
        if (isExcluded(file)) continue;

        const content = fs.readFileSync(file, 'utf8');
        let match: RegExpExecArray | null;
        CLASS_NAME_REGEX.lastIndex = 0;
        while ((match = CLASS_NAME_REGEX.exec(content)) !== null) {
          const className = match[1] ?? match[2] ?? match[3] ?? '';
          if (MAX_W_REGEX.test(className) && PADDING_X_REGEX.test(className)) {
            offenders.push({ file: path.relative(ROOT, file), className });
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  // 홈 "보호자 후기·소식" 박스는 dad 원본(8/27)부터 배경·둥근 모서리를 컨테이너 자체에 걸어,
  // 바깥선이 여백 밖으로 나가 다른 프레임(Audit 소개·빠른 쇼핑·보험 배너 — 모두 컨테이너 안쪽
  // 첫 자식에 테두리를 둠)보다 양옆으로 튀어나왔다(1280px 이상에서 좌우 각 48px). 프레임은
  // 컨테이너 안쪽 요소에 둬야 바깥선이 헤더 로고 줄에 맞는다.
  test('PageContainer 자체에 프레임(배경·테두리·둥근 모서리·그림자)을 걸지 않는다', () => {
    const FRAME_REGEX = /(?:^|\s)(?:rounded-|border(?:\s|$|-)|shadow-|bg-)/;
    const OPEN_TAG_REGEX = /<PageContainer\b[^>]*?className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g;
    const offenders: Offender[] = [];

    for (const dir of SEARCH_DIRS) {
      const absDir = path.join(ROOT, dir);
      if (!fs.existsSync(absDir)) continue;
      for (const file of walk(absDir)) {
        if (isExcluded(file)) continue;
        const content = fs.readFileSync(file, 'utf8');
        let match: RegExpExecArray | null;
        OPEN_TAG_REGEX.lastIndex = 0;
        while ((match = OPEN_TAG_REGEX.exec(content)) !== null) {
          const className = match[1] ?? match[2] ?? match[3] ?? '';
          if (FRAME_REGEX.test(className)) offenders.push({ file: path.relative(ROOT, file), className });
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
