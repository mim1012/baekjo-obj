update public.brands
set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
  'shipping', '{"defaultCarrier":"post","shippingFee":0,"shippingFeeLabel":"무료배송","dispatchEstimate":"제작 시작 후 60일 이내 출고됩니다.","returnPolicy":"제작 시작 이후에는 단순 변심으로 인한 교환 및 환불이 불가합니다.","returnExclusions":"제작이 시작된 이후 단순 변심으로 교환 또는 환불을 요청하는 경우","supportContact":"010-7787-9021","supportHours":"09:00 ~ 18:00"}'::jsonb
)
where id = 'b6';

update public.brands
set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
  'shipping', '{"defaultCarrier":"cj","shippingFee":3000,"shippingFeeLabel":"3,000원","extraFeeNotice":"도서산간 배송비는 기본 배송비와 동일합니다.","dispatchEstimate":"오후 1시 이전 주문 건은 당일 출고됩니다.","returnPolicy":"제품 하자 또는 오배송의 경우 수령일로부터 7일 이내 교환·환불이 가능합니다. 배송 중 파손된 제품은 사진 확인 후 교환·환불을 진행합니다.","returnExclusions":"제품을 개봉하거나 사용한 경우, 고객의 부주의로 제품이 훼손된 경우, 제품 수령 후 7일이 경과한 단순 변심 교환·환불, 보관 부주의로 제품의 품질이 변질된 경우","supportContact":"1533-0623","supportHours":"09:00 ~ 18:00"}'::jsonb
)
where id = 'b9';

update public.brands
set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
  'shipping', '{"defaultCarrier":"gspostbox","shippingFee":3500,"shippingFeeLabel":"50,000원 이상 무료배송 / 50,000원 미만 3,500원","freeShippingThreshold":50000,"dispatchEstimate":"일반 상품은 입금 확인 후 1~4일 이내, 재고 상품은 3~5일 이내, 핸드메이드 의류는 주문 후 영업일 기준 최대 10일 이내 제작 및 발송됩니다.","returnPolicy":"상품 수령 후 7일 이내 교환 및 반품 신청이 가능합니다. 상품 하자 또는 오배송의 경우 발생하는 배송비는 판매자가 부담합니다. 주소 오기재로 상품이 반송되는 경우 발생하는 배송비는 고객이 부담합니다.","returnExclusions":"주문 제작이 이미 진행된 상품의 단순 변심, 상품 발송이 완료된 이후 주문 취소, 기타 상품 가치가 훼손되어 재판매가 어려운 경우","returnAddress":"충청남도 천안시 서북구 불당11로 20, 101호(1F) 메종슈슈\n연락처: 0507-1363-2553","supportContact":"0507-1363-2553"}'::jsonb
)
where id = 'b7';

update public.brands
set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
  'shipping', '{"defaultCarrier":"post","shippingFee":4000,"shippingFeeLabel":"기본 배송비 4,000원","extraFeeNotice":"제주 추가 4,000원 / 도서산간 추가 5,000원","dispatchEstimate":"발주 후 2일 이내 출고됩니다.","returnPolicy":"상품 수령 후 5일 이내 미개봉 상품에 한하여 교환·환불이 가능합니다. 개봉 상품은 이물질 등 제품 이상이 확인되는 경우 예외적으로 환불이 가능합니다.","returnExclusions":"상품 수령 후 5일이 경과한 경우, 상품을 개봉한 경우","asNotice":"제품 관련 A/S 문의는 고객센터를 통해 접수해 주세요.","supportContact":"054-554-5212","supportHours":"10:00 ~ 18:00"}'::jsonb
)
where id = 'b2';

update public.brands
set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
  'shipping', '{"defaultCarrier":"lotte","returnShippingFee":3000,"exchangeShippingFee":6000,"dispatchEstimate":"평균 1~2일 내 출고됩니다. 공휴일 이후부터 평균 1~2일 소요됩니다.","returnPolicy":"단순 변심의 경우 상품 수령 후 7일 이내 교환·반품 신청이 가능합니다. 단순 변심 반품 배송비는 구매자가 부담합니다. 표시·광고 내용과 다르거나 계약 내용과 다르게 이행된 경우 상품 수령 후 3개월 이내 또는 해당 사실을 안 날로부터 30일 이내 교환·반품이 가능합니다. 판매자 귀책 사유의 경우 반품 배송비는 판매자가 부담합니다.","returnExclusions":"교환·반품 요청 가능 기간 경과, 구매자 책임으로 인한 멸실·훼손, 포장 훼손으로 인한 상품 가치 감소, 사용 또는 일부 소비로 인한 상품 가치 감소, 시간 경과로 인한 재판매 곤란","supportContact":"010-3784-6922","supportHours":"10:00 ~ 17:00"}'::jsonb
)
where id = 'b3';

update public.brands
set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
  'shipping', '{"shippingFee":3000,"shippingFeeLabel":"3,000원","extraFeeNotice":"도서산간 배송비는 기본 배송비와 동일합니다.","dispatchEstimate":"평균 1일 이내 출고되며, 오후 1시 이전 주문 건은 당일 출고됩니다. 공휴일 주문은 다음날 출고됩니다.","returnPolicy":"제품 수령 후 7일 이내 교환·환불 신청이 가능합니다. 제품 불만족 시 100% 환불이 가능합니다.","returnExclusions":"제품 패키지가 심하게 훼손된 경우","supportContact":"070-8095-5730","supportHours":"평일 09:00 ~ 18:00","supportEmail":"penefit@penefitglobal.com","supportKakaoLabel":"페네핏(PENEFIT)"}'::jsonb
)
where id = 'b1';

update public.brands
set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
  'shipping', '{"defaultCarrier":"cj","shippingFee":3000,"shippingFeeLabel":"3,000원","dispatchEstimate":"영업일 오후 12시 이전 주문 건은 당일 출고되며, 이후 주문 건은 익일 출고됩니다. 공휴일 주문은 다음 영업일 출고됩니다.","returnPolicy":"제품 수령 후 7일 이내 미사용 제품에 한하여 교환·환불이 가능합니다. 제품 불량 또는 오배송의 경우 배송비는 판매자가 부담하며, 고객 단순 변심은 왕복 배송비를 고객이 부담합니다.","returnExclusions":"제품 사용 흔적, 제품 포장 훼손, 제품 구성품 누락, 고객 부주의로 인한 제품 파손","asNotice":"제품 하자 또는 제품 개선을 목적으로 A/S 및 리콜이 진행될 수 있습니다. A/S 또는 리콜 관련 문의는 고객센터를 통해 접수해 주세요.","supportContact":"055-603-0808","supportHours":"평일 09:00 ~ 18:00"}'::jsonb
)
where id = 'b5';
