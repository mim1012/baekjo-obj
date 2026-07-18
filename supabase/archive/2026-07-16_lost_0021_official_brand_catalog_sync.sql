-- 0021_official_brand_catalog_sync.sql
-- 2026-07-16 공식 브랜드몰·공식 판매자 페이지 대조 결과 반영.
-- 공개 가격이 없는 상품은 null을 유지하고, 동명 브랜드 오연결·중복 SKU는 비노출한다.

update public.brands
set detail = detail || '{"representativeProductIds":["p4","p5"]}'::jsonb
where id = 'b2';

update public.brands
set detail = detail || '{"sourceUrls":["https://www.coupang.com/vp/products/8769224002"],"representativeProductIds":["p7"]}'::jsonb
where id = 'b3';

update public.brands
set detail = detail || '{"representativeProductIds":["p12"]}'::jsonb
where id = 'b5';

update public.brands
set
  name = 'RE:펫 (RE:PET)',
  detail = detail || '{"officialUrl":"https://www.idus.com/v2/product/3ef10eaa-7cd9-492b-a0a1-c7eaeafe12fd","sourceUrls":["https://www.idus.com/v2/product/3ef10eaa-7cd9-492b-a0a1-c7eaeafe12fd"],"description":"반려동물의 모습을 양모로 한 점씩 구현하는 맞춤 초상화 브랜드","philosophy":"RE:펫은 사진 속 반려동물의 표정과 털결을 양모로 세심하게 재현합니다.\n\n공장에서 찍어내는 장식품이 아니라, 한 아이를 오래 기억하기 위한 단 하나의 오브제를 주문 제작합니다.","auditPoints":["주문 사진을 바탕으로 제작하는 1:1 맞춤 작품","양모와 특수 원단을 사용한 수작업 입체 초상화","작품별 표정과 털색을 개별 상담 후 구현","주문 후 제작·발송까지 최대 30일 소요","세탁·직사광선·습기를 피해야 하는 오브제"],"representativeProductIds":["p19"],"relatedConcernSlugs":["stress","living"],"isRecommended":false,"isNew":true}'::jsonb
where id = 'b6';

update public.brands
set detail = detail || '{"officialUrl":"https://shop.coupang.com/vid/A01329172","representativeProductIds":["p17","p18"]}'::jsonb
where id = 'b8';

update public.brands
set detail = detail || '{"description":"애니마크·퍼르르펙트·파티애니멀을 전개하는 반려동물 라이프스타일 기업","philosophy":"써니 사이드업은 지구에서 가장 SUNNY한 모든 동물을 위한 회사를 지향합니다.\n\n임상시험과 실제 사용성을 바탕으로 제품을 만들고, 동물실험을 하지 않는 원칙을 공개하고 있습니다.","auditPoints":["애니마크 피부 연고의 제조사·용량·사용법 공개","퍼르르펙트 캣닢 향수의 사용 대상과 주의사항 공개","반려동물용과 사람용 상품을 분리 노출","제품 개발 과정의 임상시험과 동물실험 배제 원칙 명시","퍼르르펙트·파티애니멀 등 제품 브랜드 구분"],"representativeProductIds":["p21","p22"]}'::jsonb
where id = 'b9';

update public.products
set
  price = 138000,
  sale_price = 109900,
  rating = 0,
  review_count = 0,
  detail = detail || '{"sourceVerifiedAt":"2026-07-16","catalogStatus":"ready","isMembersOnlyPrice":false}'::jsonb
where id = 'p1';

update public.products
set
  price = 245000,
  sale_price = 199000,
  rating = 0,
  review_count = 0,
  detail = detail || '{"sourceVerifiedAt":"2026-07-16","catalogStatus":"ready","isMembersOnlyPrice":false}'::jsonb
where id = 'p2';

update public.products
set
  price = 43000,
  sale_price = 34900,
  rating = 0,
  review_count = 0,
  detail = detail || '{"sourceVerifiedAt":"2026-07-16","catalogStatus":"ready","isMembersOnlyPrice":false}'::jsonb
where id = 'p3';

update public.products
set
  name = '오미프로 OMIPRO-D 강아지용 230g',
  price = null,
  sale_price = null,
  rating = 0,
  review_count = 0,
  detail = detail || '{"sourceVerifiedAt":"2026-07-16","catalogStatus":"ready","summary":"생후 8개월 이상 강아지의 사료에 섞거나 간식처럼 급여하는 230g 제품","description":"오미프로 공식 전시 페이지에서 확인한 강아지용 OMIPRO-D입니다. 판매가는 공개되지 않아 가격 협의 상품으로 안내하며, 치료 효능이 아닌 일상 냄새 관리 범위로 소개합니다."}'::jsonb
where id = 'p4';

update public.products
set
  name = '오미프로 OMIPRO-C 고양이용 230g',
  price = null,
  sale_price = null,
  rating = 0,
  review_count = 0,
  detail = detail || '{"sourceUrl":"https://buykorea.org/ec/prd/selectSvcDetail.do?goodsSn=3703785","sourceVerifiedAt":"2026-07-16","catalogStatus":"ready","summary":"고구마와 옥수수 등을 사용해 압출 성형한 고양이용 230g 제품","description":"바이코리아 공식 수출 상품 페이지에서 확인한 고양이용 OMIPRO-C입니다. 공개 가격은 도매 조건이므로 국내 소매가는 가격 협의로 안내합니다."}'::jsonb
where id = 'p5';

update public.products
set
  is_visible = false,
  detail = detail || '{"catalogStatus":"draft","dedupeReason":"공식 판매 단위가 아닌 내부 조합 상품"}'::jsonb
where id = 'p6';

update public.products
set
  price = 25000,
  sale_price = 21890,
  rating = 0,
  review_count = 0,
  detail = detail || '{"sourceVerifiedAt":"2026-07-16","catalogStatus":"ready","description":"노블독 공식 판매자 페이지에서 확인한 100ml 뿌리는 치약입니다. 직접 분사하거나 물·사료에 섞어 사용할 수 있으며, 구강 관리 범위로 안내합니다."}'::jsonb
where id = 'p7';

update public.products
set
  is_visible = false,
  detail = detail || '{"catalogStatus":"draft","description":"p7과 동일한 상품을 다른 판매자가 등록한 중복 페이지로 확인되어 공개 카탈로그에서는 노출하지 않습니다.","dedupeReason":"p7과 동일 상품"}'::jsonb
where id = 'p8';

update public.products
set
  price = 32200,
  sale_price = 24200,
  rating = 0,
  review_count = 0,
  detail = detail || '{"sourceVerifiedAt":"2026-07-16","catalogStatus":"ready"}'::jsonb
where id = 'p12';

update public.products
set
  is_visible = false,
  detail = detail || '{"catalogStatus":"draft","dedupeReason":"p12의 색상·모듈 옵션으로 통합"}'::jsonb
where id in ('p13', 'p14');

insert into public.products (
  id, brand_id, name, price, sale_price, category, category_slug, lifestyle_category,
  pet_type, stock, rating, review_count, is_visible, is_best, is_recommended, detail
) values
  (
    'p15', 'b7', '[for ur dog] Bamboo Cardigan', 98000, 68600,
    '패션과 액세서리', 'fashion-and-accessories', '패션과 액세서리',
    'dog', 0, 0, 0, true, false, true,
    '{"brandName":"메종슈슈","sourceUrl":"https://maisonchouchou-pet.com/product/for-ur-dog-bamboo-cardigan/163/","sourceVerifiedAt":"2026-07-16","catalogStatus":"sold_out","concernTags":["stress","living"],"ageGroup":"all","image":"/products/p15.jpg","summary":"반려견을 위한 대나무 소재 카디건","description":"메종슈슈 공식몰에서 확인한 반려견용 Bamboo Cardigan입니다. 현재 공식몰에서는 품절 상태입니다.","shippingNotice":"브랜드 주문 제작 여부와 사이즈별 재고 확인 후 배송일을 안내합니다.","options":[{"id":"opt15_xs","name":"XS","price":0,"stock":0},{"id":"opt15_s","name":"S","price":0,"stock":0},{"id":"opt15_m","name":"M","price":0,"stock":0},{"id":"opt15_l","name":"L","price":0,"stock":0},{"id":"opt15_xl","name":"XL","price":0,"stock":0},{"id":"opt15_xxl","name":"XXL","price":0,"stock":0}]}'::jsonb
  ),
  (
    'p16', 'b7', '메종슈슈 Gold Ops', 98000, 68600,
    '패션과 액세서리', 'fashion-and-accessories', '패션과 액세서리',
    'dog', 0, 0, 0, true, false, true,
    '{"brandName":"메종슈슈","sourceUrl":"https://maisonchouchou-pet.com/product/gold-ops/191","sourceVerifiedAt":"2026-07-16","catalogStatus":"sold_out","concernTags":["stress","living"],"ageGroup":"all","image":"/products/p16.jpg","summary":"반려견의 특별한 순간을 위한 골드 컬러 오프숄더 드레스","description":"메종슈슈 공식몰에서 확인한 Gold Ops 상품입니다. XS·S·M·L 및 맞춤 사이즈로 제작되며 현재 공식몰에서는 품절 상태입니다.","shippingNotice":"주문 제작 상품은 제작 기간이 추가될 수 있습니다.","options":[{"id":"opt16_default","name":"사이즈 선택 후 주문","price":0,"stock":0}],"isMembersOnlyPrice":false}'::jsonb
  ),
  (
    'p17', 'b8', '차콜프레시 그레인 고양이 모래 탈취제 500g', 30000, 14850,
    '구강과 위생', 'fragrance-and-hygiene', '구강과 위생',
    'cat', 0, 0, 0, true, false, true,
    '{"brandName":"챠콜스토리","sourceUrl":"https://www.coupang.com/vp/products/9468681405","sourceVerifiedAt":"2026-07-16","catalogStatus":"ready","concernTags":["digestion","living"],"ageGroup":"all","image":"/products/p17.jpg","summary":"고양이 화장실 주변 냄새 관리를 위한 참숯 탈취제","description":"챠콜스토리 공식 판매자 페이지에서 확인한 500g 백탄 참숯 고양이 모래 탈취제입니다. 40g과 500g 옵션 중 500g 상품을 기준으로 안내합니다.","options":[{"id":"opt17_default","name":"500g","price":0,"stock":0}],"isMembersOnlyPrice":false}'::jsonb
  ),
  (
    'p18', 'b8', '차콜프레시 참숯 탈취 매트', 36000, 14900,
    '생활과 오브제', 'living-and-objet', '생활과 오브제',
    'both', 0, 0, 0, true, false, true,
    '{"brandName":"챠콜스토리","sourceUrl":"https://www.coupang.com/vp/products/9468730890","sourceVerifiedAt":"2026-07-16","catalogStatus":"ready","concernTags":["living"],"ageGroup":"all","image":"","summary":"강아지·고양이 방석과 쿠션 내부에 사용하는 참숯 탈취 매트","description":"챠콜스토리 공식 판매자 페이지에서 확인한 반려동물 방석·쿠션 내부용 참숯 탈취 매트입니다. 실제 상품 이미지는 공식 원본 확보 전까지 노출하지 않습니다.","options":[{"id":"opt18_default","name":"펫 매트 1개","price":0,"stock":0}],"isMembersOnlyPrice":false}'::jsonb
  ),
  (
    'p19', 'b6', 'RE:펫 우리아이 입체 맞춤 양모 초상화', 250000, null,
    '생활과 오브제', 'living-and-objet', '생활과 오브제',
    'both', 1, 0, 0, true, false, false,
    '{"brandName":"RE:펫","sourceUrl":"https://www.idus.com/v2/product/3ef10eaa-7cd9-492b-a0a1-c7eaeafe12fd","sourceVerifiedAt":"2026-07-16","catalogStatus":"ready","concernTags":["stress","living"],"ageGroup":"all","image":"/products/p19.jpg","summary":"반려동물 사진을 바탕으로 양모와 특수 원단으로 제작하는 1:1 맞춤 초상화","description":"아이디어스 RE:펫 작가 페이지에서 확인한 수작업 입체 초상화입니다. 주문 사진을 바탕으로 표정과 털색을 상담한 뒤 한 점씩 제작합니다.","shippingNotice":"주문 제작 상품으로 결제 후 발송까지 최대 30일이 소요될 수 있습니다.","options":[{"id":"opt19_default","name":"1:1 맞춤 제작","price":0,"stock":1}],"isMembersOnlyPrice":false}'::jsonb
  ),
  (
    'p21', 'b9', '애니마크 반려동물 피부 연고', 8000, 5900,
    '건강과 케어', 'wellness-and-care', '건강과 케어',
    'both', 98, 0, 0, true, false, true,
    '{"brandName":"써니 사이드업","sourceUrl":"https://www.ssup.co.kr/goods/view?no=38","sourceVerifiedAt":"2026-07-16","catalogStatus":"ready","concernTags":["skin"],"ageGroup":"all","image":"/products/p21.webp","summary":"발바닥 갈라짐·턱 주변·피부 보습에 사용하는 반려동물용 애니마크 연고","description":"써니 사이드업 공식몰에서 확인한 핥아도 안전한 반려동물 피부 연고입니다. 하루 1~2회 얇게 바르며, 7g·33g·77g 용량을 선택할 수 있습니다.","options":[{"id":"opt21_7g","name":"7g","price":0,"stock":98},{"id":"opt21_33g","name":"33g","price":12000,"stock":0},{"id":"opt21_77g","name":"77g","price":24000,"stock":0}],"isMembersOnlyPrice":false}'::jsonb
  ),
  (
    'p22', 'b9', '퍼르르펙트 고양이 캣닢 향수', 40000, 18000,
    '생활과 오브제', 'fragrance-and-hygiene', '생활과 오브제',
    'cat', 0, 0, 0, true, false, false,
    '{"brandName":"써니 사이드업","sourceUrl":"https://ssup.co.kr/goods/view?no=43","sourceVerifiedAt":"2026-07-16","catalogStatus":"ready","concernTags":["stress"],"ageGroup":"all","image":"/products/p22.webp","summary":"캣닢을 담은 11ml 고양이용 향수","description":"써니 사이드업 공식몰의 퍼르르펙트 고양이 캣닢 향수입니다. 스프레이와 롤온 타입을 선택할 수 있으며 반려동물에게 직접 분사하지 않습니다.","options":[{"id":"opt22_spray","name":"스프레이 타입 11ml","price":0,"stock":0},{"id":"opt22_rollon","name":"롤온 타입 11ml","price":0,"stock":0}],"isMembersOnlyPrice":false}'::jsonb
  )
on conflict (id) do update set
  brand_id = excluded.brand_id,
  name = excluded.name,
  price = excluded.price,
  sale_price = excluded.sale_price,
  category = excluded.category,
  category_slug = excluded.category_slug,
  lifestyle_category = excluded.lifestyle_category,
  pet_type = excluded.pet_type,
  stock = excluded.stock,
  rating = excluded.rating,
  review_count = excluded.review_count,
  is_visible = excluded.is_visible,
  is_best = excluded.is_best,
  is_recommended = excluded.is_recommended,
  detail = public.products.detail || excluded.detail;

update public.products
set
  is_visible = false,
  detail = detail || '{"sourceVerifiedAt":"2026-07-16","catalogStatus":"draft","description":"RE:펫 작가 브랜드와 무관한 동명 상품으로 확인되어 공개 카탈로그에서 제외합니다.","dedupeReason":"동명 브랜드 오연결"}'::jsonb
where id = 'p20';
