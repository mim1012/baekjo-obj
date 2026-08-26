import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { shouldStartLocalWebServer } from '../../playwright.config';

const root = path.resolve(__dirname, '..', '..');

function read(...segments: string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test.describe('Production 비용 안전 경계', () => {
  test('Playwright의 무설정 기본 대상은 로컬이며 원격 실행은 병렬·재시도하지 않는다', () => {
    const source = read('playwright.config.ts');

    expect(source).not.toContain("fromEnv || 'https://");
    expect(source).toContain("fromEnv || 'http://127.0.0.1:3000'");
    expect(source).toContain('fullyParallel: isLocal');
    expect(source).toContain('retries: isLocal ? 1 : 0');
    expect(source).toContain('workers: isLocal ? undefined : 1');
    expect(shouldStartLocalWebServer(true, ['--project=chromium'])).toBe(true);
    expect(shouldStartLocalWebServer(true, ['--project', 'golden-smoke'])).toBe(true);
    expect(shouldStartLocalWebServer(true, ['--project=products'])).toBe(false);
    expect(shouldStartLocalWebServer(true, ['--project=security'])).toBe(false);
    expect(shouldStartLocalWebServer(false, ['--project=chromium'])).toBe(false);
    expect(source).toContain("'www.baekjo-objet.com'");
    expect(source).toContain("'baekjo-obj.vercel.app'");
    expect(source).toContain('ALLOW_PRODUCTION_QA');
    expect(source).toContain("'x-vercel-protection-bypass'");
  });

  test('레이아웃 캡처는 Production을 기본값으로 사용하지 않는다', () => {
    const source = read('scripts', 'layout-snapshot.mjs');

    expect(source).not.toContain("process.argv[3] || 'https://www.baekjo-objet.com'");
    expect(source).toContain("process.argv[3] || 'http://127.0.0.1:3000'");
    expect(source).toContain('ALLOW_PRODUCTION_QA');
  });

  test('릴리즈 QA 스크립트도 직접 실행 시 Production을 거부한다', () => {
    const source = read('scripts', 'qa-release-check.mjs');

    expect(source).toContain("'www.baekjo-objet.com'");
    expect(source).toContain("'baekjo-objet.com'");
    expect(source).toContain("'baekjo-obj.vercel.app'");
    expect(source).toContain('ALLOW_PRODUCTION_QA');
  });

  test('robots 메타데이터가 비용 유발 AI 크롤러를 차단하고 링크 미리보기 봇은 유지한다', () => {
    const robotsPath = path.join(root, 'src', 'app', 'robots.ts');

    expect(fs.existsSync(robotsPath)).toBe(true);
    if (!fs.existsSync(robotsPath)) return;

    const source = fs.readFileSync(robotsPath, 'utf8');
    for (const crawler of [
      'meta-externalagent',
      'Meta-ExternalFetcher',
      'Meta-WebIndexer',
      'GPTBot',
      'Amazonbot',
    ]) {
      expect(source).toContain(`'${crawler}'`);
    }
    expect(source).not.toContain('facebookexternalhit');
  });

  test('수동 원격 QA 워크플로는 Vercel 별칭과 커스텀 Production 도메인을 모두 거부한다', () => {
    for (const workflow of ['golden-crud.yml', 'release-qa.yml', 'update-baselines.yml']) {
      const source = read('.github', 'workflows', workflow);

      expect(source).toContain('baekjo-obj\\.vercel\\.app');
      expect(source).toContain('(www\\.)?baekjo-objet\\.com');
    }
  });
});
