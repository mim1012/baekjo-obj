# baekjo-design 레포용 AGENTS.md 초안 (v2 — 자유 게시 모델)

> [split-design.md](./split-design.md) v2에 맞춘 개정. dad는 이 레포에 UI 목업·디자인·레이아웃을
> **자유롭게 쭉 올리기만** 하면 되고, 가져가는 건 mim 몫이다. 그래서 이 AGENTS.md는 의무가 아니라
> **디자인 규칙(브랜드 보호) + 부탁 3개(수확 비용 절감)**만 담는다. ~40줄.
> design 레포 생성 시 루트 `AGENTS.md`로 복사, `CLAUDE.md`는 `@AGENTS.md` 한 줄.

---

# 백조오브제 디자인 레포 (baekjo-design)

> 여기는 **UI 전시장**이다. 화면 표현(목업·디자인·레이아웃)의 정본이며, mock 데이터로 도는
> Next.js 앱. 마음껏 올려라 — 프로덕션 이식(수확)·데이터 연결·검증은 전부 mim이 한다.
> DB·API·결제·CI는 이 레포에 없고, 알 필요도 없다.

## 스택 (추측 금지)

Next.js 16 App Router · React 19 · TypeScript 5 · Tailwind v4 · framer-motion 12 · lucide-react.
⚠️ Next 16는 훈련 데이터와 다르다 — 코드 쓰기 전 `node_modules/next/dist/docs/` 확인.

## 디자인 규칙 (위반 = 브랜드 훼손 — 이것만은 지킨다)

- **폰트**: 한글·본문 = Pretendard / 영문 타이틀·장식(`font-editorial`) = Playfair Display.
  🚫 한글에 Playfair 강제 금지(렌더 깨짐).
- **컬러**: 어스톤/모노톤만. Dark `#1A1D1B`/`#202521`, Light `#F9F8F3`/`#F4F2EC`/`#FAF9F5`,
  Accent = 글래스모피즘(`bg-white/20`+`backdrop-blur-md`). 🚫 쨍한 원색 금지.
- **인터랙션**: 카드 hover = `hover-lift`(`-translate-y-1`+`shadow-xl`), 등장 = fade-up/wipe.
- **레거시 커머스 호환**: cart/checkout/order-complete/notices/mypage 페이지 삭제 금지.

## 부탁 3개 (지키는 만큼 프로덕션 반영이 빨라진다)

1. **올릴 땐 `npm run build`가 통과하는 상태로.** 깨진 트리는 어디까지가 의도인지 알 수 없어
   가져갈 수 없다.
2. **화면에 뿌리는 데이터는 props 또는 파일 상단 mock 상수로.** 컴포넌트 안 깊숙이 텍스트·배열을
   하드코딩하면 mim이 실데이터로 바꿀 때 한 줄씩 파내야 한다. props/상수면 교체가 기계적이다.
3. **파일 위치는 지금 구조 유지** — 컴포넌트는 `src/components/**`, 화면은 `src/app/**`.
   경로가 같아야 "무엇이 바뀌었나"를 diff로 자동 추출한다.

## 명령어

```bash
npm install && npm run dev   # http://localhost:3000
npm run build                # 올리기 전 이것 하나만
```

## 프로덕션 반영을 원할 때

main에 올려두고 mim에게 한 마디("홈 새 버전 올렸어") — 그러면 mim이 수확 PR을 만들고,
**실데이터가 연결된 Vercel 프리뷰 링크**로 돌려준다. 확인할 것은 하나: **"내가 올린 화면 그대로인가."**
그대로면 승인, 다르면 어디가 다른지 말해주면 된다. 코드 리뷰는 필요 없다.

---

## (참고 — 이 초안 자체의 메모, 복사 시 제외 가능)

v1 대비 뺀 것: 파일 구역 3색(🔴 수정 금지 구역 등 dad 의무), 계약 제안 절차, 콘센트 강제,
lint 완료 정의, 세션 마감 규칙. 이유: 확정 모델에서 dad는 **게시만** 하고 계약·배선·검증 책임이
전부 obj로 넘어갔으므로, dad 쪽에 남길 것은 브랜드 규칙과 "수확을 싸게 해주는 부탁"뿐이다.
storage 콘센트 규칙도 뺐다 — dad mock이 콘센트를 안 거쳐도 수확 ④(배선)에서 mim이 처리하며,
부탁 2(props/상수)가 그 비용을 줄여준다.
