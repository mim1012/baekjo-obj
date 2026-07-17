import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getNoticesConfigWithFallback } from '@/lib/notices/repo';
import { formatDate } from '@/lib/format';
import NoticeCategoryBadge from '@/components/common/NoticeCategoryBadge';

// 서버 컴포넌트 — notices repo 를 직접 읽는다(자기 API HTTP 왕복 금지, §10-2 ①경로).
// 관리자 저장이 즉시 반영돼야 하므로 요청 시점 DB 조회(정적 프리렌더 제외).
export const dynamic = 'force-dynamic';

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { items: notices } = await getNoticesConfigWithFallback();
  const notice = notices.find(n => n.id === resolvedParams.id);

  if (!notice) {
    notFound();
  }

  return (
    <div className="min-h-dvh bg-[#F4F2EC] bg-noise py-10 lg:py-12">
      <div className="mx-auto max-w-[900px] px-4 sm:px-8">
        
        <Link href="/notices" className="mb-5 inline-flex items-center text-sm font-semibold text-[#6F766F] transition-colors hover:text-[#17211D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8742E] focus-visible:ring-offset-2">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> 목록으로
        </Link>

        <article className="overflow-hidden rounded-xl border border-[#E7E0D5] bg-white">
          <header className="border-b border-[#E1DDD4] px-5 py-6 sm:px-8 sm:py-8">
            <NoticeCategoryBadge category={notice.category} />
            <h1 className="mb-5 mt-4 text-[26px] font-bold leading-[1.3] tracking-tight text-[#17211D] sm:text-[34px]">
              {notice.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-[#59615B]">
              <span>{notice.writer}</span>
              <span className="text-[#B1ADA4]" aria-hidden="true">·</span>
              <time className="font-editorial tracking-wide text-[#8A7A64]">{formatDate(notice.date)}</time>
              <span className="text-[#B1ADA4]" aria-hidden="true">·</span>
              <span>조회 {notice.views}</span>
              <span className="text-[#B1ADA4]" aria-hidden="true">·</span>
              <span>좋아요 {notice.likes}</span>
            </div>
          </header>

          <div className="min-h-[260px] px-5 py-8 sm:px-8 sm:py-10">
            <div className="max-w-[800px]">
              {notice.content.split('\n').map((line, i) => (
                <p key={i} className="mb-4 min-h-[1.5rem] text-[15px] leading-[1.8] text-[#334139] break-keep sm:text-[16px]">
                  {line}
                </p>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 border-t border-[#E1DDD4] bg-[#FAF8F3] p-5 sm:flex-row sm:justify-between">
            <Link href="/notices" className="rounded-md border border-[#D8D6CE] bg-white px-5 py-2.5 text-sm font-semibold text-[#17211D] transition hover:bg-[#F3EEE6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8742E] focus-visible:ring-offset-2">
              목록보기
            </Link>
          </div>
        </article>

      </div>
    </div>
  );
}
