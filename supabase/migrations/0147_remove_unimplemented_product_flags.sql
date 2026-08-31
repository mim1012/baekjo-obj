update public.products
set detail = detail - 'isMembersOnlyPrice' - 'pointsEnabled' - 'pointsRate'
where jsonb_typeof(detail) = 'object'
  and detail ?| array['isMembersOnlyPrice', 'pointsEnabled', 'pointsRate'];
