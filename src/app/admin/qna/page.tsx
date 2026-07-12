'use client';

import { useEffect, useState } from 'react';
import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { getQnaConfig, saveQnaConfig } from '@/lib/storage';
import { defaultQnaConfig } from '@/lib/qna/config';
import { formatDate } from '@/lib/format';
import type { QnA } from '@/types';

export default function AdminQnaPage() {
  // draft = 현재 편집 중인 Q&A 목록. 초기값은 기본 config, 마운트 후 콘센트로 실제 config 를 불러온다.
  const [items, setItems] = useState<QnA[]>(defaultQnaConfig.items);

  useEffect(() => {
    let cancelled = false;
    getQnaConfig().then((config) => {
      if (cancelled) return;
      setItems(config.items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = (id: string | number) => {
    setItems((prev) => prev.filter((qna) => qna.id !== id));
  };

  const handleSave = () => saveQnaConfig({ items });

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
      rows={items.map((qna) => ({
        id: qna.id,
        product: qna.productName,
        question: qna.question,
        writer: qna.writerName,
        secret: qna.isSecret ? '비밀' : '공개',
        status: qna.status,
        date: formatDate(qna.createdAt),
      }))}
      createFields={['상품', '문의 유형', '문의 내용', '비밀글 여부', '작성자', '답변 내용', '답변 상태']}
      onDeleteRow={handleDelete}
      onSave={handleSave}
    />
  );
}
