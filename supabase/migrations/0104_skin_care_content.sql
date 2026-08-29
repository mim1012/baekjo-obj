-- 0104: 2026-08-27 피부 케어 가이드 문구·추천 연결 정리
-- 케어 관리 화면의 단일 JSON 설정에서 피부 항목과 스트레스 카드 설명만 교체한다.

update public.concerns_config
set value = jsonb_set(
  value,
  '{items}',
  (
    select jsonb_agg(
      case
        when item->>'slug' = 'skin' then
          item || jsonb_build_object(
            'symptoms', jsonb_build_array(
              '몸을 자주 긁거나 핥음',
              '피부가 붉어지거나 평소와 다른 변화가 생김',
              '비듬이나 각질이 많아짐',
              '털이 평소보다 많이 빠지거나 부분적으로 빠짐',
              '특정 부위에서 평소와 다른 냄새가 남'
            ),
            'recommendedProductIds', jsonb_build_array('p4', 'p5', 'p21', 'p12', 'p17', 'p18'),
            'recommendedBrandIds', jsonb_build_array('b5', 'b2', 'b9', 'b8'),
            'faq', jsonb_build_array(
              jsonb_build_object(
                'question', '목욕은 얼마나 자주 하는 게 좋을까요?',
                'answer', '목욕 주기는 피부와 피모 상태, 생활 환경에 따라 달라질 수 있습니다. 피부에 특별한 문제가 없다면 아이의 상태에 맞춰 관리하고, 피부 질환이 있거나 잦은 목욕이 필요한 경우에는 수의사와 상담해 적절한 주기와 제품을 정하는 것이 좋습니다.'
              ),
              jsonb_build_object(
                'question', '피부가 예민할 때 식사는 어떻게 살펴봐야 할까요?',
                'answer', '피부 변화에는 식사뿐 아니라 환경, 알레르기, 감염 등 여러 원인이 영향을 줄 수 있습니다. 특정 음식을 먹은 뒤 피부 문제가 반복되거나 식이 알레르기가 의심된다면 임의로 사료를 바꾸기보다 수의사와 상담해 원인을 확인하는 것이 좋습니다. 식이 알레르기는 단순한 사료 교체만으로 확인하는 게 아니라 제한식과 이후 식이 재도전 등을 통해 평가합니다.'
              ),
              jsonb_build_object(
                'question', '자주 긁는다고 모두 피부 문제인가요?',
                'answer', '긁는 행동만으로 특정 피부 질환을 판단할 수는 없습니다. 다만 반복해서 긁거나 핥고, 붉어짐·털 빠짐·각질·냄새 같은 피부 변화가 함께 나타난다면 원인을 확인할 필요가 있습니다.'
              ),
              jsonb_build_object(
                'question', '피부가 붉어졌을 때 집에서 지켜봐도 될까요?',
                'answer', '일시적으로 붉어졌거나 가벼운 자극일 수 있지만, 붉어짐이 지속되거나 심해지고 반복적인 긁기·핥기, 털 빠짐, 상처나 분비물 같은 변화가 함께 나타난다면 수의사와 상담하는 것이 좋습니다.'
              )
            )
          )
        when item->>'slug' = 'stress' then
          item || jsonb_build_object('shortDescription', '평소보다 불안하거나 예민해졌나요?')
        else item
      end
      order by ordinal_position
    )
    from jsonb_array_elements(value->'items') with ordinality as concerns(item, ordinal_position)
  )
),
updated_at = now()
where id = 'default';
