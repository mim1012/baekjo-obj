-- 페네핏 상세 Audit의 Process 10개와 Checkpoints 9개만 사용자 제공 정본으로 교체한다.

update public.brands
set detail = jsonb_set(
  jsonb_set(
    detail,
    '{auditReport,process}',
    '["브랜드 철학 및 제품 개발 방향","제품 성분·영양 및 상세 정보","제품 개발 및 레시피 구성","반려동물 식품관리사 참여 여부","영양 기준 및 급여 가이드","식품 제조·가공 관련 등록 특허","연구개발전담부서 및 벤처기업 인증 자료","HACCP 인증 시설 및 국내 생산 체계","사용자 피드백 및 운영 방식","대표자 인터뷰"]'::jsonb,
    true
  ),
  '{auditReport,checkpoints}',
  '["기호성과 영양을 함께 고려한 제품 방향","성분과 영양 정보의 투명한 공개","알레르기를 고려한 레시피 개발","반려동물 식품관리사 직접 참여","AAFCO·NRC 기준 참고","식품 제조·가공 기술 관련 등록 특허 보유","연구개발 기반을 갖춘 운영 체계","HACCP 인증 시설을 통한 국내 생산","사용자 피드백을 반영한 제품 개선"]'::jsonb,
  true
)
where id = 'b1' and detail ? 'auditReport';
