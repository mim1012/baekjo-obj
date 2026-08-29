# 고객 원본 파일 연결표

고객 원본 폴더: `C:\Users\PC_1M\Desktop\0827 백조오브제 수정본`

2026-08-27 PowerShell 감사 기준 총 89개 파일을 확인했다. 모든 개별 파일은 `source-matrix.md`에 행 단위로 기록되어 있고, 이 문서는 작업 ID별 연결표다.

## 전체 카운트

| 확장자 | 수량 |
|---|---:|
| `.docx` | 6 |
| `.gif` | 7 |
| `.hwpx` | 36 |
| `.jpg` | 24 |
| `.mp4` | 1 |
| `.pdf` | 12 |
| `.png` | 2 |
| `.pptx` | 1 |
| 합계 | 89 |

## 중복 그룹

| 그룹 | 파일 |
|---|---|
| DUP-01 | `2 (2).hwpx`, `2 (3).hwpx` |
| DUP-02 | `써니사이드업_백조오브제_AUDIT.docx`, `써니사이드업_백조오브제_AUDIT (1).docx`, `써니사이드업_백조오브제_AUDIT (2).docx` |
| DUP-03 | `알로밍_백조오브제_AUDIT (1).pdf`, `알로밍_백조오브제_AUDIT (2).pdf` |
| DUP-04 | `10 (1).hwpx`, `10 (2).hwpx` |
| DUP-05 | `알로밍2 (1).hwpx`, `알로밍2 (2).hwpx` |
| DUP-06 | `백조오브제_홈페이지_수정요청사항.docx`, `백조오브제_홈페이지_수정요청사항 (1).docx` |
| DUP-07 | `챠콜스토리 배송정책.pdf`, `챠콜스토리 배송정책 (1).pdf` |

## 작업 ID별 원본 연결

| 작업 ID | 원본 파일/패턴 | 연결 내용 |
|---|---|---|
| HEADER-01~02 | `백조오브제_홈페이지_수정요청사항*.docx` | 헤더 메뉴와 `백조 오브제` 하위 메뉴 |
| FOOTER-01~02 | `백조오브제_홈페이지_수정요청사항*.docx`, `7 (1).hwpx` | 푸터 간결화, `PET LIFE CURATION` 삭제, SNS 묶음 |
| HOME-01 | `메인 (1).hwpx` | 메인 히어로 문구 |
| HOME-02 | `백조오브제_홈페이지_수정요청사항*.docx` | 3가지 솔루션 삭제 또는 카드 이동 |
| HOME-03 | `백조오브제_홈페이지_수정요청사항*.docx`, `4 (1).hwpx` | 브랜드 슬라이드 번호 삭제, 브랜드 문구 |
| HOME-04 | `2 (2).hwpx`, `2 (3).hwpx` | Audit 섹션 상단 배치, 엠블럼, 4개 기준 |
| HOME-05 | `백조오브제_홈페이지_수정요청사항*.docx` | 메인 추천상품 3개 |
| HOME-06 / INSURANCE-01 | `5 (1).hwpx` | 펫보험 CTA 문구와 버튼 |
| HOME-07 | `6 (1).hwpx` | 보호자 후기/소식 영역 |
| SHOP-00~12 | `셀렉션.hwpx`, `카테고리 수정 요청 (1).hwpx` | 셀렉션 히어로, DAILY PICK, 카드 배지, 필터, empty-state, 검색 |
| CARE-01~02 | `백조오브제_홈페이지_수정요청사항*.docx`, `3 (1).hwpx` | 케어 목록 크기/정렬, 하단 안내 |
| CARE-03~06 | `14.hwpx`, `15.hwpx`, `16.hwpx`, `17.hwpx` | 눈물 케어 상세 문구와 증상/진료 신호 |
| BRAND-00~04 | `8 (1).hwpx`, `9 (1).hwpx`, `10 (1).hwpx`, `10 (2).hwpx`, 홈페이지 요청 DOCX | 브랜드 히어로, WHAT WE VALUE, 통일 태그, 통계 영역 |
| B2B-01 | `11 (1).hwpx` | 파트너십 CTA |
| BRAND-NOBLEDOG | `노블독 (1)\노블독1.hwpx`, `노블독 (1)\노블독2.hwpx`, `노블독 (1)\노블독_백조오브제_AUDIT.pdf` | 노블독 브랜드 카드/상세/Audit |
| BRAND-ALLOMING | `알로밍1 (1).hwpx`, `알로밍2 (1).hwpx`, `알로밍2 (2).hwpx`, `알로밍_백조오브제_AUDIT*.pdf` | 알로밍 브랜드 카드/상세/Audit |
| BRAND-OMIPRO | `오미프로.hwpx`, `오미프로2.hwpx`, `오미프로_백조오브제_AUDIT.pdf` | 오미프로 브랜드 카드/상세/Audit |
| BRAND-PENEFIT | `페네핏1.hwpx`, `페네핏2.hwpx`, `페네핏_백조오브제_AUDIT.pdf` | 페네핏 브랜드 카드/상세/Audit |
| BRAND-SUNNYSIDEUP | `12.hwpx`, `13.hwpx`, `써니사이드업_백조오브제_AUDIT*.docx`, `써니사이드업_백조오브제_AUDIT.pdf` | 써니사이드업 브랜드 카드/상세/Audit |
| BRAND-CHARCOALSTORY | `챠콜스토리 (1)\챠콜1.hwpx`, `챠콜스토리 (1)\챠콜2.hwpx`, `챠콜스토리 (1)\챠콜스토리_백조오브제_AUDIT.pdf`, `챠콜스토리 배송정책*.pdf` | 챠콜스토리 브랜드 카드/상세/Audit/배송정책 |
| BRAND-REPET | `RE펫\RE펫1.hwpx`, `RE펫\re펫2.hwpx`, `RE펫\RE펫_백조오브제_AUDIT.pdf` | RE:펫 브랜드 카드/상세/Audit |
| BRAND-MAISONCHOUCHOU | `메종슈슈\메종슈슈1.hwpx`, `메종슈슈\메종슈슈2.hwpx`, `메종슈슈\메종슈슈_백조오브제_AUDIT.pdf` | 메종슈슈 브랜드 카드/상세/Audit |
| ADMIN-01~02 | `백조오브제_파트너유형별_제출자료_목록.docx` | 파트너 유형별 제출자료와 관리자 표시 방식 |
| ADMIN-03 | `백조오브제_결제경로_심사자료.pptx`, `통신판매업신고.pdf`, `챠콜스토리 배송정책*.pdf`, Audit PDF/DOCX 전체 | 운영·심사·제작 참고자료 |
| MEDIA-PALETTEPOWDER | `260825_팔레트파우더 상세페이지_백조오브제 전달용\*` | 팔레트파우더 상세페이지 원본 32개 미디어 |
| MEDIA-VIDEO-01 | `KakaoTalk_20260826_222724948.mp4` | 카카오톡 전달 영상 |
