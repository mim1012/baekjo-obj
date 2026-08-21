-- 왜: HWPX 지시서 2026-08-21의 "Audit 자세히 보기" 요구 반영. 노블독(b3)·알로밍(b5)의
-- 장문 감사 리포트(백조오브제 AUDIT PDF: BOA-2026-001/002)를 brand.detail.auditReport 로 주입한다.
-- auditReport 가 채워지면 /brands/[slug] 상세 페이지의 <BrandAuditReport> 패널이 자동으로 렌더되고
-- "브랜드 자료 더 보기" 버튼이 노출된다(src/app/brands/[id]/page.tsx). repo.detailAuditReport 는
-- reportNo/auditedAt/status/headline/summaryTitle/summary/selectionReason(모두 string) + process(array)
-- 가 모두 있어야 리포트로 인정한다. 값은 PDF 원문(선정 이유·검토 과정·결론)을 그대로 옮겼다.
-- jsonb_set 치환이라 재실행해도 동일 최종값 — 멱등.

-- b3 노블독 (BOA-2026-001)
update public.brands
set detail = jsonb_set(
      coalesce(detail, '{}'::jsonb),
      '{auditReport}',
      jsonb_build_object(
        'reportNo', 'BOA-2026-001',
        'auditedAt', '2026.08',
        'status', 'Audit Completed',
        'headline', '오래 함께할 시간을 지키는 작은 실천',
        'summaryTitle', '각자의 상황에서 계속할 수 있는 구강 관리',
        'summary', '노블독은 구강 건강을 중요한 관리 영역으로 바라보며, 하나의 방법을 정답으로 두기보다 반려동물과 보호자가 각자의 상황에 맞는 방법으로 구강 관리를 지속할 수 있도록 제품을 설계하고 있는 브랜드입니다.',
        'selectionReason', '반려동물에게 구강 관리는 중요합니다. 하지만 양치를 어려워하는 아이에게 매일 같은 방법을 요구하는 것은 쉽지 않습니다. 노블독은 구강 관리를 한 가지 방법에만 두지 않고, 직접 분사하거나 칫솔과 거즈를 함께 사용하고, 상황에 따라 마시는 물이나 사료와 함께 급여할 수 있도록 여러 방법을 제안하며 관리가 중단되지 않는 데 집중하고 있습니다.',
        'process', jsonb_build_array(
          '브랜드 철학 및 제품 개발 방향',
          '동물용의약외품 신고 정보',
          '제품 성분 및 시험성적서',
          '스프레이·칫솔 구조 및 사용 방식',
          '실제 사용자 피드백',
          '대표자 인터뷰'
        )
      ),
      true
    )
where id = 'b3';

-- b5 알로밍 (BOA-2026-002)
update public.brands
set detail = jsonb_set(
      coalesce(detail, '{}'::jsonb),
      '{auditReport}',
      jsonb_build_object(
        'reportNo', 'BOA-2026-002',
        'auditedAt', '2026.08',
        'status', 'Audit Completed',
        'headline', '당신이 받은 사랑에 답하는 가장 다정한 언어',
        'summaryTitle', '모든 형태에 이유가 있는 그루밍 브러시',
        'summary', '알로밍은 반려동물의 행동과 그루밍 방식을 연구하고, 그 과정에서 세운 기준을 제품의 구조와 소재, 사용 방식 전반에 일관되게 반영하고 있는 브랜드입니다.',
        'selectionReason', '시장에는 다양한 반려동물 브러시가 있습니다. 하지만 단순히 털을 관리하는 도구를 넘어, 반려동물의 행동을 연구하고 그 경험을 제품 구조로 구현하는 브랜드는 많지 않습니다. 알로밍은 약 4년에 걸친 개발과 테스트 과정에서 그루밍의 세기와 속도, 고양이 혀 돌기의 구조를 연구해 제품의 형태와 사용 방식에 구체적으로 반영하고 있습니다.',
        'process', jsonb_build_array(
          '캣코드 기업 철학 및 개발 이력',
          '알로밍 브랜드 철학 및 창업 스토리',
          '제품 구조 및 설계 의도',
          '약 4년에 걸친 연구 및 개발 과정',
          '등록 특허 및 지식재산권 자료',
          '국내 생산 체계',
          '소재 관련 자료',
          '디자인 어워드 수상 내역',
          '장모용·단모용 모듈 설계',
          '실제 사용자 피드백',
          '제품의 한계 및 개선 요소',
          '대표자 인터뷰'
        )
      ),
      true
    )
where id = 'b5';
