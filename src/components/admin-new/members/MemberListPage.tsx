'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Users, UserPlus, Shield, ShieldCheck } from 'lucide-react';
import { getAdminMembers } from '@/lib/storage';
import { useMounted } from '@/lib/useMounted';
import PageHeader from '@/components/admin-new/common/PageHeader';
import SummaryStrip from '@/components/admin-new/common/SummaryStrip';
import Pagination from '@/components/admin-new/common/Pagination';
import LoadingState from '@/components/admin-new/common/LoadingState';
import ErrorState from '@/components/admin-new/common/ErrorState';
import MemberFilters from './MemberFilters';
import MemberDataTable from './MemberDataTable';
import MemberMobileCard from './MemberMobileCard';
import type { AdminMemberPage, User } from '@/types';

export default function MemberListPage() {
  const mounted = useMounted();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('전체');
  const [statusFilter, setStatusFilter] = useState('전체');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<AdminMemberPage['summary']>({ total: 0, recent: 0, pending: 0, partners: 0 });
  const requestId = useRef(0);
  const loadMembers = useCallback(async (signal?: AbortSignal) => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const res = await getAdminMembers({
        page: currentPage, pageSize: ITEMS_PER_PAGE, search: searchTerm,
        role: roleFilter === '전체' ? '' : roleFilter,
        status: statusFilter === '전체' ? '' : statusFilter,
      }, signal);
      if (signal?.aborted || id !== requestId.current) return;
      if (res.error || !res.summary || res.total === undefined || res.page === undefined) {
        throw new Error(res.error ?? 'invalid-response');
      }
      setMembers(res.users ?? []);
      setTotal(res.total);
      setSummary(res.summary);
      setCurrentPage(res.page);
      setError(null);
    } catch (err) {
      if (!signal?.aborted && id === requestId.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (!signal?.aborted && id === requestId.current) setLoading(false);
    }
  }, [currentPage, searchTerm, roleFilter, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => { void loadMembers(controller.signal); }, 200);
    return () => { clearTimeout(timer); controller.abort(); ++requestId.current; };
  }, [loadMembers]);

  const handleRetry = useCallback(() => { void loadMembers(); }, [loadMembers]);
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const paginatedMembers = members;

  const handleSearchChange = useCallback((val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  }, []);

  const handleRoleFilterChange = useCallback((val: string) => {
    setRoleFilter(val);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  }, []);

  if (!mounted) return null;

  if (loading && members.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="회원 관리" description="가입된 전체 회원 목록을 조회하고 권한을 관리합니다." />
        <LoadingState message="회원 목록을 불러오는 중입니다..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="회원 관리" description="가입된 전체 회원 목록을 조회하고 권한을 관리합니다." />
        <ErrorState
          title="데이터를 불러오지 못했습니다"
          message={error.message || '알 수 없는 오류가 발생했습니다.'}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="회원 관리" 
        description="가입된 전체 회원 목록을 조회하고 권한을 관리합니다." 
      />

      <SummaryStrip
        items={[
          { label: '전체 회원', value: summary.total, icon: Users },
          { label: '신규 가입(최근 7일)', value: summary.recent, icon: UserPlus },
          { label: '권한 승인 대기', value: summary.pending, icon: Shield, highlight: summary.pending > 0 },
          { label: '파트너/B2B 회원', value: summary.partners, icon: ShieldCheck },
        ]}
      />

      <div className="space-y-4">
        <MemberFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          roleFilter={roleFilter}
          onRoleFilterChange={handleRoleFilterChange}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
        />

        {/* PC Table View */}
        <div className="hidden md:block">
          <MemberDataTable members={paginatedMembers} isLoading={loading} />
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {paginatedMembers.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-md p-8 text-center text-gray-500 text-[14px]">
              검색 결과가 없습니다.
            </div>
          ) : (
            paginatedMembers.map((member) => <MemberMobileCard key={member.id} member={member} />)
          )}
        </div>

        {total > 0 && (
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

