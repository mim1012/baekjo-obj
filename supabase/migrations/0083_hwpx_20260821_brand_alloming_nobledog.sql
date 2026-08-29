-- 0083_hwpx_20260821_brand_alloming_nobledog.sql

-- 왜: HWPX 지시서 2026-08-21 알로밍(b5)·노블독(b3) 브랜드 상세 콘텐츠 반영.
-- 상세 페이지의 하드코딩 3문구(카테고리 설명/관련고민 라벨·설명/스토리 특징 칩)를
-- brand.detail jsonb 신규 키(highlights, summaryCategoryNote, summaryConcernLabel,
-- summaryConcernNote)로 대체하기 위한 실데이터 주입. jsonb_set은 update 재실행 시
-- 동일 최종값을 다시 써넣을 뿐이라(치환, 추가 아님) 여러 번 실행해도 결과가 같다 — 멱등.

-- b3 노블독
update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{displayTags}', '["강아지/고양이"]'::jsonb, true)
where id = 'b3';

update public.brands
set detail = jsonb_set(
      coalesce(detail, '{}'::jsonb),
      '{philosophy}',
      to_jsonb(E'노블독은 아이마다 양치를 받아들이는 방식이 다르다고 생각합니다.\n하나의 방법을 고집하기보다 직접 분사하거나 칫솔과 거즈를 함께 사용하고, 마시는 물이나 사료와 함께 사용하는 등 아이의 특성에 따라 선택할 수 있는 방법을 마련했습니다.\n노블독은 구강 관리가 어려워 포기하는 일이 줄어들고, 매일의 작은 관리가 오래 함께할 시간으로 이어지기를 바랍니다.'::text),
      true
    )
where id = 'b3';

update public.brands
set detail = jsonb_set(
      coalesce(detail, '{}'::jsonb),
      '{highlights}',
      '["향에 민감한 아이를 고려한 무향 설계","필요한 부위에 집중 분사할 수 있는 부리형 구조","반려동물의 구강 구조를 고려한 초미세모 칫솔 설계"]'::jsonb,
      true
    )
where id = 'b3';

update public.brands
set detail = jsonb_set(
      coalesce(detail, '{}'::jsonb),
      '{auditPoints}',
      '["동물용의약외품 신고 정보 확인","제품 성분 및 시험성적서 확인","스프레이·칫솔 구조 및 사용 방식 확인","다양한 구강 관리 방식 확인"]'::jsonb,
      true
    )
where id = 'b3';

update public.brands
set detail = jsonb_set(
      coalesce(detail, '{}'::jsonb),
      '{summaryCategoryNote}',
      to_jsonb('양치가 어려운 아이들도 다양한 방식으로 사용할 수 있는 구강 케어 제품을 소개합니다.'::text),
      true
    )
where id = 'b3';

update public.brands
set detail = jsonb_set(
      coalesce(detail, '{}'::jsonb),
      '{summaryConcernLabel}',
      to_jsonb('구강 · 양치'::text),
      true
    )
where id = 'b3';

update public.brands
set detail = jsonb_set(
      coalesce(detail, '{}'::jsonb),
      '{summaryConcernNote}',
      to_jsonb('향에 민감한 아이를 고려한 무향 설계로 일상적인 구강 관리를 돕습니다.'::text),
      true
    )
where id = 'b3';

-- b5 알로밍
update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{displayTags}', '["강아지/고양이"]'::jsonb, true)
where id = 'b5';

update public.brands
set detail = jsonb_set(
      coalesce(detail, '{}'::jsonb),
      '{description}',
      to_jsonb('오랜 그루밍 연구를 바탕으로, 보호자가 받은 사랑에 같은 방식으로 보답할 수 있도록 돕는 브랜드'::text),
      true
    )
where id = 'b5';

update public.brands
set detail = jsonb_set(
      coalesce(detail, '{}'::jsonb),
      '{philosophy}',
      to_jsonb(E'알로밍은 반려동물에게 받은 사랑에 사람도 같은 방식으로 보답할 수 있다고 생각합니다.\n약 4년간 그루밍의 세기와 속도, 고양이 혀의 구조를 연구하고, 보호자의 손길까지 자연스럽게 전해질 수 있도록 그 결과를 제품에 담았습니다. 제품은 국내에서 직접 개발·생산하며, 포장까지 하나하나 검수한 뒤 직접 출고하고 있습니다.\n알로밍은 매일 반복되는 브러싱이 단순한 반려노동이 아닌, 아이와 보호자가 서로의 마음을 나누는 교감의 시간이 되기를 바랍니다.'::text),
      true
    )
where id = 'b5';

update public.brands
set detail = jsonb_set(
      coalesce(detail, '{}'::jsonb),
      '{highlights}',
      '["실제 고양이 혀의 구조를 반영한 그루밍 돌기 설계","보호자의 손끝이 자연스럽게 닿도록 설계한 그립형 구조","털의 특성에 따라 선택할 수 있는 장모용·단모용 교체 모듈"]'::jsonb,
      true
    )
where id = 'b5';

update public.brands
set detail = jsonb_set(
      coalesce(detail, '{}'::jsonb),
      '{auditPoints}',
      '["약 4년에 걸친 연구 및 개발 과정 확인","펫브러시 구조 관련 등록 특허 확인","유아용 식기 등급 실리콘 소재 확인","자체 개발 및 국내 생산 체계 확인","Good Design Korea 은상 수상 내역 확인","Pin-up Design Awards Best of Best 수상 내역 확인"]'::jsonb,
      true
    )
where id = 'b5';

update public.brands
set detail = jsonb_set(
      coalesce(detail, '{}'::jsonb),
      '{summaryCategoryNote}',
      to_jsonb('털의 특성과 보호자의 손길까지 고려한 그루밍 제품을 소개합니다.'::text),
      true
    )
where id = 'b5';

update public.brands
set detail = jsonb_set(
      coalesce(detail, '{}'::jsonb),
      '{summaryConcernLabel}',
      to_jsonb('그루밍 · 교감'::text),
      true
    )
where id = 'b5';

update public.brands
set detail = jsonb_set(
      coalesce(detail, '{}'::jsonb),
      '{summaryConcernNote}',
      to_jsonb('반려동물의 그루밍 방식을 담은 브러시로 편안한 교감을 돕습니다.'::text),
      true
    )
where id = 'b5';
