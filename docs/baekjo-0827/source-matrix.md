# 고객 원본 감사 매트릭스

원본 폴더: `C:\Users\PC_1M\Desktop\0827 백조오브제 수정본`

감사일: 2026-08-27

## 감사 기준

- PowerShell `Get-ChildItem -Recurse -File` 기준 총 89개 파일을 행 단위로 기록한다.
- `size/hash 또는 duplicate group` 열은 `파일크기 bytes / SHA-256 앞 12자리` 또는 동일 해시 중복 그룹을 기록한다.
- HWPX/DOCX/PPTX는 ZIP/XML 텍스트 추출로 확인했다.
- PDF는 `pypdf` 텍스트 추출과 페이지 수 확인을 기준으로 기록했다. `통신판매업신고.pdf`는 텍스트가 추출되지 않아 스캔/이미지 PDF로 표시했다.
- 이미지/영상은 파일 존재와 파일명 순서만 확인했다. Preview로 직접 판독하지 않은 항목은 모두 `visual-review-needed`다.

## 파일별 매트릭스

| relative path | type | size/hash 또는 duplicate group | HWPX/DOCX/PDF/media evidence | linked task ID | source status | visual review status |
|---|---|---|---|---|---|---|
| `10 (1).hwpx` | HWPX | 304931 / DUP-04 | HWPX text extracted; embedded preview refs present | BRAND-01 | source-confirmed | visual-review-needed |
| `10 (2).hwpx` | HWPX | 304931 / DUP-04 | HWPX text extracted; embedded preview refs present | BRAND-01 | source-confirmed | visual-review-needed |
| `11 (1).hwpx` | HWPX | 271871 / fb190cbb51e1 | HWPX text extracted; embedded preview refs present | B2B-01 | source-confirmed | visual-review-needed |
| `12.hwpx` | HWPX | 224578 / 904c3e77a696 | HWPX text extracted; embedded preview refs present | BRAND-SUNNYSIDEUP, AUDIT-01 | source-confirmed | visual-review-needed |
| `13.hwpx` | HWPX | 140401 / 3d9934bd1555 | HWPX text extracted; embedded preview refs present | BRAND-SUNNYSIDEUP, AUDIT-01 | source-confirmed | visual-review-needed |
| `14.hwpx` | HWPX | 825348 / c0a847cec4bd | HWPX text extracted; embedded preview refs present | CARE-03 | source-confirmed | visual-review-needed |
| `15.hwpx` | HWPX | 146046 / d196f1c998ea | HWPX text extracted; embedded preview refs present | CARE-03 | source-confirmed | visual-review-needed |
| `16.hwpx` | HWPX | 78680 / 4ea61c9cebb2 | HWPX text extracted; embedded preview refs present | CARE-03 | source-confirmed | visual-review-needed |
| `17.hwpx` | HWPX | 95012 / 969c970fb597 | HWPX text extracted; embedded preview refs present | CARE-03 | source-confirmed | visual-review-needed |
| `2 (2).hwpx` | HWPX | 219450 / DUP-01 | HWPX text extracted; embedded preview refs present | HOME-04 | source-confirmed | visual-review-needed |
| `2 (3).hwpx` | HWPX | 219450 / DUP-01 | HWPX text extracted; embedded preview refs present | HOME-04 | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\01-히어로-gif.gif` | GIF | 9972571 / 93dc6f57b961 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\02-키비주얼.jpg` | JPG | 744993 / fe1a18a15136 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\03-신뢰섹션-환불보장.jpg` | JPG | 325935 / 2a48f86927f7 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\04-문제점인식&환기.jpg` | JPG | 1504948 / a6d26bb6071a | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\05.gif` | GIF | 5600428 / 96901f341d30 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\06-신뢰섹션-리얼리뷰.jpg` | JPG | 732344 / 2fc9aa5d0f98 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\07-포인트요약.jpg` | JPG | 568484 / 2f3b37054cae | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\08-포인트-1-1.jpg` | JPG | 117333 / e51bc42d000d | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\08-포인트-1-2.jpg` | JPG | 621986 / 4a7832f51476 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\08-포인트-1-3-gif.gif` | GIF | 316043 / ae0ccf959106 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\08-포인트-1-4.jpg` | JPG | 1157130 / 211e5590d4ef | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\08-포인트-1-5-보너스-1.jpg` | JPG | 428701 / 35ae28ef0e38 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\08-포인트-1-5-보너스-2-gif.gif` | GIF | 1057867 / 3841803560f7 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\08-포인트-1-6.jpg` | JPG | 523394 / acc15c9d97aa | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\09-포인트-2-1.jpg` | JPG | 94804 / 79bd4a3730b2 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\09-포인트-2-2.jpg` | JPG | 948421 / 9609f66c6268 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\09-포인트-2-3.jpg` | JPG | 966562 / b5d1a7f6945b | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\09-포인트-2-5-1-gif.gif` | GIF | 3202459 / d038c76fa7a4 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\10-포인트-3-1.jpg` | JPG | 112605 / 5a13b8f45f61 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\10-포인트-3-2.jpg` | JPG | 1165374 / 43adb6b8f50f | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\10-포인트-3-3-보너스.jpg` | JPG | 1042209 / 85abd64432f0 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\11-신뢰섹션-1.jpg` | JPG | 472785 / 66db3b586d77 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\11-신뢰섹션-2.jpg` | JPG | 273482 / 264aea8e9e7f | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\12-마무리-1-gif.gif` | GIF | 591240 / 72e2df8c1bfa | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\12-마무리-2-gif.gif` | GIF | 6888202 / 48e366545b32 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\12-마무리-3.jpg` | JPG | 735142 / 8a508d9cba91 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\14-급여방법.jpg` | JPG | 164288 / ce171bfe2be3 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\15-땡스투.jpg` | JPG | 615495 / efe5dd23ffc6 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\16-기타-1.jpg` | JPG | 1035903 / f0d1e4a105a5 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\17-자주묻는질문.jpg` | JPG | 830599 / 43775c417f29 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\18-상세표기-비프.png` | PNG | 318353 / a4b14e2e28b4 | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\18-상세표기-치킨.png` | PNG | 317185 / aa2376cbd32d | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `260825_팔레트파우더 상세페이지_백조오브제 전달용\급여량+아트보드 1.jpg` | JPG | 42712 / 66102510758c | media file present; filename/order evidence only | ADMIN-03, MEDIA-PALETTEPOWDER | source-confirmed | visual-review-needed |
| `3 (1).hwpx` | HWPX | 1006592 / 3605d9d9e6fa | HWPX text extracted; embedded preview refs present | CARE-01 | source-confirmed | visual-review-needed |
| `4 (1).hwpx` | HWPX | 125301 / 7d488dedabb9 | HWPX text extracted; embedded preview refs present | HOME-03, BRAND-01 | source-confirmed | visual-review-needed |
| `5 (1).hwpx` | HWPX | 255043 / 5aaa17ca106f | HWPX text extracted; embedded preview refs present | INSURANCE-01 | source-confirmed | visual-review-needed |
| `6 (1).hwpx` | HWPX | 58169 / 603ce647321e | HWPX text extracted; embedded preview refs present | HOME-07 | source-confirmed | visual-review-needed |
| `7 (1).hwpx` | HWPX | 72815 / 9ceec4cd2004 | HWPX text extracted; embedded preview refs present | FOOTER-01 | source-confirmed | visual-review-needed |
| `8 (1).hwpx` | HWPX | 96313 / fc3f3e3ae51b | HWPX text extracted; embedded preview refs present | BRAND-00 | source-confirmed | visual-review-needed |
| `9 (1).hwpx` | HWPX | 429048 / ce27a9efe413 | HWPX text extracted; embedded preview refs present | BRAND-00, AUDIT-01 | source-confirmed | visual-review-needed |
| `KakaoTalk_20260826_222724948.mp4` | MP4 | 13962373 / 51fc3ede459b | media file present; filename/order evidence only | MEDIA-VIDEO-01 | source-confirmed | visual-review-needed |
| `RE펫\RE펫1.hwpx` | HWPX | 214727 / 452fdbb7426c | HWPX text extracted; embedded preview refs present | BRAND-REPET, AUDIT-01, DEC-004 | source-confirmed | visual-review-needed |
| `RE펫\re펫2.hwpx` | HWPX | 135347 / 07274dbadf1f | HWPX text extracted; embedded preview refs present | BRAND-REPET, AUDIT-01, DEC-004 | source-confirmed | visual-review-needed |
| `RE펫\RE펫_백조오브제_AUDIT.pdf` | PDF | 65477 / 59a993669b6b | PDF text extracted/page count checked | BRAND-REPET, AUDIT-01, DEC-004 | source-confirmed | visual-review-needed |
| `노블독 (1)\노블독1.hwpx` | HWPX | 365687 / 9b82126cc6bb | HWPX text extracted; embedded preview refs present | BRAND-NOBLEDOG, AUDIT-01 | source-confirmed | visual-review-needed |
| `노블독 (1)\노블독2.hwpx` | HWPX | 139406 / e181d4f55daa | HWPX text extracted; embedded preview refs present | BRAND-NOBLEDOG, AUDIT-01 | source-confirmed | visual-review-needed |
| `노블독 (1)\노블독_백조오브제_AUDIT.pdf` | PDF | 63829 / a61efbf81798 | PDF text extracted/page count checked | BRAND-NOBLEDOG, AUDIT-01 | source-confirmed | visual-review-needed |
| `메인 (1).hwpx` | HWPX | 105201 / b4d6906288a5 | HWPX text extracted; embedded preview refs present | HOME-01 | source-confirmed | visual-review-needed |
| `메종슈슈\메종슈슈1.hwpx` | HWPX | 309979 / 45ac5a2f64f7 | HWPX text extracted; embedded preview refs present | BRAND-MAISONCHOUCHOU, AUDIT-01 | source-confirmed | visual-review-needed |
| `메종슈슈\메종슈슈2.hwpx` | HWPX | 138461 / 4261553f737e | HWPX text extracted; embedded preview refs present | BRAND-MAISONCHOUCHOU, AUDIT-01 | source-confirmed | visual-review-needed |
| `메종슈슈\메종슈슈_백조오브제_AUDIT.pdf` | PDF | 61539 / 72bf99b80e97 | PDF text extracted/page count checked | BRAND-MAISONCHOUCHOU, AUDIT-01 | source-confirmed | visual-review-needed |
| `백조오브제_결제경로_심사자료.pptx` | PPTX | 757669 / e4b42dbdefbc | PPTX text extracted; commerce review screenshots referenced | ADMIN-03 | source-confirmed | visual-review-needed |
| `백조오브제_파트너유형별_제출자료_목록.docx` | DOCX | 19830 / 22c81b6bfa62 | DOCX text extracted | ADMIN-01, ADMIN-02, DEC-006 | source-confirmed | not-visual |
| `백조오브제_홈페이지_수정요청사항 (1).docx` | DOCX | 19977 / DUP-06 | DOCX text extracted | HOME-02, HOME-03, HOME-04, HOME-05, CARE-01, CARE-02, BRAND-04, HEADER-01, FOOTER-01 | source-confirmed | not-visual |
| `백조오브제_홈페이지_수정요청사항.docx` | DOCX | 19977 / DUP-06 | DOCX text extracted | HOME-02, HOME-03, HOME-04, HOME-05, CARE-01, CARE-02, BRAND-04, HEADER-01, FOOTER-01 | source-confirmed | not-visual |
| `셀렉션.hwpx` | HWPX | 1394868 / c1affd10c0ae | HWPX text extracted; embedded preview refs present | SHOP-00~12 | source-confirmed | visual-review-needed |
| `써니사이드업_백조오브제_AUDIT (1).docx` | DOCX | 20784 / DUP-02 | DOCX text extracted | BRAND-SUNNYSIDEUP, AUDIT-01 | source-confirmed | not-visual |
| `써니사이드업_백조오브제_AUDIT (2).docx` | DOCX | 20784 / DUP-02 | DOCX text extracted | BRAND-SUNNYSIDEUP, AUDIT-01 | source-confirmed | not-visual |
| `써니사이드업_백조오브제_AUDIT.docx` | DOCX | 20784 / DUP-02 | DOCX text extracted | BRAND-SUNNYSIDEUP, AUDIT-01 | source-confirmed | not-visual |
| `써니사이드업_백조오브제_AUDIT.pdf` | PDF | 67369 / 5d47abeae2a8 | PDF text extracted/page count checked | BRAND-SUNNYSIDEUP, AUDIT-01 | source-confirmed | visual-review-needed |
| `알로밍1 (1).hwpx` | HWPX | 285346 / aded31d596da | HWPX text extracted; embedded preview refs present | BRAND-ALLOMING, AUDIT-01 | source-confirmed | visual-review-needed |
| `알로밍2 (1).hwpx` | HWPX | 141950 / DUP-05 | HWPX text extracted; embedded preview refs present | BRAND-ALLOMING, AUDIT-01 | source-confirmed | visual-review-needed |
| `알로밍2 (2).hwpx` | HWPX | 141950 / DUP-05 | HWPX text extracted; embedded preview refs present | BRAND-ALLOMING, AUDIT-01 | source-confirmed | visual-review-needed |
| `알로밍_백조오브제_AUDIT (1).pdf` | PDF | 75252 / DUP-03 | PDF text extracted/page count checked | BRAND-ALLOMING, AUDIT-01 | source-confirmed | visual-review-needed |
| `알로밍_백조오브제_AUDIT (2).pdf` | PDF | 75252 / DUP-03 | PDF text extracted/page count checked | BRAND-ALLOMING, AUDIT-01 | source-confirmed | visual-review-needed |
| `오미프로.hwpx` | HWPX | 217604 / 431a72d09438 | HWPX text extracted; embedded preview refs present | BRAND-OMIPRO, AUDIT-01 | source-confirmed | visual-review-needed |
| `오미프로2.hwpx` | HWPX | 155126 / dceb36ee414e | HWPX text extracted; embedded preview refs present | BRAND-OMIPRO, AUDIT-01 | source-confirmed | visual-review-needed |
| `오미프로_백조오브제_AUDIT.pdf` | PDF | 63760 / 8a6093399395 | PDF text extracted/page count checked | BRAND-OMIPRO, AUDIT-01 | source-confirmed | visual-review-needed |
| `챠콜스토리 (1)\챠콜1.hwpx` | HWPX | 238666 / 468fad8bfb98 | HWPX text extracted; embedded preview refs present | BRAND-CHARCOALSTORY, AUDIT-01 | source-confirmed | visual-review-needed |
| `챠콜스토리 (1)\챠콜2.hwpx` | HWPX | 130996 / f2f1963f8281 | HWPX text extracted; embedded preview refs present | BRAND-CHARCOALSTORY, AUDIT-01 | source-confirmed | visual-review-needed |
| `챠콜스토리 (1)\챠콜스토리_백조오브제_AUDIT.pdf` | PDF | 65385 / 58da7a2ed837 | PDF text extracted/page count checked | BRAND-CHARCOALSTORY, AUDIT-01 | source-confirmed | visual-review-needed |
| `챠콜스토리 배송정책 (1).pdf` | PDF | 151455 / DUP-07 | PDF text extracted/page count checked | ADMIN-03, BRAND-CHARCOALSTORY | source-confirmed | visual-review-needed |
| `챠콜스토리 배송정책.pdf` | PDF | 151455 / DUP-07 | PDF text extracted/page count checked | ADMIN-03, BRAND-CHARCOALSTORY | source-confirmed | visual-review-needed |
| `카테고리 수정 요청 (1).hwpx` | HWPX | 63153 / 5684e76edc1a | HWPX text extracted; embedded preview refs present | SHOP-03, DEC-002 | source-confirmed | visual-review-needed |
| `통신판매업신고.pdf` | PDF | 362996 / bb696c03d4d1 | PDF scanned/image evidence; text not extractable | ADMIN-03 | source-confirmed | visual-review-needed |
| `페네핏1.hwpx` | HWPX | 253573 / 3700f5f80236 | HWPX text extracted; embedded preview refs present | BRAND-PENEFIT, AUDIT-01 | source-confirmed | visual-review-needed |
| `페네핏2.hwpx` | HWPX | 153801 / aacb86b15fed | HWPX text extracted; embedded preview refs present | BRAND-PENEFIT, AUDIT-01 | source-confirmed | visual-review-needed |
| `페네핏_백조오브제_AUDIT.pdf` | PDF | 66426 / cff33f221a2b | PDF text extracted/page count checked | BRAND-PENEFIT, AUDIT-01 | source-confirmed | visual-review-needed |
