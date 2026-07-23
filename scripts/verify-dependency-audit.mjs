import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const exceptionExpiresOn = '2026-08-02';
const today = new Date().toISOString().slice(0, 10);

const allowedAdvisories = new Map([
  [
    'https://github.com/advisories/GHSA-c7w3-x93f-qmm8',
    'nodemailer 7 is reachable only through fixed Gmail SMTP options; envelope.size is not accepted from callers.',
  ],
  [
    'https://github.com/advisories/GHSA-vvjj-xcjg-gr5g',
    'nodemailer transport name is not configurable by user input.',
  ],
  [
    'https://github.com/advisories/GHSA-268h-hp4c-crq3',
    'Nodemailer List-* headers are not used by the project mailer.',
  ],
  [
    'https://github.com/advisories/GHSA-wqvq-jvpq-h66f',
    'jsonTransport is not used by the project mailer.',
  ],
  [
    'https://github.com/advisories/GHSA-r7g4-qg5f-qqm2',
    'OAuth2 transport auth is not used by the project mailer.',
  ],
  [
    'https://github.com/advisories/GHSA-p6gq-j5cr-w38f',
    'The project mailer does not pass raw messages, attachments, file paths, or URLs into Nodemailer.',
  ],
  [
    'https://github.com/advisories/GHSA-qx2v-qp2m-jg93',
    'PostCSS is nested under Next.js; application source does not parse or stringify user-controlled CSS.',
  ],
  [
    // 2026-07-24 신규 공개 — arbitrary file read during CSS parsing. next 16.2.11(최신)이 아직
    // 패치판 postcss를 동봉하지 않아 업그레이드 경로 부재. qx2v와 동일 도달성 논거: postcss는
    // Next 빌드 체인 내부에서만 실행되고 사용자 제어 CSS를 파싱하지 않는다. next 패치 릴리즈
    // 시 업그레이드로 전환할 것(만료일 exceptionExpiresOn이 재검토를 강제).
    'https://github.com/advisories/GHSA-6g55-p6wh-862q',
    'PostCSS is nested under Next.js (no patched Next release yet); build-time only, no user-controlled CSS is parsed.',
  ],
]);

function runAudit() {
  try {
    return execSync('npm audit --omit=dev --json', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const output = error.stdout?.toString();
    if (output) return output;
    throw error;
  }
}

function collectFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return collectFiles(fullPath);
    if (/\.(mjs|cjs|js|jsx|ts|tsx)$/.test(entry)) return [fullPath];
    return [];
  });
}

function assertNodemailerReachabilityGuard() {
  const mailerPath = path.join(repoRoot, 'src', 'lib', 'email', 'mailer.ts');
  const source = readFileSync(mailerPath, 'utf8');
  const forbiddenPatterns = [
    /\braw\s*:/,
    /\bjsonTransport\b/,
    /\blist\s*:/i,
    /\benvelope\s*:/,
    /\battachments\s*:/,
    /\balternatives\s*:/,
    /\bwatchHtml\s*:/,
    /\bicalEvent\s*:/,
    /\bamp\s*:/,
    /\bOAuth2\b/i,
  ];

  const failed = forbiddenPatterns.filter((pattern) => pattern.test(source));
  if (failed.length > 0) {
    throw new Error(
      `Nodemailer 예외 전제가 깨졌습니다. src/lib/email/mailer.ts 에서 금지 옵션을 제거하거나 취약점 예외를 재심사하세요: ${failed
        .map(String)
        .join(', ')}`,
    );
  }
}

function assertPostcssReachabilityGuard() {
  const sourceFiles = collectFiles(path.join(repoRoot, 'src'));
  const offenders = sourceFiles.filter((file) => {
    const source = readFileSync(file, 'utf8');
    return /from\s+['"]postcss['"]|require\(\s*['"]postcss['"]\s*\)/.test(source);
  });

  if (offenders.length > 0) {
    throw new Error(
      `PostCSS 예외 전제가 깨졌습니다. 사용자 CSS 파싱/직렬화 경로를 검토하세요: ${offenders
        .map((file) => path.relative(repoRoot, file))
        .join(', ')}`,
    );
  }
}

function collectAdvisories(name, vulnerabilities, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);

  const vulnerability = vulnerabilities[name];
  if (!vulnerability) return [];

  return vulnerability.via.flatMap((via) => {
    if (typeof via === 'string') return collectAdvisories(via, vulnerabilities, seen);
    return [via];
  });
}

function main() {
  if (today > exceptionExpiresOn) {
    throw new Error(
      `dependency audit 예외가 ${exceptionExpiresOn}에 만료되었습니다. Next/next-auth/nodemailer 업그레이드 또는 재승인이 필요합니다.`,
    );
  }

  assertNodemailerReachabilityGuard();
  assertPostcssReachabilityGuard();

  const audit = JSON.parse(runAudit());
  const vulnerabilities = audit.vulnerabilities ?? {};
  const failures = [];

  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    const advisories = collectAdvisories(name, vulnerabilities);
    if (advisories.length === 0) {
      failures.push(`${name}: advisory 세부 정보가 없어 예외 판정 불가`);
      continue;
    }

    const unknown = advisories.filter((advisory) => !allowedAdvisories.has(advisory.url));
    if (unknown.length > 0) {
      failures.push(
        `${name}: 허용되지 않은 advisory ${unknown.map((advisory) => advisory.url).join(', ')}`,
      );
      continue;
    }

    const uniqueUrls = [...new Set(advisories.map((advisory) => advisory.url))];
    console.log(
      `accepted ${name} (${vulnerability.severity}) via ${uniqueUrls.length} documented advisory exception(s)`,
    );
  }

  if (failures.length > 0) {
    throw new Error(`dependency audit 실패:\n- ${failures.join('\n- ')}`);
  }

  const count = Object.keys(vulnerabilities).length;
  console.log(
    `dependency audit gate passed: ${count} vulnerable package record(s) match documented temporary exceptions until ${exceptionExpiresOn}.`,
  );
}

main();
