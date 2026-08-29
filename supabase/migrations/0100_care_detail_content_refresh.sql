-- 0106: 고민별 상세 최신 시안 반영
-- 공개 화면이 DB 설정을 우선 읽으므로 폴백(config.ts)과 같은 값으로 함께 갱신한다.

update public.concerns_config
set value = jsonb_set(
  value,
  '{items}',
  (
    select jsonb_agg(
      case item->>'slug'
        when 'joint' then item || jsonb_build_object(
          'symptoms', jsonb_build_array(
            '산책이나 놀이 중 평소 활동량이 줄어듦',
            '계단이나 높은 곳을 오르내리는 것을 꺼림',
            '앉았다 일어날 때 움직임이 평소보다 느려짐',
            '걷거나 뛰는 모습이 평소와 달라짐',
            '다리나 관절 주변을 만질 때 불편해하는 모습을 보임'
          ),
          'recommendedProductIds', '[]'::jsonb,
          'recommendedBrandIds', '[]'::jsonb,
          'faq', jsonb_build_array(
            jsonb_build_object('question', '관절 영양제는 언제부터 먹이는 게 좋나요?', 'answer', '관절 영양제를 모든 아이가 특정 나이부터 먹어야 하는 것은 아닙니다. 나이와 체중, 활동량, 현재 관절 상태 등에 따라 필요 여부가 달라질 수 있어요. 영양제를 시작하기 전에는 제품의 성분과 급여 기준을 확인하고, 관절 문제가 의심된다면 먼저 수의사와 상담해보세요.'),
            jsonb_build_object('question', '관절이 걱정되면 산책을 줄여야 하나요?', 'answer', '무조건 활동량을 줄이기보다 아이의 상태에 맞는 적절한 움직임을 유지하는 것이 중요합니다. 다만 걷는 모습이 달라지거나 움직임을 불편해한다면 무리하게 운동시키지 말고 수의사와 상담해보세요.'),
            jsonb_build_object('question', '체중도 관절 건강에 영향을 주나요?', 'answer', '과체중은 관절에 가해지는 부담을 높일 수 있어 적정 체중을 유지하는 것이 중요합니다. 체중 관리가 필요한 경우에는 무리하게 식사량을 줄이기보다 아이의 체형과 건강 상태에 맞는 관리 방법을 살펴보세요.'),
            jsonb_build_object('question', '미끄러운 바닥도 관절에 부담이 될 수 있나요?', 'answer', '미끄러운 바닥에서는 걷거나 일어설 때 안정적으로 움직이기 어려울 수 있습니다. 아이가 자주 생활하는 공간은 미끄럼을 줄이고, 계단이나 높은 곳을 오르내릴 때 무리가 없는지 함께 살펴보세요.')
          )
        )
        when 'obesity' then item || jsonb_build_object(
          'symptoms', jsonb_build_array(
            '갈비뼈가 쉽게 만져지지 않음',
            '위에서 봤을 때 허리선이 잘 보이지 않음',
            '최근 체중이 꾸준히 늘고 있음',
            '움직임이 둔해지거나 활동량이 줄어듦',
            '조금만 움직여도 쉽게 지치는 모습이 보임'
          ),
          'recommendedProductIds', jsonb_build_array('p1', 'p2', 'p3'),
          'recommendedBrandIds', jsonb_build_array('b1'),
          'faq', jsonb_build_array(
            jsonb_build_object('question', '다이어트 사료만으로 충분한가요?', 'answer', '체중 관리는 사료 종류만 바꾸는 것보다 하루 동안 먹는 전체 양과 열량을 함께 살펴보는 것이 중요합니다. 필요한 열량은 현재 체중과 체형, 활동량 등에 따라 달라질 수 있어 아이의 상태에 맞는 급여량을 확인해 주세요.'),
            jsonb_build_object('question', '체중 관리 중에도 간식을 줘도 되나요?', 'answer', '간식을 반드시 끊을 필요는 없어요. 다만 간식도 하루 동안 먹는 양과 열량에 포함되므로, 주식과 간식을 함께 고려해 전체 급여량을 조절하는 것이 중요합니다. 체중 감량이 필요한 경우에는 아이의 상태에 맞는 급여량을 수의사와 상담해보세요.'),
            jsonb_build_object('question', '운동량만 늘리면 체중을 줄일 수 있나요?', 'answer', '활동량을 늘리는 것은 체중 관리에 도움이 되지만, 체중 감량은 활동량뿐 아니라 식사와 전체 열량을 함께 관리하는 것이 중요합니다. 아이의 나이와 건강 상태를 고려해 무리하지 않는 범위에서 활동량을 조절해 주세요.'),
            jsonb_build_object('question', '체중은 빨리 줄이는 게 좋은가요?', 'answer', '체중은 급격하게 줄이기보다 아이의 상태에 맞는 속도로 관리하는 것이 중요합니다. 무리하게 급여량을 줄이기보다 현재 체중과 체형을 확인하고, 감량이 필요한 경우 적절한 급여량과 감량 계획을 수의사와 상의하는 것이 좋습니다.')
          )
        )
        when 'stress' then item || jsonb_build_object(
          'symptoms', jsonb_build_array(
            '평소와 다르게 숨거나 사람·다른 동물과의 접촉을 피함',
            '평소보다 쉽게 놀라거나 주변을 경계하는 모습이 늘어남',
            '먹는 양이나 식욕이 평소와 달라짐',
            '놀이와 활동에 대한 관심이 줄어듦',
            '그루밍이나 몸을 핥는 행동이 평소와 달라짐'
          )
        )
        when 'oral' then item || jsonb_build_object(
          'symptoms', jsonb_build_array(
            '평소와 다른 입 냄새가 남',
            '치아에 누렇거나 갈색의 치석이 보임',
            '잇몸이 평소보다 붉어 보임',
            '음식을 씹기 불편해하는 모습이 보임',
            '침을 평소보다 많이 흘림'
          ),
          'faq', jsonb_build_array(
            jsonb_build_object('question', '양치는 매일 해야 하나요?', 'answer', '가능하다면 매일 양치하는 것이 치태가 쌓이는 것을 줄이는 데 가장 효과적입니다. 처음부터 무리하기보다 짧은 시간부터 천천히 적응시키고, 반려동물용 칫솔과 치약을 사용해 주세요.'),
            jsonb_build_object('question', '구강 관리 제품은 양치를 대신할 수 있나요?', 'answer', '일부 구강 관리 제품은 치태나 치석이 쌓이는 것을 줄이는 데 도움을 줄 수 있습니다. 다만 제품마다 기능과 근거가 다르므로 확인 후 사용하고, 가능하다면 양치와 함께 관리하는 것이 좋습니다.'),
            jsonb_build_object('question', '이미 생긴 치석은 양치로 없어지나요?', 'answer', '이미 단단하게 굳은 치석은 양치만으로 제거되지 않습니다. 치석이 많이 쌓였거나 잇몸에 이상이 보인다면 수의사와 상담해 구강 상태를 확인해 주세요.'),
            jsonb_build_object('question', '입 냄새가 나면 구강 문제가 있는 건가요?', 'answer', '입 냄새만으로 원인을 판단할 수는 없습니다. 다만 심한 입 냄새가 지속되거나 붉은 잇몸, 침 흘림, 먹기 불편해하는 모습 등이 함께 보인다면 구강 검진을 받아보는 것이 좋습니다.')
          )
        )
        else item
      end
      order by ordinal_position
    )
    from jsonb_array_elements(value->'items') with ordinality as concerns(item, ordinal_position)
  )
),
updated_at = now()
where id = 'default';
