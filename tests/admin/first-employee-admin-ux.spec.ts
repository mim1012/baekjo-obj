import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const source = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

test.describe('첫 직원용 관리자 입력·저장 흐름', () => {
  test('공통 관리창은 연결 화면·저장 대기·실패 유지·이름 포함 삭제 확인을 제공한다', () => {
    const resource = source('src', 'components', 'admin', 'AdminResourcePage.tsx');

    expect(resource).toContain('affectedScreen?: string;');
    expect(resource).toContain('등록하고 고객 화면에 반영');
    expect(resource).toContain('수정하고 고객 화면에 반영');
    expect(resource).toContain('const result = await onCreateRow(createDraft);');
    expect(resource).toContain('const result = await onUpdateRow(editingRow.id, editingDraft);');
    expect(resource).toContain('이 작업은 되돌릴 수 없습니다.');
    expect(resource).toContain("onMoveRow?: (id: string | number, direction: 'up' | 'down')");
    expect(resource).toContain('이 목록의 버튼 뜻');
    expect(resource).toContain('삭제 = 관리자와 연결된 고객 화면에서 제거');
    expect(resource).not.toContain('aria-label="고급 필터"');
    expect(resource).toContain('aria-label="수정 창 닫기"');
  });

  test('사용 안내는 1회 교육 순서·업무별 바로가기·용어·완료 기준을 제공한다', () => {
    const guide = source('src', 'app', 'admin', 'guide', 'page.tsx');
    const nav = source('src', 'components', 'admin-new', 'layout', 'adminNav.ts');
    const header = source('src', 'components', 'admin-new', 'layout', 'AdminHeader.tsx');

    expect(nav).toContain("name: '사용 안내', href: '/admin/guide'");
    expect(header).toContain('href="/admin/guide"');
    expect(guide).toContain('교육 결론: 아래 4단계를 한 번 실습하면');
    expect(guide).toContain('하려는 일로 메뉴 찾기');
    expect(guide).toContain('버튼과 상태의 정확한 뜻');
    expect(guide).toContain('첫 교육 완료 확인');
    expect(guide).toContain('주문·회원·고객 문의는 운영 기록');
  });

  test('모든 메뉴와 모호한 공통 입력칸 옆에 비개발자 설명이 보인다', () => {
    const nav = source('src', 'components', 'admin-new', 'layout', 'adminNav.ts');
    const sidebar = source('src', 'components', 'admin-new', 'layout', 'AdminSidebar.tsx');
    const field = source('src', 'components', 'admin-new', 'common', 'FormField.tsx');

    expect(nav).toContain('description:');
    expect(sidebar).toContain('{item.description}');
    expect(field).toContain('COMMON_FIELD_HELP');
    expect(field).toContain("'라이프스타일 분류':");
    expect(field).toContain("'계정 상태':");
    expect(field).toContain("'운송장 번호':");
  });

  test('고민·키트·후기는 구분자나 ID 직접 입력 대신 항목·선택 편집기를 사용한다', () => {
    const concerns = source('src', 'app', 'admin', 'concerns', 'page.tsx');
    const kits = source('src', 'app', 'admin', 'kits', 'page.tsx');
    const reviews = source('src', 'app', 'admin', 'reviews', 'page.tsx');

    expect(concerns).toContain("type: 'stringList'");
    expect(concerns).toContain("type: 'faqList'");
    expect(concerns).toContain("type: 'quickGuideList'");
    expect(concerns).not.toContain('확인 증상(쉼표 구분)');
    expect(concerns).not.toContain('FAQ(한 줄에 질문|답변');

    expect(kits).toContain("label: '주요 구성품', type: 'stringList'");
    expect(kits).toContain("label: '주요 구성품', type: 'stringList'");
    expect(kits).toContain('고객 화면에 실제로 보이는 케어 키트 카드를 관리합니다.');
    expect(kits).not.toContain('연결 제휴처');
    expect(kits).not.toContain('현재 재고 수량');

    expect(reviews).toContain("label: '연결 상품', type: 'select'");
    expect(reviews).toContain("label: '후기 사진', type: 'image'");
    expect(reviews).not.toContain('상품 ID(p1 형식)');
  });

  test('상품 고민 태그는 빠른 선택·화면 내 신규 등록이 되고 문의 답변은 화면 안에서 수정한다', () => {
    const productForm = source('src', 'components', 'admin-new', 'products', 'ProductForm.tsx');
    const productTags = source('src', 'lib', 'productTags', 'config.ts');
    const inquiries = source('src', 'app', 'admin', 'inquiries', 'page.tsx');

    expect(productForm).toContain('배변·생활·피부 같은 단어를 선택합니다.');
    expect(productForm).toContain('suggestions={productTagSuggestions}');
    expect(productForm).toContain('목록에 없는 새 태그 등록');
    expect(productForm).toContain('등록하고 이 상품에 선택');
    expect(productForm).toContain('공용 목록에 즉시 저장됩니다.');
    expect(productForm).toContain('상품 저장 버튼을 눌러야 확정됩니다.');
    expect(productForm).toContain('전체 태그 이름 수정·삭제·순서 변경');
    expect(productForm).not.toContain('label="검색용 일반 태그"');
    expect(productForm).toContain('전문가 콘텐츠 연결');
    expect(productForm).not.toContain('label="한 줄 설명"');
    expect(productForm).not.toContain('상품 카드에 노출될 짧은 설명');
    expect(productForm).toContain('상품 상세 → 상품 이야기 첫 설명');
    expect(productForm).toContain('고객 상품 상세 → 상품 정보 탭 → ‘상품 이야기’');
    expect(productForm).toContain('상품 카드에는 표시되지 않습니다.');
    expect(productForm).toContain('고객 화면에서 이 위치 확인');
    expect(productTags).toContain("{ slug: 'digestion', label: '배변'");
    expect(productTags).toContain("{ slug: 'living', label: '생활'");
    expect(productTags).toContain("{ slug: 'skin', label: '피부'");

    expect(inquiries).not.toContain('prompt(');
    expect(inquiries).toContain('답변 등록하고 고객에게 반영');
    expect(inquiries).toContain('수정 답변 저장');
    expect(inquiries).toContain('affectedScreen="상품상세(/shop/상품번호)의 문의 탭과 고객 마이페이지"');
    expect(inquiries).toContain('onDeleteRow={handleDelete}');
  });
});
