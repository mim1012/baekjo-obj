'use client';

import { useState } from 'react';
import { InsuranceApplication } from '@/types';
import { formatDate } from '@/lib/format';
import Pagination from './Pagination';
import EmptyState from '@/components/common/EmptyState';
import { Shield } from 'lucide-react';

interface InsuranceSectionProps {
  applications: InsuranceApplication[];
}

const ITEMS_PER_PAGE = 20;

export default function InsuranceSection({ applications }: InsuranceSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // 최신순 정렬
  const sortedApplications = [...applications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalItems = sortedApplications.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedApplications = sortedApplications.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (totalItems === 0) {
    return (
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#18231F]">보험 분석 내역</h2>
        </div>
        <EmptyState
          icon={<Shield className="h-8 w-8 text-[#68716C]" />}
          title="신청하신 내역이 없어요."
          description="전문가의 꼼꼼한 보험 분석을 받아보세요."
          actionLabel="보험 분석 신청하기"
          actionHref="/insurance"
        />
      </section>
    );
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case '접수':
      case '신청완료':
        return 'bg-[#F2EEE5] text-[#68716C]';
      case '분석중':
      case '상담중':
        return 'bg-[#18231F] text-white';
      case '분석완료':
      case '완료':
        return 'bg-[#FFFDF9] border border-[#DED8CC] text-[#B99562]';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#18231F]">보험 분석 내역</h2>
        <p className="mt-2 text-sm text-[#68716C]">신청하신 보험 분석 진행 상황을 확인할 수 있습니다.</p>
      </div>

      <div className="flex flex-col gap-4">
        {paginatedApplications.map((app) => (
          <div key={app.id} className="mypage-card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-6">
            <div className="flex flex-col gap-1">
              <span className="font-editorial text-sm font-semibold text-[#18231F]">
                {formatDate(app.createdAt)}
              </span>
              <h3 className="text-base font-bold text-[#18231F]">
                {app.petName} <span className="font-normal text-[#68716C] ml-1 text-sm">({app.petType})</span>
              </h3>
              {app.coverageNeeds && app.coverageNeeds.length > 0 && (
                <p className="mt-1 text-sm text-[#68716C] line-clamp-1">
                  관심 보장: {app.coverageNeeds.join(', ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${getStatusStyle(app.status)}`}>
                {app.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />
    </section>
  );
}
