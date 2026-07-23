# 골든스펙 커버리지 전수 문서

> 작성: 2026-07-23. 목적: **스펙이 있는 기능과 없는 기능을 전부 명시**한다.
> 실측 근거: `tests/**/*.spec.ts` 123개 파일 + `.github/workflows/*.yml` 5개 + `playwright.config.ts` 프로젝트 정의.
> 유스케이스 정의는 [`docs/use-cases.md`](../use-cases.md) — 이 문서는 그 유스케이스에 스펙을 1:1로 붙인 커버리지 대장이다.

---

## 0. 요약

| 구분 | 수 |
|---|---|
| 스펙 파일 전체 | **123** (golden 47 · admin 48 · products 19 · shipments 6 · payments 2 · tracking 1) |
| CI에서 실제로 도는 스펙 | products 19 + admin 48 (매 PR `verify`) · payments 2 · **shipments 6 + tracking 1 (2026-07-23 배선)** · golden-crud 배선 **33** · visual 2 · smoke 1 |
| **스펙은 있는데 CI에서 안 도는 것** | ~~shipments 6 + tracking 1 + member 3~~ **→ 2026-07-23 전부 배선 수리(§4)**. 남은 것: chromium 골든 11 (§4-3, 의도된 수동 게이트) |
| 스펙 자체가 없는 기능 | §5 목록 (실메일 루프, 실 카드결제, 실 환불, 스윗트래커 실폴링 등) |

## 1. 실행 계층 지도 — "어느 스펙이 언제 도는가"

| 계층 | 실행 주체 | 대상 | 트리거 |
|---|---|---|---|
| 소스-계약 테스트 | `ci.yml` (`verify` job) | `--project=products` (19개) · `--project=admin` (48개) | **매 PR·매 push** (required check) |
| 결제 DB 상태기계 | `ci.yml` (`payments-db-spec` job) | `tests/payments/state-machine.db.spec.ts` | 매 PR |
| 실구동 CRUD | `golden-crud.yml` (`golden-crud` 프로젝트) | `admin-crud-*` 23개 + `member-*` 7개 (파일 경로 명시 스텝) | Preview 배포 성공 시, **변경-경로 매핑 게이트** (dispatch all=true로 전체 스윕 가능) |
| 전 페이지 스모크 | `golden-crud.yml` (`golden-smoke`/`-mobile`) | `all-pages-smoke.spec.ts` | Preview 배포마다 **항상** (데스크톱+모바일) |
| 시각 회귀 | `visual.yml` | `visual.spec.ts` (14장) + `cart-badge-failure-safety` + `payments/payment-routes` | Preview 배포마다 |
| 베이스라인 갱신 | `update-baselines.yml` | `visual.spec.ts --update-snapshots` | 라벨/수동 dispatch |
| 배송·추적 소스-계약 | `ci.yml` (tracking→`verify`, shipments 6개→`payments-db-spec` staging env) | `--project=shipments`(6) · `--project=tracking`(1) | 매 PR (2026-07-23 배선) |
| **CI 미배선 (수동 게이트 전용)** | 없음 | chromium 골든 behavioral 11개 | §8-6 게이트에서 수동/에이전트 실행 (의도된 운영) |

⚠️ `golden-crud.yml`은 **파일 경로 명시 실행**이다 — 스펙을 새로 만들어도 yml에 스텝을 추가하지 않으면 영원히 안 돈다(#203에서 `admin-crud-order-shipments`가 실제로 그렇게 죽어 있었음). 파일단위 배선 감사(`tests/admin/golden-crud-coverage.spec.ts`)가 `admin-crud-*`에 한해 이를 CI에서 강제한다. **`member-*`는 감사 범위 밖**(§4-2).

## 2. 유스케이스 ↔ 스펙 매핑 (있는 것들)

표기: 🟢 실구동(브라우저로 진짜 클릭, CI 배선됨) · 🟡 소스-계약(순수 함수/타입, 매 PR) · 🔵 실구동이지만 CI 미배선(로컬 전용) · ⚪ 스모크/시각만

### 2-1. 홈 · 콘텐츠
| 유스케이스 | 스펙 | 계층 |
|---|---|---|
| 홈 렌더 | golden/home.spec.ts | 🔵 + ⚪(smoke·visual) |
| 홈 설정 저장→공개 반영 | golden/admin-crud-home-settings.spec.ts (스냅샷/복원) | 🟢 |
| 홈 문구 배선 계약 | admin/home-binding-flow.spec.ts · site-settings-binding-flow.spec.ts | 🟡 |
| 공지 CRUD→공개 | golden/admin-crud-notices.spec.ts / admin/notice-binding-flow.spec.ts | 🟢 / 🟡 |
| 고민케어 CRUD→공개 | golden/admin-crud-concerns.spec.ts / admin/concern-binding-flow.spec.ts | 🟢 / 🟡 |
| 쇼케이스 리뷰 CRUD→공개 | golden/admin-crud-showcase-reviews.spec.ts / admin/showcase-review-binding-flow.spec.ts | 🟢 / 🟡 |
| 정적 콘텐츠 배선 | admin/content-binding-flow.spec.ts | 🟡 |
| 법무 페이지 표기 의무 | products/legal-readiness.spec.ts | 🟡 |
| 전 페이지 렌더(experts·audit 포함) | golden/all-pages-smoke.spec.ts | ⚪ 항상 |

### 2-2. 맞춤 진단
| 유스케이스 | 스펙 | 계층 |
|---|---|---|
| 진단→결과 렌더 | golden/diagnosis.spec.ts | 🔵 |
| 회원 진단(결정적, 읽기전용) | golden/member-diagnosis.spec.ts | 🟢 |
| 설문 문항 관리(스냅샷/복원) | golden/admin-crud-survey.spec.ts | 🟢 |
| 진단 추천 선택 리다이렉트 설정 | products/selection-redirect-config.spec.ts | 🟡 |

### 2-3. 스토어 · 구매
| 유스케이스 | 스펙 | 계층 |
|---|---|---|
| 상품 목록/필터 | golden/shop.spec.ts / products/product-list-order-determinism.spec.ts | 🔵 / 🟡 |
| 상품 상세 액션(담기·찜) | golden/product-detail-actions.spec.ts | 🔵 |
| 장바구니 배지 안전성 | golden/cart-badge-failure-safety.spec.ts (visual.yml) / admin/cart-badge-visibility-sync.spec.ts | 🟢 / 🟡 |
| 장바구니 브랜드명 배선 | admin/cart-brandname-binding-flow.spec.ts | 🟡 |
| **구매 여정 실구동(무통장)** | golden/member-order-journey.spec.ts | 🟢 |
| 구매 여정(구형 behavioral) | golden/purchase.spec.ts | 🔵 |
| 위시리스트 DB 동기화 | golden/member-wishlist.spec.ts | 🟢 |
| 회원 전용 주문 가드 | products/member-only-order.spec.ts | 🟡 |
| 주문 rate limit | products/order-rate-limit.spec.ts | 🟡 |
| 주문 옵션 항목 | products/order-item-option.spec.ts | 🟡 |
| **구매평·상품문의 라이프사이클** | golden/member-review-inquiry.spec.ts | 🟢 |
| 구매평 자격(구매확정 후) | admin/purchase-review-eligibility.spec.ts | 🟡 |
| 관리자 수정→장바구니·체크아웃 전파 | golden/member-admin-edit-propagation.spec.ts | 🟢 |

### 2-4. 결제
| 유스케이스 | 스펙 | 계층 |
|---|---|---|
| 상태기계 전이 전체(DB) | payments/state-machine.db.spec.ts | 🟡 매 PR (DB 실구동) |
| 결제 라우트 계약 | payments/payment-routes.spec.ts (visual.yml) | 🟡 |
| 결제 전이 가드(관리자) | admin/payment-transition-guard.spec.ts · order-status-axis.spec.ts | 🟡 |
| Toss 취소 헬퍼 | admin/toss-cancel-helpers.spec.ts | 🟡 |
| 카드결제 위젯 경계 | golden/member-card-payment-boundary.spec.ts | 🟢 (위젯 로드까지 — 실승인 아님) |
| 무통장 기한 만료 재고 회수 | products/order-reservation-expiry.spec.ts | 🟡 |
| 주문 정책 설정 | golden/admin-crud-order-policy.spec.ts / products/order-policy-config.spec.ts | 🟢 / 🟡 |

### 2-5. 배송 (2026-07-23 CI 배선 수리 완료)
| 유스케이스 | 스펙 | 계층 |
|---|---|---|
| 송장 등록·배송 묶음 실구동 | golden/admin-crud-order-shipments.spec.ts (#203에서 배선됨) | 🟢 |
| 배송 묶음 소스 계약 | admin/order-shipments-bundle.spec.ts | 🟡 |
| 배송 상태 파생·타임라인 | shipments/derive.spec.ts · timeline.spec.ts | 🟡 (payments-db-spec 잡) |
| 구매확정 가드 | shipments/confirm-guard.spec.ts · confirm-guard.db.spec.ts | 🟡 (db는 staging) |
| 자동 구매확정 결제 게이트 | shipments/auto-confirm-payment-gate.spec.ts · .db.spec.ts | 🟡 (db는 staging) |
| 스윗트래커 어댑터 | tracking/sweettracker.spec.ts | 🟡 (verify 잡) |

### 2-6. 펫보험
| 유스케이스 | 스펙 | 계층 |
|---|---|---|
| 보험 플로우(recommend→apply) | golden/insurance.spec.ts | 🔵 |
| 상담 신청 상태 관리 | golden/admin-crud-insurance.spec.ts | 🟢 |
| **증권 업로드→signed URL→PII 파기** | golden/admin-crud-insurance-cert.spec.ts (#203) | 🟢 (스토리지 직접검증은 STAGING_SUPABASE_* 시크릿 등록 시) |
| 증권·알림 소스 계약 | admin/insurance-cert-pii-notify.spec.ts | 🟡 |
| 보험 콘텐츠 CRUD→공개 | golden/admin-crud-insurance-content.spec.ts / admin/insurance-content-binding-flow.spec.ts | 🟢 / 🟡 |
| 랜딩 미끼버튼 픽스 | admin/insurance-landing-decoy-fix.spec.ts | 🟡 |

### 2-7. 브랜드관
| 유스케이스 | 스펙 | 계층 |
|---|---|---|
| 브랜드 목록/상세 | golden/brands.spec.ts | 🔵 |
| 브랜드 CRUD | golden/admin-crud-brands.spec.ts / admin/brand-binding-flow · brand-validate · brand-detail-payload | 🟢 / 🟡 |
| 브랜드 폼 전 필드 왕복 | golden/admin-crud-brand-fields.spec.ts | 🟢 |
| 브랜드 네이밍 규칙 | products/brand-naming.spec.ts | 🟡 |

### 2-8. 케어키트 B2B
| 유스케이스 | 스펙 | 계층 |
|---|---|---|
| 랜딩 렌더·폼 | golden/care-kit.spec.ts | 🔵 |
| 키트·제휴처 CRUD(영속성) | golden/admin-crud-kits-partners.spec.ts / admin/partner-binding-flow · partner-type-policy | 🟢 / 🟡 |
| 제휴 문의 제출→관리 | golden/admin-crud-partner-inquiries.spec.ts / admin/partner-inquiry-binding-flow.spec.ts | 🟢 / 🟡 |

### 2-9. 회원
| 유스케이스 | 스펙 | 계층 |
|---|---|---|
| 가입→로그인→세션 | golden/auth.spec.ts | 🔵 |
| 소셜 로그인 계약(role=user 고정 등) | golden/member-social-login-contract.spec.ts | 🟢 (2026-07-23 배선 — auth 도메인 신설) |
| 비밀번호 변경 | golden/member-password-change.spec.ts | 🟢 (2026-07-23 배선) |
| 프로필·배송추적 | golden/member-profile.spec.ts | 🟢 |
| 마이페이지 종합 | golden/mypage.spec.ts / admin/mypage-orders-rendering · mypage-profile-binding-flow | 🔵 / 🟡 |
| 1:1 문의 수정·저장 | golden/member-inquiry-edit-save.spec.ts | 🟢 (2026-07-23 배선) |
| 정지/탈퇴/세션실효 | admin/member-suspend-withdraw.spec.ts | 🟡 |
| 회원 상태 관리 실구동 | golden/admin-crud-members.spec.ts | 🟢 |
| B2B 가입 승인(pending→active) | golden/admin-crud-members-pending-signup.spec.ts | 🟢 |
| 가입 데이터 요약 | admin/member-signup-data-summary.spec.ts | 🟡 |
| 회원 여정 커버리지 감사 | admin/member-journey-coverage.spec.ts | 🟡 |

### 2-10. 문의 · QnA
| 유스케이스 | 스펙 | 계층 |
|---|---|---|
| 상품문의 실구동(회원 제출→관리자 답변) | golden/admin-crud-qna-inquiries.spec.ts | 🟢 (E2E_MEMBER_* 시크릿 없으면 skip — yml 주석 2026-07-18 기준 미등록, 확인 필요) |
| QnA config CRUD→공개 배선 | golden/admin-crud-qna-config.spec.ts / admin/qna-public-wire-binding-flow.spec.ts | 🟢 / 🟡 |

### 2-11. 관리자 콘솔 공통
| 유스케이스 | 스펙 | 계층 |
|---|---|---|
| 관리자 화면 behavioral | golden/admin.spec.ts | 🔵 |
| 네비게이션 | admin/admin-nav.spec.ts | 🟡 |
| 대시보드 통계 | admin/dashboard-stats.spec.ts | 🟡 |
| 상품 CRUD·전 필드 왕복·갤러리 삭제 | golden/admin-crud-products · -product-fields · -product-gallery-removal | 🟢 ×3 |
| 상품 폼 페이로드·검증·분할 | products/form-payload · validate · split-product-input · form-modal-reset-deps · detail-editor-ux · admin-product-edit-visibility · product-points · product-policy-fallback · no-html-sink · next-image-supabase-host | 🟡 ×10 |
| 상품 바인딩·일괄 처리 | admin/product-binding-flow · product-bulk-actions · product-brand-field-coverage | 🟡 |
| 주문 관리(검색·목록·전이·에러) | golden/admin-crud-orders / admin/order-search · order-funnel · order-list-status-controls · order-update-error-message · apply-order-updates | 🟢 / 🟡 |
| 리뷰 검수(moderation) | admin/admin-reviews-moderation-contract.spec.ts | 🟡 (실구동 스펙 없음 — §5) |
| 카테고리 설정 | golden/admin-crud-category-settings / admin/category-binding-flow | 🟢 / 🟡 |
| 업로드 정책 | admin/admin-upload-policy.spec.ts | 🟡 |
| 삭제 게이팅·동적 라우트·id 규약 | admin/admin-resource-page-delete-gating · dynamic-route-params · id-list-value | 🟡 |
| 커버리지 감사(자기 강화 게이트) | admin/golden-crud-coverage · full-surface-crud-coverage · route-coverage-audit · migration-number-duplicates | 🟡 |

## 3. 전수 인벤토리 요약 (123개 소재 확인)

- `tests/golden/` **47**: admin-crud-* 23 · member-* 10 · behavioral 12(admin·auth·brands·care-kit·cart-badge-failure-safety·diagnosis·home·insurance·mypage·product-detail-actions·purchase·shop) · all-pages-smoke · visual
- `tests/admin/` **48**: 전부 브라우저 없는 소스-계약 (ci.yml `--project=admin`, 매 PR)
- `tests/products/` **19**: 전부 소스-계약 (ci.yml `--project=products`, 매 PR)
- `tests/shipments/` **6** · `tests/tracking/` **1**: 소스-계약이지만 **어느 워크플로에도 프로젝트 미지정 → CI 미실행**
- `tests/payments/` **2**: state-machine.db(ci.yml) · payment-routes(visual.yml)

## 4. 스펙은 있는데 CI에서 안 돌던 것 (✅ 2026-07-23 배선 수리 — PR `test/spec-ci-wiring-audit`)

### 4-1. ✅ shipments·tracking 프로젝트 통째 미배선 (7개) — 수리됨
발견: `playwright.config.ts`에 두 프로젝트가 정의돼 있었으나 어느 워크플로도 실행하지 않았다.
수리: `ci.yml`에 tracking→`verify` 잡(순수), shipments 6개→`payments-db-spec` 잡(staging env — `.db.spec.ts` 2개가 SUPABASE env 필요) 스텝 추가.

### 4-2. ✅ member 스펙 3개 — golden-crud.yml 실행 스텝 없음 — 수리됨
발견: `member-inquiry-edit-save` · `member-password-change` · `member-social-login-contract`는 testMatch에는 걸리지만 yml 파일 스텝이 없었고, 파일단위 배선 감사도 `admin-crud-*`만 검사해서 못 잡았다.
수리: ① yml wave7 블록에 3개 스텝 추가 ② 감사 정규식을 `^(admin-crud|member)-.*`로 확장(재발 방지) ③ 인증 경로(`src/lib/auth*`·`/login`·`/signup`·`proxy.ts`)가 어느 도메인 매핑에도 없던 것을 `auth` 도메인 신설로 봉합, `src/app/api/members/`를 member_journey 매핑에 추가.

### 4-3. chromium 골든 behavioral 11개 — 수동 게이트 전용
admin·auth·brands·care-kit·diagnosis·home·insurance·mypage·product-detail-actions·purchase·shop은 CI 자동 실행이 없고 §8-6 삼중 검증에서 수동/에이전트로 돈다(의도된 운영이나, 잊으면 공백). all-pages-smoke가 렌더 수준은 항상 커버.

### 4-4. 조건부 skip (시크릿 의존)
- `admin-crud-qna-inquiries`·`admin-crud-orders`·`member-*` 다수: `E2E_MEMBER_EMAIL/PASSWORD` 없으면 skip — yml 주석(2026-07-18)엔 미등록. 등록 여부 실확인 필요.
- `admin-crud-insurance-cert` 스토리지 직접검증 블록: `STAGING_SUPABASE_URL/SECRET_KEY` 등록 시에만 (SESSION.md 2026-07-23 사용자 결정 대기 #6).
- visual 관리자 샷: `E2E_ADMIN_*` 없으면 조용히 skip.

## 5. ⛔ 스펙 자체가 없는 것들 (수동 점검 필수 목록)

| # | 기능 | 현재 상태 | 비고 |
|---|---|---|---|
| G1 | **리뷰 검수 실구동** (`/admin/reviews` moderation → 공개/숨김 → 별점 재계산 0070 트리거) | 소스-계약(admin-reviews-moderation-contract)만 | admin-crud-* 실구동 스펙 부재 — coverage 감사가 도메인 매핑에 없음 |
| G2 | **이메일 실수신 루프** — 가입 인증 메일·비밀번호 재설정 메일·관리자 접수 알림(notifyAdmin) 실발송/수신 | 라우트 계약만 | nodemailer 실발송은 E2E 불가 영역 — 스테이징 수동 점검 대상 |
| G3 | **소셜 로그인 실 OAuth** (카카오/네이버 동의창 왕복) | contract 스펙만(그마저 CI 미배선 §4-2) | 외부 IdP라 자동화 불가 — 납품 전 수동 1회 |
| G4 | **토스 카드 실승인/실환불** | 위젯 경계 스펙 + DB 상태기계 + 취소 헬퍼 단위까지 | 라이브 키 미등록(카드 런칭 불가 상태) — 키 등록 후 테스트 결제 1회 필수 |
| G5 | **cron 엔드포인트 실호출** (reclaim-stock·reconcile-confirming·auto-confirm-shipments의 HTTP 레이어·CRON_SECRET 가드) | 내부 로직은 db 스펙 존재(단 §4-1로 CI 미실행) | 엔드포인트 인증·스케줄 등록은 수동 확인 |
| G6 | **스윗트래커 실 API 폴링** | 어댑터 단위 스펙만(CI 미실행) | 실배선 자체가 미완(FREE 100건/월 한계) — 계약 후 재설계 |
| G7 | **관리자 대시보드 실구동** (`/admin` 차트·통계가 실데이터로 렌더) | dashboard-stats 소스-계약만 | all-pages-smoke가 렌더만 커버 |
| G8 | **사업자 서류 업로드 실구동** (`/api/members/business/upload` 파일 첨부→관리자 열람) | 가입 승인 실구동(members-pending-signup)은 있으나 파일 업로드 경로는 계약 수준 | |
| G9 | **회원 탈퇴 실구동** (마이페이지에서 소프트탈퇴→PII 익명화→소셜 재가입 차단) | member-suspend-withdraw 소스-계약만 | 0054 staging 미적용 상태라 staging 점검도 마이그레이션 선행 필요 |
| G10 | **진단 결과 집계 화면** (`/admin/survey-results`) | route-coverage-audit가 라우트 존재만 확인 | CRUD 아님(읽기 전용)이라 우선순위 낮음 |
| G11 | **위시리스트 desync** (비로그인↔로그인 병합 시나리오) | member-wishlist는 로그인 동기화만 | P1 백로그로 이미 등재 |
| G12 | **주문 상세 배송 timeline 실구동** (회원이 보는 배송추적 UI) | member-profile에 배송추적 일부 + shipments 단위(CI 미실행) | |

## 6. 점검 운영에 쓰는 법

1. **자동으로 이미 커버**: §2에서 🟢·🟡 항목은 CI가 지킨다 — 점검은 "최근 run이 green인지"만 확인.
2. **로컬/수동 게이트 전용으로 남은 것**: chromium behavioral 11개(§4-3) — §8-6 삼중 검증에서 실행.
3. **손으로 봐야 하는 것**: §5 G1~G12 — staging에서 수동 점검하고 결과를 use-cases.md 체크박스에 기록.
4. **남은 구조 개선 후보**: G1 리뷰 moderation 실구동 스펙 신설(admin-crud-reviews-moderation) — coverage 감사 도메인 등록 포함. (§4-1·§4-2는 2026-07-23 수리 완료)
