'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Clock } from 'lucide-react';
import { getInsuranceApplications } from '@/lib/storage';
import { useMounted } from '@/lib/useMounted';
import PageHeader from '@/components/admin-new/common/PageHeader';
import SummaryStrip from '@/components/admin-new/common/SummaryStrip';
import Pagination from '@/components/admin-new/common/Pagination';
import LoadingState from '@/components/admin-new/common/LoadingState';
import ErrorState from '@/components/admin-new/common/ErrorState';
import InsuranceFilters from './InsuranceFilters';
import InsuranceDataTable from './InsuranceDataTable';
import InsuranceMobileCard from './InsuranceMobileCard';
import type { InsuranceApplication } from '@/types';

export default function InsuranceListPage() {
  const mounted = useMounted();
  const [applications, setApplications] = useState<InsuranceApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [contactedFilter, setContactedFilter] = useState('전체');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const loadApplications = useCallback(async () => {
    try {
      const list = await getInsuranceApplications();
      setApplications(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadApplications();
    })();
  }, [loadApplications]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    loadApplications();
  }, [loadApplications]);

  const filteredApplications = useMemo(() => {
    let result = [...applications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(term) ||
          a.phone.includes(term) ||
          a.petName.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== '전체') {
      result = result.filter((a) => a.status === statusFilter);
    }
    
    if (contactedFilter !== '전체') {
      const isContacted = contactedFilter === 'true';
      result = result.filter((a) => !!a.contacted === isContacted);
    }

    return result;
  }, [applications, searchTerm, statusFilter, contactedFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / ITEMS_PER_PAGE));
  const paginatedApplications = useMemo(() => {
    return filteredApplications.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredApplications, currentPage, ITEMS_PER_PAGE]);

  const handleSearchChange = useCallback((val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  }, []);

  const handleContactedFilterChange = useCallback((val: string) => {
    setContactedFilter(val);
    setCurrentPage(1);
  }, []);

  if (!mounted) return null;

  if (loading && applications.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="펫보험 상담 관리" description="반려동물 보험 상담 신청 내역을 관리합니다." />
        <LoadingState message="상담 신청 목록을 불러오는 중입니다..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="펫보험 상담 관리" description="반려동물 보험 상담 신청 내역을 관리합니다." />
        <ErrorState
          title="데이터를 불러오지 못했습니다"
          message={error.message || '알 수 없는 오류가 발생했습니다.'}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  const totalCount = applications.length;
  const newCount = applications.filter((a) => a.status === '신청완료' || a.status === '접수').length;
  const inProgressCount = applications.filter((a) => a.status === '상담중' || a.status === '분석중').length;
  const uncontactedCount = applications.filter((a) => !a.contacted).length;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="펫보험 상담 관리" 
        description="반려동물 보험 상담 신청 내역을 관리하고 분석 및 상담 상태를 추적합니다." 
      />

      <SummaryStrip
        items={[
          { label: '전체 상담', value: totalCount, icon: Shield },
          { label: '신규 접수', value: newCount, icon: ShieldAlert, highlight: newCount > 0 },
          { label: '상담/분석 중', value: inProgressCount, icon: Clock },
          { label: '미연락 건', value: uncontactedCount, icon: ShieldCheck, highlight: uncontactedCount > 0 },
        ]}
      />

      <div className="space-y-4">
        <InsuranceFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          contactedFilter={contactedFilter}
          onContactedFilterChange={handleContactedFilterChange}
        />

        {/* PC Table View */}
        <div className="hidden md:block">
          <InsuranceDataTable applications={paginatedApplications} isLoading={loading} />
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {paginatedApplications.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-md p-8 text-center text-gray-500 text-[14px]">
              검색 결과가 없습니다.
            </div>
          ) : (
            paginatedApplications.map((app) => <InsuranceMobileCard key={app.id} application={app} />)
          )}
        </div>

        {filteredApplications.length > 0 && (
          <div className="pt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
