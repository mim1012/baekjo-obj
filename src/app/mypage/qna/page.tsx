'use client';

import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { getQnaConfig, getCurrentUser } from '@/lib/storage';
import type { QnA } from '@/types';
import EmptyState from '@/components/common/EmptyState';
import { useMounted } from '@/lib/useMounted';

export default function MypageQnaPage() {
  const mounted = useMounted();
  const [qnaItems, setQnaItems] = useState<QnA[]>([]);
  
  useEffect(() => {
    let cancelled = false;
    getQnaConfig().then((config) => {
      if (cancelled) return;
      setQnaItems(config.items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mounted) return null;
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  const myQnaItems = qnaItems.filter((qna) => qna.writerName === currentUser.name);

  return (
    <div className="bg-[#FFFEFB] p-6 md:p-8 rounded-sm shadow-sm border border-[#E2DACD]">
      <h2 className="text-lg font-bold text-[#17251F] flex items-center mb-6">
        <MessageCircle className="mr-2 h-5 w-5 text-[#16382D]" /> 상품문의 관리
      </h2>
      
      {myQnaItems.length === 0 ? (
        <EmptyState 
          title="작성한 상품문의가 없습니다."
          description="궁금한 점이 있다면 언제든 문의해 주세요."
          actionLabel="쇼핑 계속하기"
          actionHref="/shop"
          compact
        />
      ) : (
        <div className="divide-y divide-[#E2DACD] border-t border-[#E2DACD]">
          {myQnaItems.map((qna) => (
            <div key={qna.id} className="flex items-center justify-between gap-5 py-4 text-sm">
              <div>
                <p className="text-[#17251F] font-medium">{qna.question}</p>
                <p className="mt-1 text-xs text-[#6F756F]">{qna.productName}</p>
              </div>
              <span className="shrink-0 border border-[#E2DACD] bg-[#F8F6F0] px-3 py-1 text-xs font-semibold text-[#17251F]">
                {qna.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
