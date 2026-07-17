import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { notices } from '@/data/notices';
import { formatDate } from '@/lib/format';

export default function AdminNoticesPage() {
  return (
    <AdminResourcePage
      title="공지사항 관리"
      description="공지, 이벤트, 브랜드 소식을 등록하고 노출 상태를 관리합니다."
      actionLabel="공지 등록"
      searchPlaceholder="제목, 본문, 작성자 검색"
      filters={['전체 유형', '공지', '이벤트', '브랜드 소식', '숨김']}
      columns={[
        { key: 'type', label: '유형' },
        { key: 'title', label: '제목' },
        { key: 'writer', label: '작성자' },
        { key: 'views', label: '조회수' },
        { key: 'likes', label: '좋아요' },
        { key: 'status', label: '노출 상태' },
        { key: 'date', label: '작성일' },
      ]}
      rows={notices.map((notice) => ({
        id: notice.id,
        type: notice.category === 'event' ? '이벤트' : notice.category === 'brand' ? '브랜드 소식' : '공지',
        title: notice.title,
        writer: notice.writer,
        views: notice.views,
        likes: notice.likes,
        status: '노출중',
        date: formatDate(notice.date),
      }))}
      readOnly
      createFields={['유형', '제목', '본문', '작성자', '대표 이미지', '노출 상태', '게시일']}
    />
  );
}
