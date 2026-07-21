-- 0070_recompute_product_rating.sql
--
-- 배경: 0037(remove_fake_ratings)이 실체 없는 마케팅용 별점을 0으로 지웠지만, 이후 실제
--   product_reviews(0029)를 집계해 products.rating/review_count를 채우는 로직이 없었다.
--   그 결과 구매평이 쌓여도 상품 카드/상세의 별점·리뷰수는 계속 0으로 고정된다.
--
-- 이 마이그레이션은 product_reviews의 published 상태 리뷰만 집계해 products.rating(반올림
--   소수 1자리)·review_count를 갱신하는 함수 + INSERT/UPDATE/DELETE 트리거를 추가한다.
--   hidden 처리된 구매평(관리자 moderation)은 집계에서 제외한다 — 악성/부적절 리뷰를 숨기면
--   그 리뷰의 별점도 즉시 평균에서 빠져야 하므로, moderation 액션 하나로 표시 별점까지
--   같이 정정된다(§10-6 규칙: 화면은 DB가 유일한 진실 소스).
--
-- product_id가 바뀌는 UPDATE(운영상 거의 없지만 스키마상 가능)에도 대비해 OLD·NEW 양쪽을
--   재계산한다. rating 컬럼 타입은 numeric(0004_products_brands.sql), review_count는 int.
--
-- 멱등: create or replace function + drop trigger if exists 이므로 재실행 무해.

create or replace function public.recompute_product_rating(p_product_id text)
returns void as $$
declare
  v_avg numeric;
  v_count int;
begin
  select round(avg(rating)::numeric, 1), count(*)
    into v_avg, v_count
  from public.product_reviews
  where product_id = p_product_id
    and status = 'published';

  update public.products
  set rating = coalesce(v_avg, 0),
      review_count = coalesce(v_count, 0)
  where id = p_product_id;
end;
$$ language plpgsql;

create or replace function public.trigger_recompute_product_rating()
returns trigger as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_product_rating(old.product_id);
    return old;
  end if;

  perform public.recompute_product_rating(new.product_id);
  if tg_op = 'UPDATE' and old.product_id is distinct from new.product_id then
    perform public.recompute_product_rating(old.product_id);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists product_reviews_recompute_rating on public.product_reviews;
create trigger product_reviews_recompute_rating
after insert or update or delete on public.product_reviews
for each row execute function public.trigger_recompute_product_rating();
