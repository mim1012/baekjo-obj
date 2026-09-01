-- 눈물 상세 FAQ를 사용자 제공 정본 4개로 교체한다.
-- 다른 고민의 FAQ와 눈물 고민의 나머지 필드는 유지한다.

update public.concerns_config
set value = jsonb_set(
  value,
  '{items}',
  (
    select jsonb_agg(
      case
        when item->>'slug' = 'tear' then item || jsonb_build_object(
          'faq',
          jsonb_build_array(
            jsonb_build_object(
              'question', '눈물 자국은 왜 생기나요?',
              'answer', '눈물이 눈 주변 털에 반복적으로 묻으면 눈물에 포함된 포르피린이라는 색소 성분으로 인해 붉거나 갈색의 자국이 남을 수 있습니다. 눈물이 많아지는 데에는 눈의 자극이나 염증, 눈물 배출 상태, 얼굴 구조 등 여러 요인이 영향을 줄 수 있습니다.'
            ),
            jsonb_build_object(
              'question', '눈 주변은 어떻게 관리하면 좋나요?',
              'answer', '눈 주변에 눈물이나 분비물이 묻어 있다면 부드럽게 닦아내고, 털과 피부가 계속 젖어 있지 않도록 깨끗하고 건조하게 관리해주세요. 눈 주변 털이 눈을 자극하지 않는지도 살펴보세요. 눈 주변에 사용하는 제품은 용도와 사용 방법을 확인하고, 눈에 직접 들어가지 않도록 주의해주세요. 이상 반응이 있거나 사용이 필요한지 판단하기 어렵다면 수의사와 상담하는 것이 좋습니다.'
            ),
            jsonb_build_object(
              'question', '한쪽 눈에서만 눈물이 나는 것도 괜찮나요?',
              'answer', '평소와 달리 한쪽 눈에서만 눈물이 계속 많아진다면 그냥 지나치기보다 눈의 상태를 함께 살펴보는 것이 좋습니다. 눈의 자극이나 이물질, 눈꺼풀·속눈썹 문제, 눈물 배출 이상 등 여러 원인이 있을 수 있으므로 한쪽 눈의 변화가 지속된다면 진료를 통해 원인을 확인해주세요.'
            ),
            jsonb_build_object(
              'question', '언제 병원에 가야 하나요?',
              'answer', '평소보다 눈물이 갑자기 많아지거나 변화가 계속되는 경우, 눈을 자주 찡그리거나 비비는 경우, 충혈이나 평소와 다른 분비물이 보이는 경우에는 진료를 받아보세요. 눈을 잘 뜨지 못하거나 통증이 심해 보이는 등 뚜렷한 이상이 있다면 기다리지 말고 빠르게 진료를 받는 것이 좋습니다.'
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
