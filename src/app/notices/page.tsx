import Link from 'next/link';
import { notices } from '@/data/notices';
import { formatDate } from '@/lib/format';

export const metadata = {
  title: '공지사항 | 백조오브제',
  description: '백조오브제의 새로운 소식과 이벤트, 서비스 안내를 확인하세요.',
};

export default function NoticesPage() {
  return (
    <div className="bg-[#F4F2EC] min-h-dvh py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-[#202521]">공지사항</h1>
          <p className="mt-4 text-gray-500">백조오브제의 새로운 소식과 이벤트를 안내해 드립니다.</p>
        </div>

        <div className="bg-white rounded-sm shadow-sm border border-gray-100 overflow-hidden">
          <div className="hidden sm:grid sm:grid-cols-12 bg-gray-50 border-b border-gray-100 p-4 text-xs font-bold text-gray-500 text-center">
            <div>No</div>
            <div className="sm:col-span-5 text-left">제목</div>
            <div className="sm:col-span-2">글쓴이</div>
            <div className="sm:col-span-2">작성시간</div>
            <div>조회수</div>
            <div>좋아요</div>
          </div>
          
          <ul className="divide-y divide-gray-100">
            {notices.map((notice, index) => (
              <li key={notice.id}>
                <Link href={`/notices/${notice.id}`} className="block p-4 sm:p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:grid sm:grid-cols-12 items-start sm:items-center gap-2 sm:gap-0">
                    <div className="hidden text-center text-xs tabular-nums text-gray-400 sm:block">
                      {notices.length - index}
                    </div>

                    <div className="w-full truncate font-medium text-gray-900 sm:col-span-5">
                      <span className="mr-2 text-[10px] font-bold text-[#68776C]">
                        {notice.category === 'notice' ? '공지' : notice.category === 'event' ? '이벤트' : '브랜드'}
                      </span>
                      {notice.title}
                    </div>
                    <div className="hidden text-center text-xs text-gray-500 sm:col-span-2 sm:block">{notice.writer}</div>
                    <div className="text-xs text-gray-400 sm:col-span-2 sm:text-center">
                      {formatDate(notice.date)}
                    </div>
                    <div className="hidden text-center text-xs tabular-nums text-gray-400 sm:block">{notice.views}</div>
                    <div className="hidden text-center text-xs tabular-nums text-gray-400 sm:block">{notice.likes}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Pagination mock */}
        <div className="mt-10 flex justify-center gap-2">
          <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white font-medium text-gray-500 hover:bg-gray-50">1</button>
        </div>

      </div>
    </div>
  );
}
