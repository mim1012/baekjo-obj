import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// wave6 회원 여정 커버리지 감사 — golden-crud-coverage.spec.ts(admin 도메인용)와 같은 사상을
// 회원 화면 기능 목록에 적용한다. 소스-계약 스타일(항상 켜짐)이라 E2E_ADMIN_CRUD나 실 staging
// 없이도 CI에서 항상 돈다 — 새 회원 기능이 추가·삭제됐는데 이 레지스트리가 갱신되지 않으면
// 실패해서 "실구동 커버리지 누락"을 사람 기억이 아니라 기계가 잡는다.

const root = path.resolve(__dirname, '..', '..');
const GOLDEN_SPEC_DIR = path.join(root, 'tests/golden');

interface CoveredFeature {
  spec: string;
  description: string;
}

/** 실제로 브라우저로 구동·검증하는 회원 여정 기능. */
const COVERED: Record<string, CoveredFeature> = {
  wishlist: {
    spec: 'member-wishlist.spec.ts',
    description: '찜하기(DB 동기화) — 토글·마이페이지 반영·새 컨텍스트 재로그인 유지·해제 확인.',
  },
  'order-journey': {
    spec: 'member-order-journey.spec.ts',
    description: '장바구니(수량변경·삭제)→무통장결제→완료→마이페이지 주문내역 실구동.',
  },
  'card-payment-boundary': {
    spec: 'member-card-payment-boundary.spec.ts',
    description: '카드결제 선택→토스 위젯 마운트까지(승인 자체는 경계 밖, 아래 EXCLUDED 참조).',
  },
  'review-lifecycle': {
    spec: 'member-review-inquiry.spec.ts',
    description: '구매평 작성→상세반영→수정→삭제(회원 라이프사이클).',
  },
  'inquiry-lifecycle': {
    spec: 'member-review-inquiry.spec.ts',
    description:
      '마이페이지발 상품문의 작성(상품 선택형)→반영→삭제. ' +
      'qna-admin-answer-path(상품상세발 작성→관리자 답변→공개반영)와 상호보완 — 중복 아님. ' +
      '🚨 2026-07-19 라이브 실행으로 재현·확정된 결함: 마이페이지에서 문의 "수정"은 저장 버튼이 ' +
      '영구 비활성화되어 절대 저장 불가(InquiryFormModal이 mypage 모드에서 productId를 못 받아 ' +
      'selectedProduct가 항상 undefined). 스펙이 이 결함을 우회하지 않고 그대로 단언·박제함 — ' +
      'app 수정은 mim-lane 범위 밖이라 team-lead에게 별도 보고 — fix/mypage-inquiry-edit-save 머지 후 ' +
      'assert 방향을 뒤집을 것(FLIP AFTER fix/mypage-inquiry-edit-save MERGES).',
  },
  profile: {
    spec: 'member-profile.spec.ts',
    description:
      '마이페이지 회원정보 수정 + 배송추적 모달 렌더. PR #171(fe/behavior-profile-save-wire, ' +
      '2026-07-18 머지)로 실배선 완료 — 이 스펙은 이제 서버(members 테이블) 실제 영속을 단언한다 ' +
      '(예전엔 localStorage만 반영되는 결함이 있어 "미영속"을 확인했었음, 2026-07-19 뒤집음).',
  },
  'password-change': {
    spec: 'member-password-change.spec.ts',
    description: '임시 이메일 회원 생성→마이페이지 비밀번호 변경→기존 비번 실패·새 비번 성공 실구동.',
  },
  'admin-edit-propagation': {
    spec: 'member-admin-edit-propagation.spec.ts',
    description:
      '관리자 수정이 회원 여정 "중간" 화면(장바구니·체크아웃)에 전파되는 방식 — 기존 웨이브들은 ' +
      '공개 상세 페이지 반영만 봤다. 가격·이름 수정은 장바구니/체크아웃에 실시간 반영(스냅샷 아님)되고 ' +
      '주문완료 이후엔 주문 시점 값이 고정됨을 확인. 노출 숨김은 장바구니/체크아웃에서 조용히 사라지되 ' +
      '헤더 카트 배지 개수는 그대로인 불일치를 finding으로 명시(2026-07-19 team-lead 추가 지시).',
  },
  diagnosis: {
    spec: 'member-diagnosis.spec.ts',
    description: '1분 맞춤 진단 전 여정(응답→결과/폴백 렌더). 읽기 전용·결정적.',
  },
  'qna-admin-answer-path': {
    spec: 'admin-crud-qna-inquiries.spec.ts',
    description: '상품상세발 회원 문의 작성→관리자 답변→공개 상품 Q&A 반영→회원 삭제 정리 실구동.',
  },
  'social-login-app-contract': {
    spec: 'member-social-login-contract.spec.ts',
    description: 'Kakao/Naver provider 등록, Auth.js 세션 매핑, /auth/complete 브릿지, 소셜계정 비번변경 차단 소스 가드.',
  },
};

/** 의도적으로 실구동 스펙을 만들지 않은 회원 기능 — 사유를 반드시 적는다. */
const EXCLUDED: Record<string, string> = {
  'card-payment-approval':
    '토스 결제위젯 내부(iframe, PG사 호스티드 UI)의 실제 카드 승인은 헤드리스로 자동화 대상이 아님. ' +
    'member-card-payment-boundary.spec.ts가 위젯 마운트 직전까지 검증하고, payments 스펙이 서버 승인/상태기 계약을 검증함.',
  'social-login': '카카오·네이버 외부 IdP OAuth 동의 화면은 자동화 불가. 앱 내부 provider/route 계약은 social-login-app-contract가 검증.',
};

test.describe('wave6 회원 여정 커버리지 감사', () => {
  test('COVERED 목록의 모든 스펙 파일이 실존한다', () => {
    const missing = Object.entries(COVERED)
      .filter(([, feature]) => !fs.existsSync(path.join(GOLDEN_SPEC_DIR, feature.spec)))
      .map(([key]) => key);
    expect(
      missing,
      `COVERED 레지스트리에 있지만 실제 스펙 파일이 없는 기능: [${missing.join(', ')}] — ` +
        '스펙을 삭제·이름변경한 뒤 이 레지스트리 갱신을 잊었을 수 있습니다.',
    ).toEqual([]);
  });

  test('COVERED/EXCLUDED 레지스트리에 최소 한 줄 사유·설명이 있다(빈 문자열 금지)', () => {
    const emptyCovered = Object.entries(COVERED).filter(([, f]) => f.description.trim().length === 0);
    const emptyExcluded = Object.entries(EXCLUDED).filter(([, reason]) => reason.trim().length === 0);
    expect(emptyCovered.map(([k]) => k)).toEqual([]);
    expect(emptyExcluded.map(([k]) => k)).toEqual([]);
  });
});
