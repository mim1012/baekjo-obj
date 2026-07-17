# 보험 페이지 콘텐츠(동의 전문·FAQ) DB화 + 관리자 CRUD (④·⑤)

브랜치: `be/insurance-content-config` (main에서 분기, 라벨: data-integration + contract-change[가산])

> 사용자 결정(2026-07-17): "④ 보험 약관 전문 텍스트, ⑤ 보험 FAQ 문항 — 관리자 페이지에서
> CRUD 편집·추가·삭제가 가능해야 함."

## 목표
`/insurance` 페이지에서 현재 죽어있는 두 콘텐츠를 살리고 관리자 CRUD로 연결한다.

1. **동의 전문**: "전문 보기"가 핸들러 없는 순수 `<span>`(`src/app/insurance/page.tsx:395, 405`)이고
   띄울 약관 텍스트가 코드에 없음(`docs/legal/TERMS_AND_CONSENTS_KR.md`에 문서로만 존재)
   → 버튼+모달로 교체, 전문 텍스트는 DB config에서 로드.
2. **FAQ**: 하드코딩 3건(`page.tsx:69-82`)이 질문만 렌더되고 답변(`faq.a`)·아코디언 미구현(`page.tsx:487-502`)
   → 아코디언 구현 + 문항을 DB config에서 로드.
3. **관리자 CRUD**: 동의 문서·FAQ 문항을 관리자가 추가/수정/삭제/저장.

## 아키텍처 결정
partners/kits/survey/qna와 동일한 **싱글턴 jsonb config 패턴** 채택.
`/admin/insurance`(신청 건 관리)와는 별개의 신규 화면 `/admin/insurance-content`로 분리
(신청 관리 화면은 dad 컴포넌트 트리 `src/components/admin-new/insurance/*` — 건드리지 않음).

```ts
// src/lib/insuranceContent/config.ts
interface ConsentDoc {
  id: string;            // 'privacy' | 'analysis' 등 — 생성 시 고정(슬러그 규율)
  title: string;         // "개인정보 수집 및 이용 동의"
  required: boolean;
  body: string;          // 약관 전문 (줄바꿈 포함 plain text/markdown)
}
interface InsuranceFaq { q: string; a: string; }
interface InsuranceContentConfig { consents: ConsentDoc[]; faqs: InsuranceFaq[]; }
export const defaultInsuranceContentConfig: InsuranceContentConfig = {
  consents: [ /* docs/legal/TERMS_AND_CONSENTS_KR.md에서 이관 */ ],
  faqs: [ /* page.tsx:69-82 현행 3건 그대로 이관 */ ],
};
```

## Ralph 실행 단계 (각 단계 = 1 커밋)

### R1. config 타입 + 기본값
- `src/lib/insuranceContent/config.ts`: 위 타입 + 기본값.
  - consents 기본값 body는 `docs/legal/TERMS_AND_CONSENTS_KR.md`의 해당 절 텍스트를 이관.
    ⚠️ 이관 시 내용 수정 금지(법적 문안) — 원문 그대로. 최종 문안 확정은 아래 "남은 결정" 참조.
  - faqs 기본값은 `page.tsx:69-82` 3건 그대로(값 변경 없음 규율).
- 공용 타입을 쓸 필요가 있으면 `src/types/index.ts`에 가산적 추가(contract-change 라벨).

### R2. 마이그레이션 + repo
- `supabase/migrations/00XX_insurance_content_config.sql`: 0012_partners_config.sql 복사,
  테이블명 `insurance_content_config`(id='default' 단일 행, value jsonb, RLS on/정책 없음).
  ⚠️ 번호는 병합 시점의 최신+1 — care-kit(0037)·concerns(0037→0038) 계획과 경합하므로
  세 브랜치 중 마지막 병합이 최종 번호를 갖도록 리넘버.
- `src/lib/insuranceContent/repo.ts`: partners/repo.ts 복사 →
  `getInsuranceContentConfig` / `saveInsuranceContentConfig` (upsert).

### R3. API 라우트
- `src/app/api/insurance-content/route.ts`: GET(공개 — /insurance 페이지가 소비).
  저장값 없으면 defaultInsuranceContentConfig.
- `src/app/api/admin/insurance-content/route.ts`: GET+PUT, `requireAdmin` 가드.
  런타임 검증: consents 각 항목 id/title/body 문자열·required boolean,
  faqs 각 항목 q/a 비어있지 않은 문자열 (partners route.ts:19-51 검증 스타일).

### R4. storage 콘센트 (가산적 — 기존 시그니처 불변)
- `src/lib/storage.ts`에 survey 블록(727-759) 미러링:
  - `getInsuranceContentConfig()` — 공개 GET, 실패 시 default 폴백
  - `saveInsuranceContentConfig(config)` — PUT, {ok}

### R5. 공개 화면 배선 + 인터랙션 (⚠️ 표현 변경 — dad 영역과 협업)
`src/app/insurance/page.tsx`는 통짜 'use client' 페이지. 이번 변경은 데이터 배선(mim)과
표현(모달·아코디언 UI = dad) 이 섞이므로 §3-1 규율 적용:
- **배선(mim)**: 마운트 시 `getInsuranceContentConfig()` 로드, 하드코딩 `faqs` 상수 제거,
  체크박스 라벨을 config.consents 기반으로 렌더.
- **표현(dad 승인 대상)**:
  - "전문 보기" `<span>` → `<button type="button" onClick={...}>` + 모달
    (열림 상태 `openConsentId: string | null`, 모달에 `consent.body` 렌더,
    §6 팔레트 준수 — 어스톤/모노톤, 글래스모피즘 accent).
  - FAQ 아코디언: `openFaqIndex` 상태 + ChevronDown 회전 + `faq.a` 펼침
    (framer-motion fade, aria-expanded 부여).
- PR에 스크린샷 첨부, dad가 화면 기준으로 확인(§8-1 개정: 사람 승인 대신 화면 검토).

### R6. 관리자 화면
- `src/app/admin/insurance-content/page.tsx`: 'use client', partners/page.tsx 패턴.
  - 두 섹션: ① 동의 문서 목록(추가/수정/삭제, body는 textarea) ② FAQ 목록(추가/수정/삭제, q/a).
  - draft 상태 + `saveInsuranceContentConfig` 일괄 저장.
  - consents의 `id`는 생성 시 고정·편집 불가(공개 페이지 체크박스 required 매핑 안정성).
- admin 좌측 네비에 "보험 콘텐츠" 항목 추가(admin-nav.spec 갱신).

## 테스트 계획
1. 정적 계약 테스트(신규) `tests/admin/insurance-content-binding-flow.spec.ts`
   - partner-binding-flow.spec.ts 복제: admin page가 get/save 콘센트 사용 /
     route requireAdmin+검증 / repo가 insurance_content_config 접근 /
     공개 페이지에 하드코딩 `const faqs` 부재.
2. 폴백 테스트: getInsuranceContentConfig가 API 실패 시 default 반환.
3. 라우트 검증: PUT 잘못된 config → 400, 비관리자 → 401, 공개 GET 200.
4. Golden E2E (§7 #3 펫보험 플로우 — 배포 게이트 대상):
   - /insurance에서 "전문 보기" 클릭 → 모달에 전문 텍스트 렌더 → 닫기.
   - FAQ 클릭 → 답변 펼침.
   - 관리자 편집→저장→공개 반영 왕복(스테이징).
5. 회귀: `npm run build` + lint + visual.spec(모달·아코디언은 기본 접힘 상태라
   14장 베이스라인 영향 확인 — 체크박스 라벨 문구가 바뀌면 update-baselines 라벨).

## 리스크 / 남은 결정
- **법적 문안 최종 확정(잔여)**: 관리자가 편집 가능해지므로 "확정" 부담은 낮아졌지만,
  초기 seed로 넣을 `docs/legal/TERMS_AND_CONSENTS_KR.md` 문안을 그대로 써도 되는지
  (법무/클라이언트 검토) 1회 확인 필요. 검토 전이라도 구현은 진행 가능(추후 admin에서 교체).
- 약관은 법적 고지문 — 관리자 오편집으로 required 동의가 사라지면 신청 플로우가 깨짐.
  검증(R3)에서 consents 최소 1건 + required 항목 삭제 방지(또는 경고)를 넣는다.
- 신청 제출 로직(`insuranceConsent` 체크 검증)이 consents 배열과 동기화되어야 함 —
  R5에서 체크박스 상태를 consent id 기반 맵으로 전환.

## 병합 주의(세 계획 공통)
- care-kit(1.B)·concerns(2.B)·본 계획 모두 마이그레이션 번호·storage.ts·admin 네비·
  binding-flow 스펙 인접 영역이 겹침 → 순차 병합(먼저 머지되는 순서대로 번호 확정,
  뒤 브랜치는 rebase + 리넘버 책임).
