-- Audit·B2B 히어로 대표 이미지를 #344(dad)에서 새로 만든 전용 이미지로 게시본에 반영한다.
--
-- 배경: #344는 두 페이지의 CMS 기본값(defaultContent)만 새 이미지로 바꿨다. 그런데 두 페이지는
-- 이미 "관리 중"(published_content.__managedVersion = 1)이라 게시본이 기본값보다 우선하고, 게시본은
-- 여전히 옛 이미지를 들고 있었다. 그 결과 운영 화면에는 새 이미지가 한 번도 나오지 않았다.
--   audit : /images/brand-curation-hero.webp  → /images/audit-review-hero-v1.webp
--   b2b   : /images/care_guide_hero.png       → /images/b2b-partnership-hero-v1.webp
-- 특히 B2B의 care_guide_hero.png는 케어키트(care-kit) 페이지와 같은 파일이라 두 화면이 같은 이미지로
-- 보였다. care-kit 게시본은 이 마이그레이션이 건드리지 않는다.
--
-- 관리자 화면에서 "대표 이미지"를 바꿔 게시하는 것과 같은 경로를 밟는다: 초안(draft_content)을
-- 새 revision으로 저장한 뒤 publish_cms_page(0165)로 게시해 cms_page_versions 이력까지 남긴다.
-- 게시본만 직접 고치면 초안에 옛 이미지가 남아, 다음 관리자 게시 때 옛 이미지로 되돌아간다.
--
-- 안전 조건(하나라도 어긋나면 그 페이지는 아무 것도 쓰지 않는다):
--   1) 관리 중인 페이지일 것 — 아니면 기본값(이미 새 이미지)이 화면에 쓰이므로 할 일이 없다.
--   2) 게시되지 않은 초안이 없을 것(draft_revision = published_revision) — 관리자 작업을 덮지 않는다.
--   3) 게시본과 초안의 hero.image가 둘 다 정확히 옛 값일 것 — 관리자가 이미 다른 이미지로 바꿨다면
--      그 선택을 존중한다.
-- 재실행하면 3)이 거짓이 되어 no-op이다.
do $$
declare
  r record;
  v_new_revision bigint;
begin
  for r in
    select *
    from (values
      ('audit', '/images/brand-curation-hero.webp', '/images/audit-review-hero-v1.webp'),
      ('b2b', '/images/care_guide_hero.png', '/images/b2b-partnership-hero-v1.webp')
    ) as t(page_key, old_image, new_image)
  loop
    v_new_revision := null;

    update public.cms_pages as p
       set draft_content = jsonb_set(p.draft_content, '{hero,image}', to_jsonb(r.new_image)),
           draft_revision = p.draft_revision + 1,
           updated_at = now()
     where p.page_key = r.page_key
       and p.published_content -> '__managedVersion' = '1'::jsonb
       and p.draft_revision = p.published_revision
       and p.published_content -> 'hero' ->> 'image' = r.old_image
       and p.draft_content -> 'hero' ->> 'image' = r.old_image
    returning p.draft_revision into v_new_revision;

    if v_new_revision is not null then
      perform public.publish_cms_page(r.page_key, v_new_revision, null);
    end if;
  end loop;
end $$;
