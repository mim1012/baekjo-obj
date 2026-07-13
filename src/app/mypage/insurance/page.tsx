'use client';

import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { getMyInsuranceApplications } from '@/lib/storage';
import { formatDate } from '@/lib/format';
import type { InsuranceApplication } from '@/types';
import EmptyState from '@/components/common/EmptyState';

export default function MypageInsurancePage() {
  const [insuranceApps, setInsuranceApps] = useState<InsuranceApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMyInsuranceApplications().then((list) => {
      if (cancelled) return;
      const sorted = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setInsuranceApps(sorted);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-[#FFFEFB] p-6 md:p-8 rounded-sm shadow-sm border border-[#E2DACD]">
      <h2 className="text-lg font-bold text-[#17251F] flex items-center mb-6">
        <FileText className="mr-2 h-5 w-5 text-[#16382D]" /> 보험 분석 내역
      </h2>
      
      {loading ? (
        <div className="py-10 text-center text-[#6F756F] bg-[#F8F6F0] rounded-sm">보험 분석 내역을 불러오는 중…</div>
      ) : insuranceApps.length === 0 ? (
        <EmptyState 
          title="보험 분석 내역이 없습니다."
          description="맞춤형 보험 분석을 통해 꼭 필요한 보장을 확인해보세요."
          actionLabel="보험 분석 신청하기"
          actionHref="/insurance"
          compact
        />
      ) : (
        <div className="space-y-4">
          {insuranceApps.map(app => (
            <div key={app.id} className="border border-[#E2DACD] rounded-sm p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="text-xs text-[#6F756F] mb-1">{formatDate(app.createdAt)} 신청</div>
                <div className="font-bold text-[#17251F]">{app.petName} ({app.petBreed}, {app.petAge}살)</div>
                <div className="text-sm text-[#6F756F] mt-1 line-clamp-1">{app.concerns || '특별한 건강 고민 없음'}</div>
              </div>
              <div>
                <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-[#F2EEE6] text-[#16382D]">
                  {app.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
