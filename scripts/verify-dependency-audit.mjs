import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
// 2026-10-14: nodemailer 10.1.1 · next 16.4.0 · sharp 0.35.5 · uuid(override) 11.1.1 · 최신 lockfile 해소로
// 기존 예외(nodemailer·Next 하위 postcss·exceljs->uuid)가 전부 사라졌다. 현재 허용 예외는 없다.
// 새 advisory 예외가 꼭 필요하면 allowedAdvisories에 사유와 함께 추가하고 exceptionExpiresOn을 약 30일 뒤로 둔다.
const exceptionExpiresOn = '2026-11-14';
const today = new Date().toISOString().slice(0, 10);

const allowedAdvisories = new Map([]);
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
  if (allowedAdvisories.size > 0 && today > exceptionExpiresOn) {
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
