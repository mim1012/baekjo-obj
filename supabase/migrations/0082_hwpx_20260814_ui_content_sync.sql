-- 0082_hwpx_20260814_ui_content_sync.sql

insert into public.site_settings (id, value)
values ('home', '{}'::jsonb)
on conflict (id) do nothing;

update public.site_settings
set value = jsonb_set(
      coalesce(value, '{}'::jsonb),
      '{hero,descriptionLines}',
      '["좋은 브랜드는 결과입니다. 백조 오브제는 그 과정까지 확인합니다."]'::jsonb,
      true
    ),
    updated_at = now()
where id = 'home';

update public.site_settings
set value = jsonb_set(
      coalesce(value, '{}'::jsonb),
      '{hero,trustNote}',
      to_jsonb('백조오브제 Audit을 통과한 브랜드만 소개합니다.'::text),
      true
    ),
    updated_at = now()
where id = 'home';

update public.site_settings
set value = jsonb_set(
      coalesce(value, '{}'::jsonb),
      '{curation,title}',
      to_jsonb('우리 아이 고민에 맞는 케어 가이드'::text),
      true
    ),
    updated_at = now()
where id = 'home';

update public.site_settings
set value = jsonb_set(
      coalesce(value, '{}'::jsonb),
      '{curation,description}',
      to_jsonb('우리 아이는 매일 작은 신호를 보냅니다. 그 신호를 이해하는 것부터 케어는 시작됩니다.'::text),
      true
    ),
    updated_at = now()
where id = 'home';

update public.site_settings
set value = jsonb_set(
      coalesce(value, '{}'::jsonb),
      '{audit,criteria}',
      '[
        {"title":"브랜드 철학","desc":"브랜드가 추구하는 가치"},
        {"title":"성분·원료","desc":"성분과 원료의 안전성"},
        {"title":"제조 과정","desc":"제조 과정의 신뢰성"},
        {"title":"사용 경험","desc":"실제 보호자의 사용 경험"}
      ]'::jsonb,
      true
    ),
    updated_at = now()
where id = 'home';

update public.site_settings
set value = jsonb_set(
      coalesce(value, '{}'::jsonb),
      '{solutions,cards,2,linkLabel}',
      to_jsonb('보험 분석 시작하기'::text),
      true
    ),
    updated_at = now()
where id = 'home';

update public.site_settings
set value = jsonb_set(
      coalesce(value, '{}'::jsonb),
      '{insuranceBanner,buttonLabel}',
      to_jsonb('보험 분석 시작하기'::text),
      true
    ),
    updated_at = now()
where id = 'home';

update public.category_settings
set value = jsonb_set(
      coalesce(value, '{}'::jsonb),
      '{productCategories}',
      '["푸드","영양","케어","패션","펫로스","라이프"]'::jsonb,
      true
    ),
    updated_at = now()
where id = 'default';

update public.brands
set name = '노블독'
where id = 'b3' and name <> '노블독';

update public.brands
set name = '챠콜스토리'
where id = 'b8' and name <> '챠콜스토리';

update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{displayTags}', '["구강/위생"]'::jsonb, true)
where id = 'b3';

update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{displayTags}', '["그루밍/케어"]'::jsonb, true)
where id = 'b5';

update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{displayTags}', '["장/뼈건강"]'::jsonb, true)
where id = 'b2';

update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{displayTags}', '["영양/간식"]'::jsonb, true)
where id = 'b1';

update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{displayTags}', '["케어/라이프"]'::jsonb, true)
where id = 'b9';

update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{displayTags}', '["탈취/위생"]'::jsonb, true)
where id = 'b8';

update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{displayTags}', '["펫로스/오브제"]'::jsonb, true)
where id = 'b6';

update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{displayTags}', '["의류/패션"]'::jsonb, true)
where id = 'b7';

update public.products
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{brandName}', to_jsonb('노블독'::text), true)
where brand_id = 'b3'
  and coalesce(detail ->> 'brandName', '') in ('노볼독', '노블독 (NobleDog)', '노블독');

update public.products
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{brandName}', to_jsonb('챠콜스토리'::text), true)
where brand_id = 'b8'
  and coalesce(detail ->> 'brandName', '') in ('차콜스토리', '챠콜스토리 (Charcoal Story)', '챠콜스토리');
