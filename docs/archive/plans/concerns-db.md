# 고민별 케어(concerns) DB화 + 관리자 편집 (2.B)

브랜치: feat/concerns-db (main에서 분기)

## 목표
현재 정적 하드코딩(`src/data/concerns.ts:3-344`)이고 관리자 화면은 읽기전용 껍데기
(`src/app/admin/concerns/page.tsx:31` readOnly)인 고민 콘텐츠를, kits/partners와 동일한
싱글턴 config 패턴으로 DB화하고 관리자가 편집·저장 가능하게 한다.

## 아키텍처 결정
concern 목록 전체를 한 행(id='default')에 { items: Concern[] } jsonb로 담는
**싱글턴 config 패턴**(partners/kits/survey/qna와 동일)을 채택.
개별 행 테이블보다 순서·부분노출·통짜 저장이 이 패턴과 정확히 일치.

## 조사로 확인된 현 소비 지점(전부 정적 import → DB 조회로 전환 대상)
- 목록: `src/app/concerns/page.tsx:1,45`
- 상세: `src/app/concerns/[slug]/page.tsx:21,120,133-139`
  (이미 dynamic='force-dynamic'이고 listProducts()로 DB를 읽으므로 서버 조회 추가가 자연스러움)
- 회원가입 관심사: `src/app/signup/page.tsx`
- 상점 필터: `src/components/shop/ShopContent.tsx`
- 브랜드 상세: `src/app/brands/[id]/page.tsx`
  → 공개 조회 콘센트 getConcernsConfig() 하나로 통일, 실패 시 defaultConcernsConfig 폴백

## Ralph 실행 단계

### R1. config 타입 + 기본값 이전
- `src/lib/concerns/config.ts`: partners/config.ts를 템플릿으로
  interface ConcernsConfig { items: Concern[] }
  export const defaultConcernsConfig: ConcernsConfig = { items: [...현 concerns.ts 전체 이관...] }
  (값 변경 없이 그대로 복사 — 0012 주석의 "값 변경 없음" 규율 준수)
- 순수 모듈로 유지('use client' 금지 — config.ts:1-5 주석 근거)

### R2. 마이그레이션 + repo
- `supabase/migrations/0037_concerns_config.sql`: 0012 복사, 테이블명 concerns_config
- `src/lib/concerns/repo.ts`: partners/repo.ts 복사 → getConcernsConfig/saveConcernsConfig

### R3. API 라우트
- `src/app/api/concerns/route.ts`: GET(공개). 저장 없으면 defaultConcernsConfig.
  (survey/qna처럼 공개 소비자 있으므로 공개 GET 둔다 — kits/partners와 다른 점)
- `src/app/api/admin/concerns/route.ts`: GET+PUT. requireAdmin.
  런타임 검증 isConcern (route.ts:19-51 스타일: slug/title/symptoms[]/causes[]/faq[] 등)

### R4. storage 콘센트
- `src/lib/storage.ts`: survey 블록(727-759) 미러링
  getConcernsConfig()  // 공개, 실패 시 defaultConcernsConfig 폴백
  saveConcernsConfig(config)  // PUT, {ok}

### R5. 공개 화면 전환 (정적 import 제거)
- concerns/page.tsx: 서버 컴포넌트에서 repo 직접 호출(getConcernsConfig repo판) 또는 공개 API
- concerns/[slug]/page.tsx: concerns.find → config.items.find. generateMetadata도 동일.
- signup/shop/brands의 `@/data/concerns` import 교체
  ※ concernHeroCopy/concernIconMap([slug]/page.tsx:37-89)은 화면 표현이므로 DB화 범위 밖 — 코드 유지

### R6. 관리자 편집 활성화
- `src/app/admin/concerns/page.tsx`를 partners/page.tsx처럼 재작성:
  'use client', useState(draft)+useEffect(getConcernsConfig), draftToConcern 변환기,
  handleCreate/Update/Delete/Save, readOnly 제거, formFields 지정
  (symptoms/causes/faq는 쉼표·구분자 리스트 입력 → draftList 헬퍼 재사용, partners page.tsx:63-80)

### R7. data/concerns.ts 정리
- 정적 파일은 삭제하지 않고, defaultConcernsConfig가 유일 출처가 되도록 재-export만 남기거나
  import 0건 확인 후 제거. (product/brand DB화 때의 no-mutable-import 규율 참조)

## 테스트 계획
1. 정적 계약 테스트(신규) `tests/admin/concern-binding-flow.spec.ts`
   - partner-binding-flow.spec.ts 복제:
     admin page가 getConcernsConfig/saveConcernsConfig 콘센트 사용 / route requireAdmin+isConcern 검증 /
     repo가 concerns_config 접근 / page에 readOnly 없음 / onSave·onCreateRow·onUpdateRow·onDeleteRow 존재
2. no-static-import 회귀 `tests/products/no-html-sink.spec.ts` 스타일
   - 공개 화면들이 `@/data/concerns`를 더는 정적 import하지 않음(파트너 스펙 16-20행 헬퍼 패턴)
3. 공개 조회 폴백 테스트
   - getConcernsConfig가 API 실패 시 defaultConcernsConfig 반환(survey 폴백과 동일 계약)
4. 라우트 검증 테스트
   - PUT 잘못된 concern → 400, 비관리자 → 401
5. Golden E2E
   - `tests/golden/` 신규 concerns.spec 또는 기존 shop/diagnosis 회귀:
     /concerns 목록·/concerns/[slug] 상세가 DB값으로 렌더. 관리자 편집→저장→공개 반영 왕복.
6. 회귀: 상세 페이지가 이미 force-dynamic이므로 SSG 영향 없음. `npm run build` + 전체 playwright.
   기존 content-binding-flow.spec.ts / category-binding-flow.spec.ts와 충돌 없는지 확인.

## 리스크 / 주의
- concerns가 signup/shop/brands 등 5+ 지점에서 소비됨 → 한 곳이라도 정적 import 남으면 drift.
  R5에서 전수 교체 + 테스트2로 강제.
- slug 안정성: 상세 라우트가 slug 기반이므로 관리자 편집에서 slug 변경 시 링크 깨짐 —
  slug는 편집 불가(생성 시 고정) 또는 리다이렉트 정책 결정 필요.
- concernIconMap/heroCopy는 코드 상수 → DB 미포함이므로, 신규 concern 추가 시 아이콘 폴백
  (Circle, [slug]/page.tsx:126)만 적용됨을 관리자에게 안내.

## 병합 주의(두 계획 공통)
- `care-kit-inquiry-db`와 `concerns-db` 두 브랜치 모두 마이그레이션 0037을 쓰므로,
  나중에 병합되는 쪽을 0038로 리넘버.
- 두 브랜치 모두 storage.ts / admin 네비 / partner-binding-flow.spec.ts 인접 영역을 건드려
  머지 충돌 가능 — 순차 병합 권장(어느 쪽 먼저인지 명시).
