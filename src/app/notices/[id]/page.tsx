import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notices } from '@/data/notices';
import { formatDate } from '@/lib/format';

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const notice = notices.find(n => n.id === resolvedParams.id);

  if (!notice) {
    notFound();
  }

  return (
    <div className="bg-[#F4F2EC] min-h-dvh py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        
        <Link href="/notices" className="mb-6 inline-flex items-center text-sm font-medium text-gray-500 hover:text-[#2F3B34]">
          <ArrowLeft className="mr-2 h-4 w-4" /> 목록으로
        </Link>

        <div className="bg-white rounded-sm shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-100 p-8 sm:p-10">
            <span className={`inline-block mb-4 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-sm ${
              notice.category === 'notice' ? 'bg-gray-100 text-gray-600' :
              notice.category === 'event' ? 'bg-[#68776C]/10 text-[#68776C]' :
              'bg-[#2F3B34]/10 text-[#2F3B34]'
            }`}>
              {notice.category === 'notice' ? '공지' : notice.category === 'event' ? '이벤트' : '브랜드'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#202521] mb-4 leading-tight">
              {notice.title}
            </h1>
            <div className="text-sm text-gray-400">
              {formatDate(notice.date)}
            </div>
          </div>

          {/* Body */}
          <div className="p-8 sm:p-10 min-h-[300px]">
            <div className="prose prose-gray max-w-none">
              {notice.content.split('\n').map((line, i) => (
                <p key={i} className="text-gray-700 leading-relaxed mb-4 min-h-[1.5rem]">
                  {line}
                </p>
              ))}
            </div>
          </div>

          {/* Footer (Next/Prev mock) */}
          <div className="border-t border-gray-100 p-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
            <Link href="/notices" className="rounded-sm border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-100">
              목록보기
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
