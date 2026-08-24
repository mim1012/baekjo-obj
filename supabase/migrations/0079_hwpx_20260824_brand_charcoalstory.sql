-- 왜: HWPX 지시서(2026-08-24) 챠콜스토리(b8) 반영. 알로밍·노블독과 동일 구조.
-- 0073이 b8 name에서 영문을 떼어 '챠콜스토리'만 남겼는데, 지시서가 영문(회색) 재노출을 요구.
-- name에 '(CHARCOALSTORY)' 복원 + detail.wordmarkColor(회색)로 h1 영문만 회색 처리한다.
-- 그 외 카드/상세 콘텐츠·검토항목·장문 감사 리포트(BOA-2026-008, 소재품질·큐레이터 노트 포함)를
-- 기존 필드(displayTags/philosophy/highlights/auditPoints/summary*/auditReport)에 주입한다.
-- 값 없는 다른 브랜드는 무회귀. jsonb_set 치환이라 멱등.

-- name 영문 복원(회색은 wordmarkColor가 h1에서 처리)
update public.brands set name = '챠콜스토리 (CHARCOALSTORY)' where id = 'b8';

update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{wordmarkColor}', to_jsonb('#6F756F'::text), true)
where id = 'b8';

update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{displayTags}', '["강아지/고양이"]'::jsonb, true)
where id = 'b8';

update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{description}', to_jsonb('숯의 본질적인 가치를 아이들의 건강한 일상에 이어가는 브랜드'::text), true)
where id = 'b8';

update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{philosophy}',
  to_jsonb(E'챠콜스토리는 오랫동안 숯을 연구하고, 그 가능성을 다양한 제품과 기술로 이어왔습니다.\n이제 그 전문성을 반려동물의 생활까지 확장해, 탈취·흡습·항균이라는 숯의 특성으로 아이가 매일 머무는 환경을 생각합니다.\n챠콜스토리는 가장 잘할 수 있는 것으로 아이들의 더 건강한 일상을 바랍니다.'::text), true)
where id = 'b8';

update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{highlights}',
  '["19년에 걸친 숯 연구와 기술 개발","탈취·흡습·항균을 고려한 생활환경 케어"]'::jsonb, true)
where id = 'b8';

update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{summaryCategoryLabel}', to_jsonb('케어 · 라이프'::text), true)
where id = 'b8';

update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{summaryCategoryNote}', to_jsonb('숯의 본래 특성을 반려생활에 적용한 제품을 소개합니다.'::text), true)
where id = 'b8';

update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{summaryConcernLabel}', to_jsonb('탈취 · 습기'::text), true)
where id = 'b8';

update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{summaryConcernNote}', to_jsonb('냄새와 습기를 관리해 쾌적한 생활환경을 돕습니다.'::text), true)
where id = 'b8';

update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{auditPoints}',
  '["등록 특허 및 지식재산권 자료 확인","자체 공장 및 생산 체계 확인","제품 구조 및 숯 적용 방식 확인","차콜프레시 시료의 탈취·항균 시험 확인","실제 사용자 검증 완료"]'::jsonb, true)
where id = 'b8';

-- 장문 감사 리포트(BOA-2026-008) — PDF 원문
update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{auditReport}',
  jsonb_build_object(
    'reportNo', 'BOA-2026-008',
    'auditedAt', '2026.08',
    'status', 'Audit Completed',
    'headline', '본질에서 찾은 확신',
    'summaryTitle', '가장 오래 연구한 것에서 찾은 답',
    'summary', '챠콜스토리는 19년에 걸쳐 축적한 숯 관련 전문성과 기술을 바탕으로, 숯의 특성을 반려동물의 생활환경에 구체적으로 적용하고 있는 브랜드입니다.',
    'selectionReason', '반려동물과 함께하는 공간에서 냄새와 습기는 쉽게 반복되는 문제입니다. 챠콜스토리는 문제를 만드는 환경 자체에 주목해, 19년에 걸쳐 숯을 연구하고 다양한 제품과 기술로 개발해온 전문성을 반려동물의 생활환경까지 확장하고 있습니다. 탈취·흡습·항균이라는 숯의 특성을 반려생활에 필요한 방식으로 적용했습니다.',
    'process', jsonb_build_array(
      '브랜드 철학 및 제품 개발 방향',
      '19년에 걸친 연구 및 개발 이력',
      '등록 특허 및 지식재산권 자료',
      '자체 공장 및 생산 체계',
      '제품 구조 및 숯 적용 방식',
      '탈취·항균 시험자료',
      '안전 관련 확인자료',
      '실제 사용자 피드백',
      '대표자 인터뷰'
    ),
    'materialReview', jsonb_build_array(
      '챠콜스토리는 19년 동안 숯을 연구하며, 숯이 가진 특성을 실제 생활에 적용할 수 있는 제품과 기술로 발전시켜왔습니다. 그 과정은 관련 등록 특허와 디자인등록, 자체 공장을 기반으로 한 생산까지 이어졌습니다.',
      '펫 제품에서도 새로운 소재를 찾기보다 가장 오래 연구해온 숯을 선택했습니다. 탈취·흡습·항균이라는 숯의 특성을 활용해 냄새만을 가리는 것이 아니라, 아이가 생활하는 공간의 환경까지 함께 관리하기 위함입니다.',
      '고양이 화장실에서는 모래에 숯을 함께 사용해 냄새와 습기를 관리합니다. 습기를 줄여 화장실을 보다 쾌적하게 유지하면서, 보호자의 모래 관리 부담까지 함께 고려한 방식입니다.',
      '반려동물이 오래 누워 있는 공간에는 매트 안쪽에 숯을 적용했습니다. 몸이 오랫동안 닿는 곳에 습기가 머무르지 않도록 관리하는 것은 피부가 접촉하는 환경까지 생각한 선택입니다. 직접적인 피부 효능을 내세우기보다, 아이가 매일 머무는 공간부터 쾌적하게 관리하는 데 초점을 두었습니다.',
      '백조오브제는 차콜프레시 시료의 탈취·항균 시험자료와 기존 숯 제품군의 안전 관련 자료를 구분하여 검토하였으며, 실제 사용자 검증을 통해 제품의 사용 경험도 함께 확인하였습니다.'
    ),
    'curatorNote', jsonb_build_array(
      '누군가를 위해 새로운 일을 시작할 때, 꼭 새로운 답이 필요한 것은 아닐지도 모릅니다.',
      '챠콜스토리는 19년 동안 숯을 연구해왔습니다. 특허를 내고, 제품을 만들고, 직접 생산하며 숯이 할 수 있는 일을 누구보다 오래 고민해온 브랜드입니다. 그리고 그 시간이 이제 반려동물을 향하고 있습니다.',
      '화장실의 냄새만 없애는 것이 아니라 습기와 항균까지 생각하고, 오래 몸을 대고 누워 있는 공간에서는 피부가 닿는 환경까지 살폈습니다.',
      '백조오브제가 인상 깊었던 것은 반려동물을 위해 전혀 새로운 것을 만들어낸 것이 아니라, 챠콜스토리가 가장 오래 연구하고 가장 잘할 수 있는 것으로 아이들에게 필요한 답을 찾았다는 점이었습니다.',
      '19년 동안 숯을 연구해온 시간이 이제 아이들의 더 건강한 일상을 위해 쓰이고 있습니다. 백조오브제는 챠콜스토리가 아이의 건강을 제품 하나의 기능에서만 찾지 않고, 매일 머무는 환경부터 바라보는 브랜드라고 생각합니다.'
    )
  ),
  true)
where id = 'b8';
