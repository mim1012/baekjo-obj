# 백조오브제 수정 작업 현황

상태값은 분리해서 기록한다.

- `source_status`: `source-confirmed / source-duplicate / source-missing / visual-review-needed / decision-needed`
- `implementation_status`: `대기 / 진행중 / 검증중 / 부분반영 / 완료 / 보류`

자동 검증과 로컬 화면 확인이 모두 끝나지 않은 작업은 `implementation_status=완료`로 표시하지 않는다.

| ID | 작업명 | source_status | implementation_status | 담당 | 원본 근거 | 비고 |
|---|---|---|---|---|---|---|
| HEADER-01~02 | 헤더 메뉴/하위메뉴 | source-confirmed | 대기 | Codex | `백조오브제_홈페이지_수정요청사항.docx` | 제품 코드 미검증 |
| FOOTER-01~02 | 푸터 간결화/SNS 묶음 | source-confirmed, visual-review-needed | 부분반영 | Codex | `백조오브제_홈페이지_수정요청사항.docx`, `7 (1).hwpx` | 로컬 화면 확인 필요 |
| HOME-01 | 메인 히어로 | source-confirmed, visual-review-needed | 대기 | Codex | `메인 (1).hwpx` | 문구/버튼/시각 확인 필요 |
| HOME-02 | 3가지 솔루션 | source-confirmed, decision-needed | 보류 | Codex | `백조오브제_홈페이지_수정요청사항.docx` | 삭제 또는 이동 결정 필요 |
| HOME-03 | 브랜드 슬라이드 | source-confirmed, visual-review-needed | 부분반영 | Codex | `백조오브제_홈페이지_수정요청사항.docx`, `4 (1).hwpx` | 기존 HOME-03 코드 변경은 이번 작업에서 미수정 |
| HOME-04 | Audit 섹션 | source-confirmed, visual-review-needed | 대기 | Codex | `2 (2).hwpx`, `2 (3).hwpx` | 중복 원본 DUP-01 |
| HOME-05 | 추천상품 3개 | source-confirmed | 대기 | Codex | `백조오브제_홈페이지_수정요청사항.docx` | 자동 확인 필요 |
| HOME-06 | 펫보험 CTA | source-confirmed, visual-review-needed | 대기 | Codex | `5 (1).hwpx` | 화면 확인 필요 |
| HOME-07 | 보호자 후기/소식 | source-confirmed, visual-review-needed | 대기 | Codex | `6 (1).hwpx` | 신규 반영 항목 |
| SHOP-00~12 | 셀렉션 전체 | source-confirmed, visual-review-needed, decision-needed | 대기 | Codex | `셀렉션.hwpx`, `카테고리 수정 요청 (1).hwpx` | DAILY PICK/카테고리/냄새 slug 결정 필요 |
| CARE-01~02 | 케어 목록/하단 안내 | source-confirmed, visual-review-needed | 대기 | Codex | `백조오브제_홈페이지_수정요청사항.docx`, `3 (1).hwpx` | 원본 시안 대조 필요 |
| CARE-03~06 | 눈물 케어 상세 | source-confirmed, visual-review-needed | 대기 | Codex | `14.hwpx`~`17.hwpx` | 문구/리스트 반영 필요 |
| BRAND-00~04 | 브랜드 공통/통계/가치 | source-confirmed, visual-review-needed, decision-needed | 대기 | Codex | `8 (1).hwpx`~`10 (2).hwpx`, 홈페이지 요청 DOCX | Audit 노출 범위 결정 필요 |
| BRAND-NOBLEDOG | 노블독 상세 | source-confirmed, visual-review-needed | 대기 | Codex | `노블독 (1)\*` | HWPX/PDF 대조 필요 |
| BRAND-ALLOMING | 알로밍 상세 | source-confirmed, source-duplicate, visual-review-needed | 대기 | Codex | `알로밍*` | HWPX/PDF 중복 있음 |
| BRAND-OMIPRO | 오미프로 상세 | source-confirmed, visual-review-needed | 대기 | Codex | `오미프로*` | HWPX/PDF 대조 필요 |
| BRAND-PENEFIT | 페네핏 상세 | source-confirmed, visual-review-needed | 대기 | Codex | `페네핏*` | HWPX/PDF 대조 필요 |
| BRAND-SUNNYSIDEUP | 써니사이드업 상세 | source-confirmed, source-duplicate, visual-review-needed | 대기 | Codex | `12.hwpx`, `13.hwpx`, `써니사이드업_백조오브제_AUDIT*` | DOCX 3개 중복 |
| BRAND-CHARCOALSTORY | 챠콜스토리 상세/하위자료 | source-confirmed, source-duplicate, visual-review-needed | 대기 | Codex | `챠콜스토리 (1)\*`, `챠콜스토리 배송정책*.pdf`, 팔레트파우더 미디어 | 배송정책 중복 |
| BRAND-REPET | RE:펫 상세 | source-confirmed, visual-review-needed, decision-needed | 보류 | Codex | `RE펫\*` | 최종 표기 결정 필요 |
| BRAND-MAISONCHOUCHOU | 메종슈슈 상세 | source-confirmed, visual-review-needed | 대기 | Codex | `메종슈슈\*` | HWPX/PDF 대조 필요 |
| B2B-01 | 파트너십 CTA | source-confirmed, visual-review-needed | 대기 | Codex | `11 (1).hwpx` | 화면 확인 필요 |
| INSURANCE-01 | 보험 분석 CTA | source-confirmed, visual-review-needed | 대기 | Codex | `5 (1).hwpx` | 화면 확인 필요 |
| ADMIN-01~02 | 파트너 제출자료 관리 | source-confirmed, decision-needed | 대기 | Codex | `백조오브제_파트너유형별_제출자료_목록.docx` | 누적/교체 및 signed-url 정책 결정 필요 |
| ADMIN-03 | 운영/심사/제작 참고자료 | source-confirmed, visual-review-needed | 대기 | Codex | 결제 심사 PPTX, 통신판매업 PDF, 배송정책 PDF, Audit PDF/DOCX, 상세페이지 미디어 | 참고자료 분리 보관 |
| MEDIA-PALETTEPOWDER | 팔레트파우더 상세페이지 원본 | source-confirmed, visual-review-needed | 대기 | Codex | `260825_팔레트파우더 상세페이지_백조오브제 전달용\*` | 32개 미디어 파일 내용 미판독 |
| MEDIA-VIDEO-01 | 카카오톡 전달 영상 | source-confirmed, visual-review-needed | 대기 | Codex | `KakaoTalk_20260826_222724948.mp4` | 영상 내용 미판독 |
