import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { qnaList } from '@/data/qna';
import { formatDate } from '@/lib/format';

export default function AdminQnaPage() {
  return (
    <AdminResourcePage
      title="Q&A 관리"
      description="상품문의 내용을 확인하고 답변 작성과 처리 상태를 관리합니다."
      actionLabel="문의 등록"
      searchPlaceholder="상품명, 질문, 작성자 검색"
      filters={['전체 문의', '답변대기', '답변완료', '비밀글']}
      columns={[
        { key: 'product', label: '상품' },
        { key: 'question', label: '문의 내용' },
        { key: 'writer', label: '작성자' },
        { key: 'secret', label: '비밀글' },
        { key: 'status', label: '답변 상태' },
        { key: 'date', label: '작성일' },
      ]}
      rows={qnaList.map((qna) => ({
        id: qna.id,
        product: qna.productName,
        question: qna.question,
        writer: qna.writerName,
        secret: qna.isSecret ? '비밀' : '공개',
        status: qna.status,
        date: formatDate(qna.createdAt),
      }))}
      createFields={['상품', '문의 유형', '문의 내용', '비밀글 여부', '작성자', '답변 내용', '답변 상태']}
    />
  );
}
