# 백조오브제 데이터 구조 및 스키마 (Data Structure)

## 1. 개요
백조오브제는 현재 프론트엔드 환경에서 동작 가능한 상태를 유지하기 위해 `src/data` 폴더 하위에 Mock Data 형태로 주요 데이터를 관리하고 있습니다. 향후 백엔드 API 연동을 위해 타입과 데이터 세트를 명확히 분리하여 설계했습니다.

## 2. 핵심 엔티티 및 스키마

### A. Brand (검증 브랜드)
- `id`: 브랜드 고유 ID
- `name`: 브랜드명
- `description`: 브랜드 철학 및 소개
- `image`: 브랜드 썸네일 이미지
- `checkpoints`: 백조오브제 자체 검증(Audit) 통과 여부 및 설명 객체
  - `hasProfessionalDesign`: 수의사/영양학자 등 전문 설계 여부
  - `hasReliableProduction`: 위생적이고 투명한 생산 시설 여부
  - `hasGoodPalatability`: 기호성 입증 여부
  - `hasSustainability`: 친환경/지속가능성 고려 여부
  - `hasHistory`: 과거 리콜 이력 및 관리 투명성

### B. Product (제품)
- `id`: 상품 고유 ID
- `brandId`: 매핑된 브랜드 ID
- `name`: 상품명
- `price`: 가격
- `category`: 상품 카테고리 (사료, 간식, 영양제 등)
- `image`: 상품 썸네일 이미지
- `tags`: 특징 태그 배열 (예: #관절염, #눈물자국)
- `isBest`: 베스트 상품 여부 플래그
- `concerns`: 해당 상품이 해결해줄 수 있는 고민 슬러그(`slug`) 배열 매핑

### C. Concern (고민 분류 체계)
동물을 부위/질환별로 나누어 큐레이션하기 위한 카테고리
- `id`, `name`, `slug` (예: `joints`, `skin`, `digestion`)
- `description`: 해당 고민에 대한 에디토리얼 방식의 설명
- `icon`: 매핑할 UI 아이콘 이름

### D. Survey (맞춤 진단)
`/admin/survey`를 통해 관리자(어드민)가 문항과 결과 매핑을 관리할 수 있는 구조.
- `Question`
  - `id`: 문항 ID
  - `title`: 질문 내용
  - `type`: 'SINGLE_CHOICE', 'MULTIPLE_CHOICE' 등
  - `options`: 선택지 리스트
- `ResultMapping`
  - 응답 조합에 따른 결과(Result) 도출 로직 관리

## 3. 로컬스토리지 활용
현재 서버 통신 없이도 어드민에서 작성한 설정(예: 설문 문항 변경, 고민 카테고리 추가)이 실시간으로 사용자 화면에 반영되도록 `localStorage`와 React `useState`, `useEffect`를 조합하여 상태를 동기화하고 있습니다. 향후 이 부분은 API(Fetch/Axios) 호출로 손쉽게 교체될 수 있도록 커스텀 훅 형태로 캡슐화되어 있습니다.

## 4. 주의사항
- 데이터 구조 변경 금지
