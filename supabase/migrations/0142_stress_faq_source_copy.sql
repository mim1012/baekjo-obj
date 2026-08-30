-- 스트레스 상세 FAQ를 사용자 제공 정본 4개로 교체한다.
-- 다른 고민의 FAQ와 스트레스의 나머지 필드는 유지한다.

update public.concerns_config
set value = jsonb_set(
  value,
  '{items}',
  (
    select jsonb_agg(
      case
        when item->>'slug' = 'stress' then item || jsonb_build_object(
          'faq',
          jsonb_build_array(
            jsonb_build_object(
              'question', '스트레스를 받는 것 같을 때 무엇부터 살펴봐야 하나요?',
              'answer', '평소와 다른 행동이 보인다면 최근 생활 환경이나 일상에 달라진 점이 있었는지 먼저 살펴보세요. 새로운 공간이나 가족, 소음, 혼자 있는 시간 등 여러 변화가 영향을 줄 수 있습니다.'
            ),
            jsonb_build_object(
              'question', '스트레스를 받는 것 같으면 혼자 쉬게 두는 게 좋을까요?',
              'answer', '억지로 다가가거나 만지려고 하기보다, 아이가 원할 때 편하게 쉬거나 거리를 둘 수 있는 공간을 마련해 주세요. 아이마다 편안함을 느끼는 방식이 다르므로 평소 행동과 반응을 함께 살펴보는 것이 좋습니다.'
            ),
            jsonb_build_object(
              'question', '산책이나 놀이가 스트레스 관리에 도움이 되나요?',
              'answer', '산책이나 놀이는 아이의 신체 활동과 자연스러운 행동을 돕는 데 도움이 될 수 있습니다. 다만 필요한 활동과 자극은 개체마다 다르므로 나이와 건강 상태, 평소 선호에 맞춰 무리하지 않는 범위에서 진행해 주세요.'
            ),
            jsonb_build_object(
              'question', '행동이 달라지면 스트레스 때문이라고 봐도 되나요?',
              'answer', '행동 변화만으로 스트레스가 원인이라고 판단하기는 어렵습니다. 통증이나 질환 등 다른 원인에서도 비슷한 변화가 나타날 수 있어, 갑작스럽거나 지속적인 변화가 보인다면 수의사와 상담해 주세요.'
            )
          )
        )
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
