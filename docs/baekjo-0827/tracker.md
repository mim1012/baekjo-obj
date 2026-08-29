# 백조오브제 수정 작업 현황

## 상태 기준

- `대기`: 작업에 착수하지 않음
- `진행중`: 코드 또는 자료 대조를 진행 중
- `부분완료`: 코드 반영과 로컬 실화면 검증은 끝났으나 원본/결정/실배포 검증 중 하나가 남음
- `확인필요`: 원본 파일, 고객 결정, 운영 환경 또는 권한이 있어야 진행 가능
- `완료`: 고객 원본 대조, 코드 반영, 자동 검증, PC·모바일 실화면, 실제 배포 화면 검증이 모두 통과함

2026-08-27 현재 PC에는 정본이 기록한 `C:\Users\PC_1M\Desktop\0827 백조오브제 수정본` 폴더가 없다. 로컬 프로덕션 빌드와 PC·모바일 브라우저 검증은 통과했으나 새 Vercel Preview는 프로젝트 환경변수 누락으로 빌드에 실패했다. 따라서 실제 배포 화면까지 검증된 `완료` 항목은 아직 없다.

| ID | 작업명 | source_status | implementation_status | 실제 반영/검증 | 남은 조건 |
|---|---|---|---|---|---|
| HEADER-01~02 | 헤더 메뉴/하위메뉴 | branch source-confirmed, current-PC source-missing | 부분완료 | PC·모바일 메뉴 순서 및 링크 Playwright 통과 | 새 Preview 실화면 확인 |
| FOOTER-01~02 | 푸터 간결화/SNS 묶음 | branch source-confirmed, current-PC source-missing | 부분완료 | `PET LIFE CURATION` 미노출, 법정 링크·SNS·사업자 정보 화면 확인 | 원본 `7 (1).hwpx` 직접 대조, 새 Preview 확인 |
| HOME-01 | 메인 히어로 | branch source-confirmed, current-PC source-missing | 부분완료 | 확정 제목·본문·Audit 문구와 신규 카피 세이프 히어로 2종(PC 좌측 여백/모바일 상단 여백) 적용 후 PC·모바일 확인 | 원본 `메인 (1).hwpx` 직접 대조, 새 Preview 확인 |
| HOME-02 | 3가지 솔루션 | decision-needed | 확인필요 | 기존 화면의 미노출 상태를 임의 변경하지 않음 | DEC-001 삭제/이동 결정 |
| HOME-03 | 브랜드 슬라이드 | branch source-confirmed, current-PC source-missing | 부분완료 | 브랜드 로고·한 줄 설명·`브랜드관 보기`, 번호 미노출 확인 | 원본 `4 (1).hwpx` 직접 대조, 새 Preview 확인 |
| HOME-04 | Audit 섹션 | branch source-confirmed, current-PC source-missing | 부분완료 | 히어로 직후 배치·엠블럼·4개 기준 PC·모바일 확인 | 원본 HWPX/이미지 직접 대조, 새 Preview 확인 |
| HOME-05 | 추천상품 3개 | branch source-confirmed | 부분완료 | 로컬 화면에서 최대 3개 자동 검증 | 새 Preview 확인 |
| HOME-06 | 펫보험 CTA | branch source-confirmed, current-PC source-missing | 부분완료 | 확정 본문·`보험 분석 시작하기` 로컬 화면 확인 | 원본 `5 (1).hwpx` 직접 대조, 새 Preview 확인 |
| HOME-07 | 보호자 후기/소식 | branch source-confirmed, current-PC source-missing | 부분완료 | 좌측 후기·우측 소식 영역 로컬 화면 확인 | 원본 `6 (1).hwpx` 직접 대조, 새 Preview 확인 |
| SHOP-00~12 | 셀렉션 전체 | branch source-confirmed, decision-needed, current-PC source-missing | 부분완료 | 히어로, 기본 5개 카테고리, 소동물, 가격, 연령 삭제, 배지/품절 문구 삭제, 0건 후기, 검색·필터·정렬·empty-state PC·모바일 통과 | DEC-002/003/009, 원본 시안 직접 대조, 새 Preview 확인 |
| CARE-01~02 | 케어 목록/하단 안내 | branch source-confirmed, current-PC source-missing | 부분완료 | `06 CARE`, 6개 기본 카드와 하단 생활 케어 PC 확인 | 원본 `3 (1).hwpx` 직접 대조, 새 Preview 확인 |
| CARE-03~06 | 눈물 케어 상세 | branch source-confirmed, current-PC source-missing | 부분완료 | 확정 히어로·요약 문구·증상 6개·병원 신호 6개 PC 화면 통과 | 원본 `14~17.hwpx` 직접 대조, 새 Preview 확인 |
| BRAND-00~04 / AUDIT-01~02 | 브랜드 공통/통계/가치/Audit | branch source-confirmed, decision-needed, current-PC source-missing | 부분완료 | 히어로·8개 카드·WHAT WE VALUE·통계 축소 및 8개 이름 `한글명 (영문명)` 통일을 PC·모바일 확인 | DEC-005/008, 원본 시안 직접 대조, 새 Preview 확인 |
| BRAND-NOBLEDOG | 노블독 상세 | branch source-confirmed, current-PC source-missing | 부분완료 | 한/영문, 소개, 카테고리, 관련 고민 로컬 상세 화면 확인 | HWPX/PDF 직접 대조, 새 Preview 확인 |
| BRAND-ALLOMING | 알로밍 상세 | branch source-confirmed, current-PC source-missing | 부분완료 | 통일 카드/상세 문구 로컬 화면 확인 | HWPX/PDF 직접 대조, 새 Preview 확인 |
| BRAND-OMIPRO | 오미프로 상세 | branch source-confirmed, current-PC source-missing | 부분완료 | 통일 카드/상세 문구 로컬 화면 확인 | HWPX/PDF 직접 대조, 새 Preview 확인 |
| BRAND-PENEFIT | 페네핏 상세 | branch source-confirmed, current-PC source-missing | 부분완료 | 통일 카드/상세 문구 로컬 화면 확인 | HWPX/PDF·32개 상세 미디어 직접 대조, 새 Preview 확인 |
| BRAND-SUNNYSIDEUP | 써니사이드업 상세 | branch source-confirmed, current-PC source-missing | 부분완료 | 붙여쓰기·통일 카드/상세 문구·검색 결과 로컬 화면 확인 | HWPX/DOCX/PDF 직접 대조, 새 Preview 확인 |
| BRAND-CHARCOALSTORY | 챠콜스토리 상세/하위자료 | branch source-confirmed, current-PC source-missing | 부분완료 | 영문 병기·통일 카드/상세 문구 로컬 화면 확인 | HWPX/PDF/배송정책/상세 미디어 직접 대조, 새 Preview 확인 |
| BRAND-REPET | RE:펫 상세 | decision-needed, current-PC source-missing | 확인필요 | 기존 저장명을 보존하고 영문 `RE:PET`만 보조 표기; 데이터 정규화 추가 변경 없음 | DEC-004 최종 표기 결정, 원본 직접 대조 |
| BRAND-MAISONCHOUCHOU | 메종슈슈 상세 | branch source-confirmed, current-PC source-missing | 부분완료 | 통일 카드/상세 문구 로컬 화면 확인 | HWPX/PDF 직접 대조, 새 Preview 확인 |
| B2B-01 | 파트너십 CTA | branch source-confirmed, current-PC source-missing | 부분완료 | 확정 제목·본문·버튼 및 기존 문의 링크 로컬 화면 통과 | 원본 `11 (1).hwpx` 직접 대조, 새 Preview 확인 |
| INSURANCE-01 | 보험 분석 CTA | branch source-confirmed, current-PC source-missing | 부분완료 | 확정 본문·버튼과 기존 신청 링크 로컬 화면 통과 | 원본 `5 (1).hwpx` 직접 대조, 새 Preview 확인 |
| ADMIN-01~02 | 파트너 제출자료 관리 | decision-needed, current-PC source-missing | 확인필요 | 기존 관리자·API·DB 구조를 임의 변경하지 않음 | DEC-006/007, 원본 DOCX, 파일 모델·스토리지 정책 확정 |
| ADMIN-03 | 운영/심사/제작 참고자료 | current-PC source-missing | 확인필요 | 자료 분류 문서만 유지; 실제 파일 미복사 | 원본 PPTX/PDF/DOCX/미디어 확보 |
| MEDIA-PALETTEPOWDER | 팔레트파우더 상세페이지 원본 | current-PC source-missing | 확인필요 | 저장소의 기존 WebP 22개는 요청 원본 32개와 파일 구성 불일치로 대체하지 않음 | 요청 원본 32개 확보·직접 판독·PC/모바일 적용 검증 |
| MEDIA-VIDEO-01 | 카카오톡 전달 영상 | current-PC source-missing | 확인필요 | 기존 `public/videos/baekjo-objet.mp4`의 크기/해시가 요청 영상과 달라 대체하지 않음 | 요청 MP4 확보·직접 재생·자동재생/음소거/모바일 검증 |

## 집계

- 트래커 작업 묶음: 27개 (`spec.md` 원자 요구사항 52개를 영역별로 묶음)
- 완료: 0개
- 부분완료: 21개
- 확인필요: 6개
- 진행중: 0개
- 대기: 0개
