# 백조오브제 (Baekjo Objet) 디자인 시스템 가이드

이 문서는 Cursor 등 AI 코딩 어시스턴트가 백조오브제 프로젝트를 작업할 때 디자인 통일성을 유지하고, 기존 디자인 문법을 해치지 않도록 안내하는 가이드입니다. 새로운 UI를 추가하거나 기존 코드를 수정할 때, 반드시 아래의 토큰과 원칙을 준수하세요.

## 1. 색상 (Colors)

### 배경색 (Backgrounds)
- **Global Main**: `bg-[#FCFBF8]` (따뜻한 아이보리 계열의 기본 배경색)
- **Secondary Section**: `bg-[#F6F3ED]` (Audit 등 서브 섹션 배경)
- **Highlight Section**: `bg-[#F2EEE5]` (후기, 소식 등 섹션)
- **Dark Section**: `bg-[#1A2F25]` (펫보험 배너 등 어두운 배경)
- **Cards**: `bg-white`, `bg-[#FFFDF9]`, `bg-[#FFFEFB]` (제품/브랜드 카드 배경)
- **Footer**: `bg-[#202521]` (다크 포레스트 그린)

### 텍스트 (Typography Colors)
- **Primary / Headings**: `text-[#17231E]`, `text-[#18231F]`, `text-[#17251F]`, `text-[#17211D]` (아주 어두운 그린/차콜 - 헤딩 및 주요 텍스트)
- **Secondary / Descriptions**: `text-[#59615B]`, `text-[#68716C]`, `text-[#6F756F]` (차분한 그레이-그린 - 본문 및 부가 설명)
- **Accent / Eyebrow / Icons**: `text-[#7A4E1D]`, `text-[#B48A4A]`, `text-[#B99562]`, `text-[#A8742E]` (고급스러운 브라운/골드 계열)
- **Inverse (어두운 배경 위)**: `text-white`, `text-[#FBFAF7]`

### 보더 (Borders)
- **Default/Light Border**: `border-[#E7E2D9]`, `border-[#DED8CC]`, `border-[#E0D8CA]`, `border-[#F2EFE9]`, `border-[#E4DDD1]`
- **Hover/Active Border**: `border-[#B99562]`, `border-[#D8C9B4]`

---

## 2. 타이포그래피 (Typography)

한국어 문단 렌더링 시 단어가 잘리지 않도록 주로 `break-keep` 클래스를 사용합니다.

- **Hero Title**: `text-[30px] md:text-[34px] lg:text-[44px]`
- **Section Title**: `text-[22px] md:text-[24px] lg:text-[28px]`
- **Body / Description**: `text-[14px] md:text-[15px] lg:text-[16px]`
- **Small / Eyebrow (태그/카테고리)**: `text-[11px] lg:text-[12px] font-bold uppercase tracking-[0.12em] ~ tracking-[0.14em]`
- **Line Height (행간)**: 제목은 `leading-[1.2]` ~ `leading-[1.3]`, 본문은 `leading-[1.6]` ~ `leading-[1.7]`
- **Letter Spacing (자간)**: 제목은 주로 `tracking-tight` 또는 `tracking-[-0.035em]`

---

## 3. UI 요소 및 형태 (UI Elements & Shapes)

백조오브제는 전체적으로 부드럽고 친근한 둥근 모서리를 사용합니다. 임의의 `rounded-md` 사용을 피하고 아래 규격을 따르세요.

### 모서리 둥글기 (Border Radius)
- **큰 섹션 / 배너 컨테이너**: `rounded-[24px]`, `rounded-[20px]`
- **일반 카드 (상품, 큐레이션)**: `rounded-[18px]`, `rounded-[16px]`, `rounded-2xl`
- **버튼**: `rounded-xl` (약간 둥근 사각형) 또는 `rounded-full` (완전한 알약 형태)

### 버튼 (Buttons & CTAs)
- **Primary Button**: 
  - 기본: `bg-[#18231F] text-white font-bold`
  - 호버: `hover:bg-[#2F3B34] transition-colors`
- **Secondary Button (Outline)**: 
  - 기본: `bg-white border border-[#DED8CC] text-[#18231F] font-bold`
  - 호버: `hover:border-[#B99562] transition-colors`
- **Audit Button**: 
  - 기본: `bg-[#173C32] text-white`
  - 호버: `hover:bg-[#2F3B34]`

### 그림자 및 인터랙션 (Shadows & Interactions)
- **기본 섹션/카드 그림자**: `shadow-[0_2px_10px_rgba(0,0,0,0.02)]` (아주 은은한 그림자)
- **카드 호버 이펙트**: `hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(23,37,31,0.04)] transition-all duration-300`
- **화살표 인터랙션**: 링크나 버튼 내 화살표(아이콘)는 `group-hover:translate-x-1 transition-transform duration-300` 적용.

---

## 4. 레이아웃 & 스페이싱 (Layout & Spacing)

반응형 디자인을 필수로 적용해야 합니다. 모바일, 태블릿(`md:`), 데스크탑(`lg:`, `xl:`) 환경을 모두 고려하세요.

### 컨테이너 폭 (Container Max Width)
- 메인 섹션 컨테이너: `mx-auto w-full max-w-[1280px]`
- 푸터 컨테이너: 홈은 `max-w-[1180px]`, 그 외는 `site-container-wide`

### 좌우 여백 (Paddings)
- 반응형 패딩 적용: `px-5 md:px-7 lg:px-10 xl:px-14`

### 상하 여백 (Margins)
- 섹션 간 간격: `mb-16 md:mb-20 lg:mb-28` 또는 `mb-14 md:mb-[72px] lg:mb-[88px]`

---

## 5. 핵심 준수 사항 (Crucial Rules for AI)

1. **디자인 토큰 임의 생성 금지**: Tailwind의 arbitrary values (예: `text-[#123456]`, `bg-[#987654]`)를 새로 추가하기 전에, 반드시 위 팔레트에 지정된 색상을 우선적으로 조합하여 사용하세요.
2. **HTML 구조 하드코딩 지양**: 홈 화면과 같은 페이지는 `src/data/homeContent.ts`에 CMS 데이터 구조가 잡혀있을 수 있습니다. 문구를 직접 뷰 파일에 타이핑하기 전에 기존 데이터 연동 방식을 확인하세요.
3. **가독성 향상 클래스 적용**: 한국어 텍스트 컨테이너에는 `break-keep`을 습관적으로 적용하세요.
