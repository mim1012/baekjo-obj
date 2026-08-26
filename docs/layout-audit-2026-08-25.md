# 레이아웃 통일 전수 감사 (Phase 0) — 2026-08-25

> 목표: 써니사이드업(= `/shop/[id]` 상세)이 쓰는 전역 레이아웃 시스템을 사이트 표준으로 확정하고,
> 이탈한 공개 페이지를 여기에 맞춰 통일한다. 이 문서는 착수 전 현황·규격·이탈목록·선결결정을 고정한다.
> 기준선 스냅샷: `docs/layout-baseline-2026-08-24/` (재생성: `scripts/layout-snapshot.mjs`; 기본 타깃은 로컬 `http://127.0.0.1:3000`, production은 명시 승인 필요).

## 1. 핵심 발견 (요약)
1. **컨테이너 체계가 3개 공존한다.**
   - ① 전역 유틸 `site-container`(1120) / `site-container-wide`(1180) / `site-container-hero`(1240) — globals.css:153·157·161
   - ② 페이지 전용 CSS 시스템 — `.home-unified`·`.brand-page`·`.care-guide-page`·`.care-detail-page`·`.mypage-page` (각자 토큰 팔레트 + `*-container` 대부분 1180)
   - ③ 완전 인라인 "1280 패밀리" — `max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12`
2. **컨테이너 폭이 5개 값으로 분산**: 1280 · 1240 · 1180 · 1120 · 1200. 인라인 폭 리터럴만 **43곳**, 그중 `max-w-[1280px]` **32회(8개 파일)**.
3. **가장 많이 쓰는 폭(1280)이 전역 클래스에 없다** → 랜딩성 페이지 대부분이 전역 클래스를 못 쓰고 인라인으로 이탈. 상세/약관 계열만 site-container(1120/1180/1240) 사용.
4. **색 토큰 이원화**: 기준형은 `#17211D`/`#6F766F`/`#E7E0D5`, 이탈형(brands/[id] 등)은 `#17251F`/`#6F756F`/`#E2DACD`/`#B58A4C`.
5. **상품 상세 콘텐츠 편차**: 시드 상품 **22개 중 detailBlocks 보유 9개**, **미보유 13개**(p8·p9·p10~p20)는 단일 대표이미지 fallback. 상세이미지 에셋 폴더는 6개 브랜드만.

## 2. 기준(Reference) — `/shop/[id]`
| 요소 | 표준 |
|---|---|
| 배경 | `page-canvas` |
| 컨테이너 | `site-container-wide`(1180) 단일 래핑 |
| eyebrow | `page-eyebrow` |
| 섹션 제목 | `section-title` |
| 본문 | `body-copy` |
| 카드 | `premium-card` |
| 상세 콘텐츠 | `detailBlocks`(image/text) 스트립 |
| 세로 리듬 | 컨테이너 `py-8 lg:py-12` + 전역 `page-section` 계열 |

## 3. 페이지별 판정 (인벤토리)
### 기준형 (전역 시스템 사용)
- `shop/[id]` (최완전 기준) · `audit` · `b2b` · `landing/care-kit` · `landing/insurance`(약) · `terms`·`privacy`·`refund-policy`(문서형 약) · `cart`·`checkout`(플로우)

### 이탈형 (인라인 하드코딩) — 통일 대상
| 페이지 | 이탈 폭 | 비고 |
|---|---|---|
| `brands/[id]` | 1120 ×8 | **1순위** — 색 토큰까지 이탈, 이번 세션 다수 편집 |
| `home/HomeClient` | 1280 ×8 | `.home-unified` CSS 미사용 |
| `brands/BrandsContent` | 1280 ×7 | `.brand-page`만 걸고 폭은 인라인 |
| `shop/ShopContent` | 1280 ×2 | `.shop-container` + 인라인 |
| `insurance` | 1280 ×7 | |
| `experts` | 1280 ×5 | |
| `concerns` | 1280 | 픽셀 리터럴 리듬 |
| `concerns/[slug]` | 1240 ×3 | site-container-hero 값 복제 |
| `reviews` | 1280 | 패딩 스케일도 이탈(`px-4 sm:px-8`) |
| `notices` / `notices/[id]` | 1280 / 900·800 | |

### `brands/[id]`(이탈) vs `shop/[id]`(기준) 정밀 대조
- 컨테이너: shop = `site-container-wide` 단일 / brands = 인라인 `max-w-[1120px] px-5 md:px-6 lg:px-8` 6~7회 복붙
- 타이포: shop = `page-eyebrow`/`section-title`/`body-copy` / brands = 전부 인라인 `text-[NNpx] font-bold`
- 카드: shop = `premium-card` / brands = 인라인 border/shadow
- 색: shop = 전역 토큰 / brands = `#17251F`·`#E2DACD`·`#B58A4C`(어긋난 계열)

## 4. detailBlocks 커버리지
- 보유(9): p1~p7, p21, p22
- 미보유(13, fallback): p8, p9, p10~p20
- 에셋 폴더(6): charcoal-fresh, nobledog-toothpaste, omipro, penefit-palette, ssup-ointment, ssup-parfum

## 5. 통일을 막는 선결 결정 (착수 전 필요)
- **D1 — 표준 컨테이너 폭.** 실사용 최다는 1280이나 전역 클래스는 1120/1180/1240. 셋 중 하나:
  - (A) `site-container` 계열을 **1280 기준으로 재정의**하고 전 페이지를 전역 클래스로 흡수 (인라인 1280 → 클래스)
  - (B) 1280 페이지들을 **1180/1240으로 흡수**(폭 축소, 시각 변화 큼)
  - (C) 폭 3단(콘텐츠 1120 / 표준 1180 / 히어로 1240)을 유지하고, 각 페이지를 성격에 맞는 클래스로 매핑(1280 폐기)
- **D2 — 색 토큰 단일화.** `#17211D` vs `#17251F`, `#E7E0D5` vs `#E2DACD` 중 정본을 정해 하나로.
- **D3 — 전용 CSS 시스템 처리.** `.home-unified`/`.brand-page` 등 페이지 전용 CSS를 표준으로 흡수할지, 유지할지.

## 6. 다음 단계
D1~D3 확정 후 → Phase 1(전역 프리미티브 정리 + `<DetailSection>`/`<DetailBlocks>` 컴포넌트) → Phase 2(brands/[id] 리팩터) → Phase 3(나머지 이탈 페이지) → Phase 4(detailBlocks 13종 콘텐츠) → Phase 5(시각 회귀 재캡처·베이스라인 갱신).
각 코드 리팩터는 **golden visual 베이스라인 동반 갱신** 필수(안 하면 CI visual 잡 실패).
