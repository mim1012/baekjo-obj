import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * detailBlocks의 text content는 sanitize 없이 평문 그대로 저장된다
 * (src/lib/products/validate.ts — 태그 거부는 오탐만 만드는 새는 방어라 제거했다).
 * 그 결정의 전제는 단 하나 — "저장된 content가 HTML로 파싱되는 경로가 존재하지 않는다"이다.
 * 이 스펙이 그 전제를 기계로 강제한다: src/ 트리에 dangerouslySetInnerHTML이 0건이어야 한다.
 * 이 파일이 초록불인 한 저장형 XSS 싱크는 없다. 누군가 innerHTML 싱크를 도입하면 CI가 막는다.
 *
 * 싱크를 정말 도입해야 한다면: 이 테스트를 지우지 말고, 해당 경로에 sanitizer(DOMPurify 등)를
 * 붙인 뒤 validate.ts의 text content 정책을 함께 재설계하라.
 */

const SRC_ROOT = path.resolve(__dirname, '..', '..', 'src');
const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SINK_PATTERN = /dangerouslySetInnerHTML/;

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full));
    } else if (SCANNED_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

test.describe('HTML 싱크 가드', () => {
  test('src/ 트리에 dangerouslySetInnerHTML이 0건이다', () => {
    const files = collectFiles(SRC_ROOT);
    expect(files.length).toBeGreaterThan(0); // 스캔 경로가 비면 가드가 무력해진다 — 먼저 잡는다.

    const offenders = files.filter((file) => SINK_PATTERN.test(fs.readFileSync(file, 'utf8')));

    expect(
      offenders,
      offenders.length > 0
        ? `dangerouslySetInnerHTML 발견 — detailBlocks의 평문 렌더 전제가 깨졌습니다.\n` +
            offenders.map((f) => ` - ${path.relative(SRC_ROOT, f)}`).join('\n')
        : undefined,
    ).toEqual([]);
  });
});
