import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { FEATURES } from '@/config/features';
import { getSourceAuditReport, getSourceBrandContent } from '@/lib/brands/sourceContent';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test.describe('공개 콘텐츠 비노출 및 브랜드 정본 계약', () => {
  test('보험은 데이터와 화면 코드를 보존한 채 모든 공개 진입점에서 비노출된다', () => {
    expect(FEATURES.insurance).toBe(false);

    const proxy = read('src/proxy.ts');
    expect(proxy).toContain("pathname.startsWith('/insurance')");
    expect(proxy).toContain("pathname.startsWith('/landing/insurance')");

    const home = read('src/app/page.tsx');
    expect(home).toContain('FEATURES.insurance');
    expect(home).toContain(': publicHomeSettings');

    const sitemap = read('src/app/sitemap.ts');
    expect(sitemap).toContain("FEATURES.insurance ? ['/insurance', '/landing/insurance'] : []");

    const publicNotices = read('src/lib/notices/publicVisibility.ts');
    expect(publicNotices).toContain('if (FEATURES.insurance) return items;');
    expect(publicNotices).toContain("/보험|insurance/i");
  });

  test('8개 브랜드 공개 문구는 제공받은 정본 모듈만 사용한다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const source = read('src/lib/brands/sourceContent.ts');
    const migration = read('supabase/migrations/0113_penefit_brand_story_audit_source_copy.sql');
    const exactCopy = [
      '페네핏은 알레르기나 원료의 차이로 기존 제품을 먹기 어려운 아이를 외면하지 않습니다.',
      '하나의 레시피를 정답으로 두지 않는 제품 개발',
      '기호성뿐 아니라 필요한 영양까지 함께 고려하는 설계',
      '성분과 영양 정보를 투명하게 공개하는 기준',
      '성분과 영양 정보의 투명한 공개 확인',
      '반려동물 식품관리사 제품 설계 참여 확인',
      '알레르기를 고려한 레시피 개발 확인',
      '식품 제조·가공 기술 관련 등록 특허 확인',
      '연구개발전담부서 및 벤처기업 인증 확인',
      'HACCP 인증 시설 및 국내 생산 체계 확인',
    ];

    for (const copy of exactCopy) {
      expect(source).toContain(copy);
      expect(migration).toContain(copy);
    }

    for (const brandId of ['b1', 'b2', 'b3', 'b5', 'b6', 'b7', 'b8', 'b9']) {
      expect(source).toContain(`${brandId}: {`);
    }
    expect(detail).toContain("hasDetailedAudit ? '#brand-audit-report' : '/audit'");
    expect(detail).not.toContain('꼼꼼한 원료 선별');
    expect(detail).not.toContain('안전한 제조 공정');
    expect(detail).not.toContain('반려가족 중심 설계');
  });

  test('Audit 상세는 Summary를 만들지 않고 제공 문서의 Checkpoints를 표시한다', () => {
    const report = read('src/components/common/BrandAuditReport.tsx');
    const source = read('src/lib/brands/sourceContent.ts');

    expect(report).toContain('The Audit Checkpoints');
    expect(report).not.toContain('The Audit Summary');
    expect(report).not.toContain('summaryTitle');
    expect(report).not.toContain('reviewingTopics');
    expect(report).not.toContain('브랜드 자료를 살펴보고 있어요.');
    expect(report).toContain('if (!report) return null;');

    for (const exactCopy of [
      '사라진 냄새가 남긴 변화',
      '오미자 발효 부산물을 활용한 사료 첨가제 제조방법 등록 특허',
      '존중을 증명하는 기준',
      '동물의 입장에서 시작하는 브랜드 철학',
      '2024 벤처기업부 장관 표창',
    ]) {
      expect(source).toContain(exactCopy);
    }
    expect(source).toContain("brand.id === 'b1'");
    expect(source).toContain("headline: brand.auditReport.headline || '성분을 감추지 않는 자신감'");
  });

  test('관리자 DB 문구가 290 정본보다 우선해 공개 화면 데이터로 전달된다', () => {
    const brandContent = getSourceBrandContent({
      id: 'b1',
      philosophy: 'DB 브랜드 철학',
      highlights: ['DB 하이라이트'],
      auditPoints: ['DB 확인 항목'],
      summaryCategoryLabel: 'DB 카테고리',
      summaryCategoryNote: 'DB 카테고리 설명',
      summaryConcernLabel: 'DB 고민',
      summaryConcernNote: 'DB 고민 설명',
    });
    expect(brandContent).toMatchObject({
      philosophy: 'DB 브랜드 철학',
      highlights: ['DB 하이라이트'],
      auditPoints: ['DB 확인 항목'],
      summaryCategoryLabel: 'DB 카테고리',
      summaryConcernLabel: 'DB 고민',
    });

    const auditReport = getSourceAuditReport({
      id: 'b2',
      auditReport: {
        reportNo: 'DB-REPORT',
        auditedAt: '2026.08',
        status: 'Audit Completed',
        headline: 'DB 헤드라인',
        summaryTitle: 'DB 요약 제목',
        summary: 'DB 요약',
        selectionReason: 'DB 선정 이유',
        process: ['DB 프로세스'],
        checkpoints: ['DB 체크포인트'],
        materialReview: ['DB 소재 검토'],
        curatorNote: ['DB 큐레이터 노트'],
      },
    });
    expect(auditReport).toMatchObject({
      headline: 'DB 헤드라인',
      process: ['DB 프로세스'],
      checkpoints: ['DB 체크포인트'],
      materialReview: ['DB 소재 검토'],
      curatorNote: ['DB 큐레이터 노트'],
    });
  });
});
