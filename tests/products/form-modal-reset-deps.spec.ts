import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

// 상품문의/구매평 작성 모달 리셋 effect 회귀 스펙 — 소스 어서션(브라우저 불필요).
//
// 버그(2026-07-18 wave-3 e2e 실측, 스크린샷으로 라이브 확인): 모달을 열어 문의를 타이핑하는 중에
// 부모가 리렌더되면(폴링·다른 상태 변화 등) 폼이 소리 없이 비워졌다. 원인은 리셋 useEffect 의
// deps 배열에 매 렌더 새로 만들어지는 객체 리터럴(initialData·product)이 그대로 들어 있었던 것 —
// 참조가 매번 달라지니 "모달이 열렸을 때만" 재동기화해야 할 effect 가 부모 리렌더마다 재발화됐다.
// 고침: deps 를 객체 참조가 아니라 그 안의 원시값(title·content·isSecret·rating·id 등)으로 바꾼다.
// 같은 클래스의 버그를 스윕한 결과 ReviewFormModal(마이페이지 구매평 수정)에도 동일 패턴이 있어
// 같이 고쳤다 — AdminMobileNav/FilterDrawer/TrackingModal 등 나머지 `[isOpen, ...]` effect 들은
// isOpen(원시값)이나 안정적인 콜백만 의존해 해당 없음을 확인했다.

test.describe('상품문의·구매평 모달 리셋 effect — deps 원시값화 회귀', () => {
  test('InquiryFormModal 은 initialData/product 전체가 아니라 원시 필드만 deps 에 넣는다', () => {
    const modalSource = src('src', 'components', 'inquiries', 'InquiryFormModal.tsx');

    // 버그였던 형태(객체 전체를 deps 에) 로 되돌아가지 않는지 고정한다.
    expect(modalSource).not.toContain('}, [isOpen, initialData, product]);');
    expect(modalSource).toContain(
      '}, [isOpen, initialData?.title, initialData?.content, initialData?.isSecret, product?.id]);',
    );
  });

  test('ReviewFormModal 도 동일 클래스 버그가 있었다 — initialData 전체가 아니라 원시 필드만 deps 에 넣는다', () => {
    const modalSource = src('src', 'components', 'reviews', 'ReviewFormModal.tsx');

    expect(modalSource).not.toContain('}, [isOpen, initialData]);');
    expect(modalSource).toContain('}, [isOpen, initialData?.rating, initialData?.title, initialData?.content]);');
  });

  test('ProductTabsClient 는 InquiryFormModal 에 넘기는 product 객체를 useMemo 로 참조 안정화한다(defense in depth)', () => {
    const clientSource = src('src', 'components', 'shop', 'ProductTabsClient.tsx');

    expect(clientSource).toContain("import { useState, useEffect, useMemo, useRef } from 'react';");
    expect(clientSource).toContain('const inquiryProduct = useMemo(');
    expect(clientSource).toContain(
      '[product.id, product.name, product.image, product.brandName, product.brandId]',
    );
    expect(clientSource).toContain('product={inquiryProduct}');
    // 매 렌더 새 리터럴을 만들던 예전 형태로 되돌아가지 않는지 고정.
    expect(clientSource).not.toMatch(/product=\{\{\s*id: product\.id,/);
  });
});
