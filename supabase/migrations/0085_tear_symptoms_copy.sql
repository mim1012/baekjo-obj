-- 눈물 케어의 생활 신호 6개를 최종 안내 문구로 갱신한다.

update public.concerns_config
set value = jsonb_set(
  value,
  '{items}',
  (
    select jsonb_agg(
      case
        when item ->> 'slug' = 'tear' then jsonb_set(
          item,
          '{symptoms}',
          '["눈 밑의 갈색·적갈색 자국이 짙어짐","평소보다 눈물 양이 많아짐","눈 주위 털이 계속 축축하게 젖어 있음","노란 눈곱이 생기거나 눈곱 양이 많아짐","눈을 평소보다 자주 비비거나 긁음","한쪽 눈의 눈물만 유독 많아짐"]'::jsonb,
          true
        )
        else item
      end
    )
    from jsonb_array_elements(value -> 'items') as item
  ),
  true
),
updated_at = now()
where id = 'default'
  and jsonb_typeof(value -> 'items') = 'array';

