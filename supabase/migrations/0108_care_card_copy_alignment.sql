update public.concerns_config
set value = jsonb_set(
  value,
  '{items}',
  (
    select jsonb_agg(
      case item->>'slug'
        when 'joint' then item || jsonb_build_object('shortDescription', '걸음걸이가 예전과 달라졌나요?')
        when 'obesity' then item || jsonb_build_object('shortDescription', '우리 아이의 체중, 괜찮은 걸까요?')
        when 'oral' then item || jsonb_build_object('shortDescription', '구강, 어디서부터 살펴볼까요?')
        when 'stress' then item || jsonb_build_object('shortDescription', '평소와 다른 행동이 자주 보이나요?')
        else item
      end
      order by ordinal_position
    )
    from jsonb_array_elements(value->'items') with ordinality as concerns(item, ordinal_position)
  ),
  true
),
updated_at = now()
where id = 'default';
