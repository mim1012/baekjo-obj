-- 0036_brand_naming_normalization.sql
--
-- G004(fe/design-brand-naming): visible brand naming normalization only.
-- - brands.name for b6 is a public display string, so `re펫 (RePet)`/`re펫` converge to `RE:펫`.
-- - products.detail->>'brandName' is the public product-card/PDP brand label, so b6 products converge to `RE:펫`.
-- - Product/model English `RePet` in product names and descriptions is intentionally preserved.
--
-- Idempotent: each update is conditional and converges to the same final state.

update public.brands
set name = 'RE:펫'
where id = 'b6'
  and name in ('re펫', 're펫 (RePet)', 'RE:펫 (RE:PET)', 'RE:펫 (RePet)');

update public.brands
set detail = jsonb_set(
      detail,
      '{philosophy}',
      to_jsonb(replace(detail->>'philosophy', 're펫은', 'RE:펫은')),
      true
    )
where id = 'b6'
  and detail->>'philosophy' like 're펫은%';

update public.products
set detail = jsonb_set(detail, '{brandName}', to_jsonb('RE:펫'::text), true)
where brand_id = 'b6'
  and coalesce(detail->>'brandName', '') in ('re펫', 're펫 (RePet)', 'RE:펫 (RE:PET)', 'RE:펫 (RePet)');
