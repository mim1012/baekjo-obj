# 백조오브제 주요 기능 및 시스템 명세 (Features Specs)

## 1. 프론트엔드 아키텍처
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom CSS Variables (`globals.css`)
- **Animation**: Framer Motion (`AnimatePresence`, `motion.div`)
- **상태 관리**: React Hooks (`useState`, `useRouter`) 및 LocalStorage

## 2. 핵심 기능 상세

### A. 1분 맞춤 진단 시스템 (`/diagnosis`)
- 보호자가 아이의 상태(나이, 생활 환경, 주요 고민 등)를 객관식 문항으로 응답.
- `Framer Motion`을 활용한 매끄러운 스와이프 슬라이드 트랜지션 적용.
- 완료 시 사용자의 응답 데이터를 기반으로 매핑된 **맞춤형 솔루션(결과)** 페이지 제공.
- 결과에는 관련된 검증 브랜드 제품들과, 향후 대비해야 할 펫보험 추천 로직이 결합되어 노출됨.

### B. 프리미엄 스토어 & 브랜드관 (`/shop`, `/brands`)
- 일반적인 카테고리 분류가 아닌, 백조오브제의 자체 오딧(Audit Checkpoints - 전문 설계, 신뢰 생산, 기호성, 지속 가능성, 기록/관리)을 거친 브랜드만 입점.
- 제품 카드(`ProductCard`)는 고품질의 레이아웃(BAEKJO SELECTION) 및 Hover 시 살짝 떠오르는 부드러운 인터랙션(`hover-lift`)을 적용하여 고급스러움 강조.

### C. 펫보험 분석 (`/insurance`)
- 상품 판매에만 그치지 않고, 반려 생태계를 구성하는 '보험' 도메인까지 확장.
- 사용자가 현재 가진 보험 증권을 분석하거나, 가입을 강요하지 않는 선에서 객관적이고 투명한 보험 추천 및 상담 예약 연계 제공.
- 랜딩 페이지(`/landing/insurance`)를 통해 보험의 필요성과 백조오브제만의 투명한 철학을 마케팅.

### D. 파트너십 & 케어 키트 (`/landing/care-kit`)
- 동물병원, 장례식장 등 오프라인 거점 파트너들과 B2B 협력을 맺고, 꼭 필요한 순간에 실질적 위로를 전달하는 케어/위로 키트 제공.
- B2B 파트너들이 입점을 신청할 수 있는 폼과 안내 페이지 구현.

## 3. 기존 레거시 기능 호환성 유지
- 장바구니(`cart`), 주문서(`checkout`), 주문완료(`order-complete`), 공지사항(`notices`), 마이페이지(`mypage`) 등 기존 쇼핑몰 기능은 삭제하지 않고 데이터 구조의 하위 호환성을 유지하며 확장.
