'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import type { User } from '@/types';

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

  const loadMembers = useCallback(async () => {
    try {
      const res = await getAdminMembers();
      if (res.error) throw new Error(res.error);
      setMembers(res.users || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadMembers();
    })();
  }, [loadMembers]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    loadMembers();
  }, [loadMembers]);

  const filteredMembers = useMemo(() => {
    let result = [...members].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      // wave-4: 주문 검색과 동일한 클래스의 크래시 방지 — 타입은 required지만 레거시/기형
      // 행에서는 undefined일 수 있어 전부 nullish 가드로 감싼다.
      result = result.filter(
        (m) =>
          (m.name ?? '').toLowerCase().includes(term) ||
          (m.email ?? '').toLowerCase().includes(term) ||
          (m.phone ?? '').includes(term) ||
          (m.companyName ?? '').toLowerCase().includes(term)
      );
    }

    if (roleFilter !== '전체') {
      result = result.filter((m) => m.role === roleFilter);
    }
    
    if (statusFilter !== '전체') {
      result = result.filter((m) => m.status === statusFilter);
    }

    return result;
  }, [members, searchTerm, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / ITEMS_PER_PAGE));
  const paginatedMembers = useMemo(() => {
    return filteredMembers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredMembers, currentPage, ITEMS_PER_PAGE]);

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

  const totalCount = members.length;
  const newMemberCount = members.filter(m => {
    const today = new Date();
    const joinedDate = new Date(m.createdAt);
    return joinedDate.getTime() > today.getTime() - 7 * 24 * 60 * 60 * 1000;
  }).length;
  const pendingCount = members.filter((m) => m.status === 'pending').length;
  const partnerCount = members.filter((m) => m.role === 'partner' || m.role === 'b2b').length;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="회원 관리" 
        description="가입된 전체 회원 목록을 조회하고 권한을 관리합니다." 
      />

      <SummaryStrip
        items={[
          { label: '전체 회원', value: totalCount, icon: Users },
          { label: '신규 가입(최근 7일)', value: newMemberCount, icon: UserPlus },
          { label: '권한 승인 대기', value: pendingCount, icon: Shield, highlight: pendingCount > 0 },
          { label: '파트너/B2B 회원', value: partnerCount, icon: ShieldCheck },
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

        {filteredMembers.length > 0 && (
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
