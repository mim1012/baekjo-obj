-- 케어 가이드 01~06 카드의 설명만 사용자 제공 정본으로 맞춘다.
-- 제목, 순서, 번호, 상세 내용과 나머지 고민 항목은 유지한다.

update public.concerns_config
set value = jsonb_set(
  value,
  '{items}',
  (
    select jsonb_agg(
      case item->>'slug'
        when 'tear' then item || jsonb_build_object('shortDescription', '눈물 자국이 걱정되시나요?')
        when 'joint' then item || jsonb_build_object('shortDescription', '걸음걸이가 불편해 보이나요?')
        when 'skin' then item || jsonb_build_object('shortDescription', '자꾸 긁거나 피부가 붉어지나요?')
        when 'obesity' then item || jsonb_build_object('shortDescription', '체중 관리가 필요한가요?')
        when 'stress' then item || jsonb_build_object('shortDescription', '평소보다 불안하거나 예민해졌나요?')
        when 'oral' then item || jsonb_build_object('shortDescription', '입 냄새나 치석이 신경 쓰이나요?')
        else item
      end
      order by ordinal_position
    )
    from jsonb_array_elements(value->'items') with ordinality as concerns(item, ordinal_position)
  ),
  true
),
updated_at = now()
where id = 'default'
  and jsonb_typeof(value->'items') = 'array';
