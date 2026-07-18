import Link from 'next/link';
import { ArrowUpRight, Bell } from 'lucide-react';
import { getNoticesConfigWithFallback } from '@/lib/notices/repo';
import { formatDate } from '@/lib/format';
import NoticeCategoryBadge from '@/components/common/NoticeCategoryBadge';

export const metadata = {
  title: '공지사항 | 백조오브제',
  description: '백조오브제의 새로운 소식과 이벤트, 서비스 안내를 확인하세요.',
};

// 서버 컴포넌트 — notices repo 를 직접 읽는다(자기 API HTTP 왕복 금지, §10-2 ①경로).
// 관리자 저장이 즉시 반영돼야 하므로 요청 시점 DB 조회(정적 프리렌더 제외).
export const dynamic = 'force-dynamic';

export default async function NoticesPage() {
  const { items } = await getNoticesConfigWithFallback();
  // 공지 config 는 append 순서로 저장된다 — 공개 화면은 최신순 정렬(2026-07-18 CRUD e2e 구축 중
  // 발견: 새 공지가 홈 소식에 절대 안 뜨던 버그와 동일 원인. 목록 페이지도 방치하면 신규 공지가
  // 맨 아래에 묻힌다). date 는 YYYY-MM-DD 문자열이라 localeCompare 로 비교하고, JS sort 는 안정
  // 정렬이라 같은 날짜는 admin 저장 순서를 유지한다.
  const notices = [...items].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="min-h-dvh bg-[#F4F2EC] bg-noise py-10 lg:py-12">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-8 lg:px-10">
        <div className="mb-5 flex flex-col gap-4 border-b border-[#D8D6CE] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-editorial text-[13px] italic text-[#A8742E]">Baekjo archive</p>
            <h1 className="mt-2 text-[30px] font-bold leading-[1.15] tracking-tight text-[#17211D] sm:text-[42px]">공지사항</h1>
            <p className="mt-2 text-[15px] text-[#6F766F] break-keep">백조오브제의 새로운 소식과 이벤트를 안내해 드립니다.</p>
          </div>
          <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#59615B]">
            <Bell className="size-4 text-[#A8742E]" strokeWidth={1.6} aria-hidden="true" />
            {notices.length}개의 소식
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#E7E0D5] bg-white">
          <div className="hidden h-[52px] items-center bg-[#FAF8F3] px-4 text-[12px] font-bold text-[#59615B] lg:grid lg:grid-cols-[64px_84px_minmax(0,1fr)_128px_120px_84px_84px] lg:text-center">
            <div>No</div>
            <div>분류</div>
            <div className="text-left">제목</div>
            <div>글쓴이</div>
            <div>작성시간</div>
            <div>조회수</div>
            <div>좋아요</div>
          </div>
          
          <ul className="divide-y divide-[#E1DDD4]">
            {notices.map((notice, index) => (
              <li key={notice.id}>
                <Link href={`/notices/${notice.id}`} title={notice.title} className="group block px-4 py-4 transition-colors hover:bg-[#FAF8F3] lg:px-4 lg:py-0">
                  <div className="lg:hidden">
                    <div className="flex items-center justify-between gap-3">
                      <NoticeCategoryBadge category={notice.category} />
                      <time className="font-editorial text-[12px] tracking-wide text-[#8A7A64]">{formatDate(notice.date)}</time>
                    </div>
                    <h2 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-[1.5] text-[#17211D] group-hover:text-[#A8742E]">
                      {notice.title}
                    </h2>
                    <div className="mt-3 flex items-center gap-3 text-[12px] text-[#59615B]">
                      <span>{notice.writer}</span>
                      <span className="text-[#B1ADA4]" aria-hidden="true">·</span>
                      <span>조회 {notice.views}</span>
                      <span className="text-[#B1ADA4]" aria-hidden="true">·</span>
                      <span>좋아요 {notice.likes}</span>
                      <span className="ml-auto text-[11px] tabular-nums text-[#A7AAA4]">No. {notices.length - index}</span>
                    </div>
                  </div>

                  <div className="hidden min-h-[68px] items-center lg:grid lg:grid-cols-[64px_84px_minmax(0,1fr)_128px_120px_84px_84px] lg:text-center">
                    <div className="text-[13px] tabular-nums text-[#59615B]">
                      {notices.length - index}
                    </div>
                    <div className="flex justify-center">
                      <NoticeCategoryBadge category={notice.category} />
                    </div>
                    <div className="min-w-0 truncate pr-5 text-left text-[15px] font-medium text-[#17211D] group-hover:text-[#A8742E]">
                      {notice.title}
                    </div>
                    <div className="text-[13px] text-[#59615B]">{notice.writer}</div>
                    <time className="font-editorial text-[12px] tracking-wide text-[#8A7A64]">{formatDate(notice.date)}</time>
                    <div className="text-[13px] tabular-nums text-[#59615B]">{notice.views}</div>
                    <div className="flex items-center justify-center text-[13px] tabular-nums text-[#59615B]">{notice.likes}<ArrowUpRight className="ml-1 size-3 text-[#A8742E] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" /></div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex justify-center gap-2">
          <button type="button" aria-current="page" className="flex size-9 items-center justify-center rounded-md border border-[#17211D] bg-[#17211D] text-sm font-semibold text-[#FBFAF7]">1</button>
        </div>

      </div>
    </div>
  );
}
