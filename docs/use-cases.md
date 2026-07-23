# 백조오브제 유스케이스 점검표 (도메인별)

> 작성: 2026-07-23. 목적: **각 도메인별 기능을 유스케이스 단위로 점검**하기 위한 체크리스트.
> 출처: `src/app/**/page.tsx` 59개 · `src/app/api/**/route.ts` 85개 실측 + AGENTS.md §7 골든플로우.
> 점검 방법: 각 항목의 ☐ 를 점검 후 ☑ 로 바꾸고, 이상 발견 시 "비고"에 기록.
> 검증 스펙 열은 해당 유스케이스를 자동 검증하는 Playwright 스펙(`tests/`)이다 — 스펙이 없는 항목은 수동 점검 대상.
> **스펙 유무·CI 배선 전수 대장: [`docs/testing/golden-spec-coverage.md`](./testing/golden-spec-coverage.md)** (있는 것/없는 것/있는데 CI에서 안 도는 것 전부 명시).

---

## 1. 홈 · 콘텐츠

| # | 유스케이스 | 액터 | 시나리오 (트리거 → 기대 결과) | 검증 스펙 | 점검 |
|---|---|---|---|---|---|
| 1-1 | 홈 렌더 | 방문자 | `/` 접속 → 히어로·추천 상품·브랜드·쇼케이스 리뷰 섹션 렌더 (DB 소스) | golden/home.spec.ts | ☐ |
| 1-2 | 홈 설정 반영 | 관리자 | `/admin/settings`(홈 설정) 저장 → 공개 홈에 즉시 반영 | golden/admin-crud-home-settings.spec.ts | ☐ |
| 1-3 | 공지 목록/상세 | 방문자 | `/notices` → `/notices/[id]` 상세 열람 | golden/admin-crud-notices.spec.ts, admin/notice-binding-flow.spec.ts | ☐ |
| 1-4 | 고민케어 콘텐츠 | 방문자 | `/concerns` → `/concerns/[slug]` 상세 열람 (DB 소스) | golden/admin-crud-concerns.spec.ts | ☐ |
| 1-5 | 쇼케이스 리뷰 | 방문자 | `/reviews` 열람 — 관리자 `/admin/reviews` 편집이 반영 | golden/admin-crud-showcase-reviews.spec.ts | ☐ |
| 1-6 | 전문가/감사 페이지 | 방문자 | `/experts`, `/audit` 정적 렌더 | visual.spec.ts(일부) | ☐ |
| 1-7 | 법무 페이지 | 방문자 | `/terms`, `/privacy`, `/refund-policy` 렌더 | products/legal-readiness.spec.ts | ☐ |

## 2. 맞춤 진단 (골든플로우 #1)

| # | 유스케이스 | 액터 | 시나리오 | 검증 스펙 | 점검 |
|---|---|---|---|---|---|
| 2-1 | 진단 응답→결과 | 방문자 | `/diagnosis` 설문 응답 → `/diagnosis/result`에 매칭 상품+보험 추천 렌더 | golden/diagnosis.spec.ts | ☐ |
| 2-2 | 회원 진단 이력 | 회원 | 로그인 상태 진단 → 결과가 회원에 귀속, 마이페이지/관리자에서 조회 | golden/member-diagnosis.spec.ts | ☐ |
| 2-3 | 설문 문항 관리 | 관리자 | `/admin/survey` 문항·규칙 편집 → 공개 진단에 반영 | golden/admin-crud-survey.spec.ts | ☐ |
| 2-4 | 진단 결과 집계 | 관리자 | `/admin/survey-results` 응답 목록 조회 | admin/route-coverage-audit.spec.ts | ☐ |

## 3. 스토어 · 구매 여정 (골든플로우 #2)

| # | 유스케이스 | 액터 | 시나리오 | 검증 스펙 | 점검 |
|---|---|---|---|---|---|
| 3-1 | 상품 목록/필터 | 방문자 | `/shop` 목록 → 카테고리·필터 동작, SSR(검색로봇에 완성 html) | golden/shop.spec.ts | ☐ |
| 3-2 | 상품 상세 | 방문자 | `/shop/[id]` → 이미지·옵션·detailBlocks 상세 본문·구매 정보 렌더 | golden/product-detail-actions.spec.ts | ☐ |
| 3-3 | 장바구니 담기/수정 | 방문자 | 상세 → 옵션 선택 → 담기 → `/cart`에서 수량 변경·삭제, 배지 동기화 | golden/cart-badge-failure-safety.spec.ts, admin/cart-badge-visibility-sync.spec.ts | ☐ |
| 3-4 | 주문서 작성 | 회원 | `/cart` → `/checkout` 배송지·결제수단 입력 → 주문 생성 | golden/purchase.spec.ts | ☐ |
| 3-5 | 주문 완료 | 회원 | 결제 후 `/order-complete` 주문번호·안내 렌더 | golden/purchase.spec.ts | ☐ |
| 3-6 | 위시리스트 | 회원 | 하트 토글 → `localStorage(baekjo_wishlist)` + `/api/wishlist` 동기화 | golden/member-wishlist.spec.ts | ☐ |
| 3-7 | 상품 리뷰 작성/열람 | 회원 | 구매 상품에 리뷰 작성 → 상세 페이지 노출, 별점 집계 갱신(트리거 0070) | golden/member-review-inquiry.spec.ts, admin/purchase-review-eligibility.spec.ts | ☐ |
| 3-8 | 상품 Q&A | 회원 | 상세에서 문의 작성 → 관리자 답변 → 재열람 | golden/member-review-inquiry.spec.ts, golden/admin-crud-qna-inquiries.spec.ts | ☐ |

**알려진 제약:** 옵션별 재고 미구현(보류 — memory `option-stock-dorami-blueprint`). 재고는 상품 단위.

## 4. 결제 (무통장 / 토스)

| # | 유스케이스 | 액터 | 시나리오 | 검증 스펙 | 점검 |
|---|---|---|---|---|---|
| 4-1 | 무통장입금 주문 | 회원 | checkout 무통장 선택 → 주문 `입금대기` 생성 → 관리자 입금확인 → `결제완료` | payments/state-machine.db.spec.ts | ☐ |
| 4-2 | 입금 기한 만료 회수 | 시스템 | cron `/api/cron/reclaim-stock` → 기한 초과 주문 재고 원복 | products/order-reservation-expiry.spec.ts | ☐ |
| 4-3 | 토스 카드 결제 | 회원 | checkout 카드 → 토스 위젯 → `/api/payments/confirm` 승인 → `결제완료` | payments/state-machine.db.spec.ts | ☐ |
| 4-4 | 승인중 크래시 복구 | 시스템 | cron `/api/cron/reconcile-confirming` → `승인중` 고아 주문 정리 | payments/state-machine.db.spec.ts | ☐ |
| 4-5 | 결제 취소/환불 | 관리자 | 주문 상세에서 취소 → Toss 취소 API + RPC 0050 재고복원 원자 처리 | admin/payment-transition-guard.spec.ts | ☐ |
| 4-6 | 웹훅 수신 | 시스템 | `/api/payments/webhook` 상태 동기화 | payments 프로젝트 | ☐ |

**알려진 제약:** **카드 결제는 라이브 키 미등록 — 현재 무통장+리드수집만 런칭 가능**(2026-07-22 운영가능성 감사 결론). 무통장 72h 안내 문구 운영 결정 대기.

## 5. 배송

| # | 유스케이스 | 액터 | 시나리오 | 검증 스펙 | 점검 |
|---|---|---|---|---|---|
| 5-1 | 브랜드별 송장 등록 | 관리자 | `/admin/orders/[id]` 브랜드 묶음별 택배사·송장 입력 → 저장 | admin/order-shipments-bundle.spec.ts, golden/admin-crud-order-shipments.spec.ts | ☐ |
| 5-2 | 배송 타임라인 | 회원 | 마이페이지 주문에서 배송 상태 타임라인 열람 | shipments/timeline.spec.ts, derive.spec.ts | ☐ |
| 5-3 | 구매확정 (수동) | 회원 | 배송완료 건 `구매확정` 클릭 → 확정 처리, 미결제 건 차단 | shipments/confirm-guard.db.spec.ts | ☐ |
| 5-4 | 구매확정 (자동) | 시스템 | cron `/api/cron/auto-confirm-shipments` → 기한 경과 자동 확정(결제 게이트) | shipments/auto-confirm-payment-gate.db.spec.ts | ☐ |

**알려진 제약:** 스윗트래커 실배선 미완(FREE 100건/월 — 실서비스 불가, 어댑터만 존재). orderStatus/deliveryStatus 역전이 가드 P1 백로그.

## 6. 펫보험 (골든플로우 #3)

| # | 유스케이스 | 액터 | 시나리오 | 검증 스펙 | 점검 |
|---|---|---|---|---|---|
| 6-1 | 보험 소개/랜딩 | 방문자 | `/insurance`, `/landing/insurance` 렌더 (콘텐츠는 DB — `/admin/insurance-content`) | golden/admin-crud-insurance-content.spec.ts, admin/insurance-landing-decoy-fix.spec.ts | ☐ |
| 6-2 | 보험 추천 | 방문자 | `/insurance/recommend` 입력 → 추천 결과 | golden/diagnosis.spec.ts(간접) | ☐ |
| 6-3 | 보험 상담 신청 | 방문자/회원 | `/insurance/apply` 제출(증권 파일 첨부 가능) → `/insurance/complete` → 관리자 알림 메일 | golden/admin-crud-insurance-cert.spec.ts | ☐ |
| 6-4 | 증권 업로드/열람 보안 | 관리자 | 증권은 비공개 버킷(0060) — 게스트 열람 401, 관리자만 signed URL 열람 | golden/admin-crud-insurance-cert.spec.ts | ☐ |
| 6-5 | 상담 관리/PII 파기 | 관리자 | `/admin/insurance/[id]` 상태 관리 → 삭제 시 스토리지 선삭제 후 행 삭제 | golden/admin-crud-insurance-cert.spec.ts | ☐ |
| 6-6 | 내 보험 신청 조회 | 회원 | 마이페이지에서 `/api/insurance/mine` 신청 이력 열람 | golden/mypage.spec.ts | ☐ |

## 7. 브랜드관 (골든플로우 #4)

| # | 유스케이스 | 액터 | 시나리오 | 검증 스펙 | 점검 |
|---|---|---|---|---|---|
| 7-1 | 브랜드 목록 | 방문자 | `/brands` 목록 렌더 | golden/brands.spec.ts | ☐ |
| 7-2 | 브랜드 상세 | 방문자 | `/brands/[id]` — 스토리·감사 리포트(auditReport)·브랜드 상품 목록 | golden/brands.spec.ts, golden/admin-crud-brand-fields.spec.ts | ☐ |

## 8. 케어키트 B2B (골든플로우 #5)

| # | 유스케이스 | 액터 | 시나리오 | 검증 스펙 | 점검 |
|---|---|---|---|---|---|
| 8-1 | 케어키트 랜딩 | 방문자 | `/landing/care-kit`, `/b2b` 렌더 (키트 구성은 `/admin/kits`) | golden/care-kit.spec.ts, golden/admin-crud-kits-partners.spec.ts | ☐ |
| 8-2 | 파트너 신청 제출 | 방문자 | 랜딩 폼 제출 → `/api/partner-inquiries` 저장 | golden/admin-crud-partner-inquiries.spec.ts | ☐ |
| 8-3 | 파트너 문의 관리 | 관리자 | `/admin/partner-inquiries` 목록·상태 처리 | admin/partner-inquiry-binding-flow.spec.ts | ☐ |
| 8-4 | 파트너(업체) 관리 | 관리자 | `/admin/partners` CRUD, 파트너 상품 API(`/api/partner/products`) | admin/partner-binding-flow.spec.ts, partner-type-policy.spec.ts | ☐ |

## 9. 회원 (골든플로우 #6)

| # | 유스케이스 | 액터 | 시나리오 | 검증 스펙 | 점검 |
|---|---|---|---|---|---|
| 9-1 | 이메일 가입 | 방문자 | `/signup` → 이메일 인증(`/verify-email`) → `active` 전환 → 로그인 가능 | golden/auth.spec.ts | ☐ |
| 9-2 | 소셜 로그인 | 방문자 | 카카오/네이버 → `/auth/complete` — role은 `user` 고정(admin 불가) | golden/member-social-login-contract.spec.ts | ☐ |
| 9-3 | 로그인/세션 유지 | 회원 | `/login` → 마이페이지 이동에도 세션 유지 (JWT) | golden/auth.spec.ts | ☐ |
| 9-4 | 비밀번호 재설정 | 회원 | `/forgot-password` → 메일 링크 → `/reset-password` 변경 | golden/member-password-change.spec.ts | ☐ |
| 9-5 | 프로필/비번 변경 | 회원 | 마이페이지에서 `/api/members/me`·`password` 수정 | golden/member-profile.spec.ts | ☐ |
| 9-6 | 마이페이지 종합 | 회원 | 주문 이력·리뷰·문의·보험 신청·위시리스트 탭 렌더 | golden/mypage.spec.ts, admin/mypage-orders-rendering.spec.ts | ☐ |
| 9-7 | 사업자 전환 신청 | 회원 | `/api/members/business` + 서류 업로드 → 관리자 승인 | admin/member-signup-data-summary.spec.ts | ☐ |
| 9-8 | 정지/탈퇴 | 회원·관리자 | 정지 시 세션 실효(`requireActiveMember`), 소프트탈퇴(PII 익명화, 0054), 소셜 재가입 우회 차단 | golden/member-admin-edit-propagation.spec.ts | ☐ |

## 10. 1:1 문의 · QnA

| # | 유스케이스 | 액터 | 시나리오 | 검증 스펙 | 점검 |
|---|---|---|---|---|---|
| 10-1 | 1:1 문의 작성/수정 | 회원 | 문의 제출(`/api/inquiries`) → 마이페이지에서 수정·삭제 | golden/member-inquiry-edit-save.spec.ts | ☐ |
| 10-2 | 문의 답변 | 관리자 | `/admin/inquiries` 답변 등록 → 회원 열람 | golden/admin-crud-qna-inquiries.spec.ts | ☐ |
| 10-3 | QnA 콘텐츠 | 관리자 | `/admin/qna` 편집 → 공개 화면 반영 (`qna_config` DB) | golden/admin-crud-qna-config.spec.ts, admin/qna-public-wire-binding-flow.spec.ts | ☐ |

## 11. 관리자 콘솔 (골든플로우 #7 — 클라이언트 주 사용 surface)

| # | 유스케이스 | 액터 | 시나리오 | 검증 스펙 | 점검 |
|---|---|---|---|---|---|
| 11-1 | 관리자 접근 가드 | 관리자 | 비로그인 `/admin` → `/login?error=admin`, API는 401/403 JSON (proxy + requireAdmin 이중) | admin/route-coverage-audit.spec.ts | ☐ |
| 11-2 | 대시보드 | 관리자 | `/admin` 통계 카드·차트 렌더 | admin/dashboard-stats.spec.ts | ☐ |
| 11-3 | 상품 CRUD | 관리자 | 등록(`/new`)·수정·상세 에디터(detailBlocks)·진열(`/display`)·일괄 처리 | golden/admin-crud-products.spec.ts, products/form-payload.spec.ts 외 | ☐ |
| 11-4 | 브랜드 CRUD | 관리자 | 목록·상세 편집(로고·auditReport 포함) | golden/admin-crud-brands.spec.ts, admin/brand-binding-flow.spec.ts | ☐ |
| 11-5 | 주문 관리 | 관리자 | 목록 검색·상태 변경(전이 가드)·상세·배송 등록 | admin/order-search.spec.ts, order-status-axis.spec.ts, order-funnel.spec.ts | ☐ |
| 11-6 | 주문 정책 | 관리자 | `/admin/order-policy` 무통장 기한 등 정책 저장 | golden/admin-crud-order-policy.spec.ts | ☐ |
| 11-7 | 회원 관리 | 관리자 | 목록·상세·상태 전이(정지 매트릭스)·서류 열람 | golden/member-admin-edit-propagation.spec.ts | ☐ |
| 11-8 | 리뷰 검수 | 관리자 | `/admin/reviews` moderation → 공개/숨김, 별점 재계산 | golden/admin-crud-reviews-moderation.spec.ts, admin/admin-reviews-moderation-contract.spec.ts | ☐ |
| 11-9 | 콘텐츠 관리 | 관리자 | 공지·concerns·카테고리·설정·insurance-content·showcase-reviews 각 CRUD 즉시저장 | golden/admin-crud-*.spec.ts 일괄 | ☐ |
| 11-10 | 파일 업로드 | 관리자 | `/api/admin/upload` 이미지 업로드 정책(확장자·크기) | admin/admin-upload-policy.spec.ts | ☐ |
| 11-11 | CRUD 커버리지 감사 | 시스템 | 신규 admin 도메인의 골든 스펙 부재를 CI가 적발 | admin/golden-crud-coverage.spec.ts, full-surface-crud-coverage.spec.ts | ☐ |

---

## 점검 운영 방법

1. **환경**: staging(`aeooyivfijthfcrfrnyk`)에서 점검. 계정은 memory `baekjo-agent-team-ops` 참조(테스트 계정 2종). staging 마이그레이션 드리프트(0050~0070)는 2026-07-23 정식 러너로 적용 완료 — `_migrations` 최신 0070.
2. **자동 커버 항목**: 검증 스펙이 있는 항목은 `npx playwright test <스펙> --project=<chromium|admin>`으로 재확인 가능. 전체는 CI `golden-crud.yml`이 상시 실행.
3. **수동 점검 우선순위**: `golden-spec-coverage.md` §5의 G1~G12(스펙 자체가 없는 기능) + 알려진 제약 박스의 미완 기능. (§4 CI 미배선은 2026-07-23 배선 수리 완료)
4. **결과 기록**: 점검 완료 시 이 파일 체크박스 갱신 + 발견 이슈는 SESSION.md 다음 액션에 등재.
