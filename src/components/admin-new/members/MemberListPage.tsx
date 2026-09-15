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
  // 전체 페이지 LoadingState는 "최초 1회 로드"에만 쓴다. 이후에는 검색/필터/페이지 변경마다
  // loadMembers()가 setLoading(true)를 다시 호출해도 MemberFilters(검색 입력창)를 언마운트하면
  // 안 되므로, 첫 응답(성공/실패 불문) 이후에는 true로 굳혀 다시 false로 돌리지 않는다.
  // 이후의 로딩 표시는 MemberDataTable의 isLoading prop(표 내부 스피너)만 담당한다.
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('전체');
  const [statusFilter, setStatusFilter] = useState('전체');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<AdminMemberPage['summary']>({ total: 0, recent: 0, pending: 0, partners: 0 });

  // 검색/필터/페이지가 바뀔 때마다 새 요청이 나가는데, 응답이 요청 순서대로 돌아오지 않을 수 있다
  // (느린 이전 요청이 나중에 도착) — requestId로 "가장 마지막에 보낸 요청"만 상태에 반영한다.
  const requestId = useRef(0);
  const loadMembers = useCallback(async (signal?: AbortSignal) => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const res = await getAdminMembers(
        {
          page: currentPage,
          pageSize: ITEMS_PER_PAGE,
          search: searchTerm,
          role: roleFilter === '전체' ? '' : roleFilter,
          status: statusFilter === '전체' ? '' : statusFilter,
        },
        signal,
      );
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
      if (!signal?.aborted && id === requestId.current) {
        setLoading(false);
        setInitialLoadDone(true);
      }
    }
  }, [currentPage, searchTerm, roleFilter, statusFilter]);

  // 검색어를 입력할 때마다 바로 쏘지 않고 200ms 디바운스한다 — 타이핑 중 매 키입력마다 서버
  // 요청이 나가는 것을 막는다. AbortController로 디바운스 창이 끝나기 전 다음 입력이 오면
  // 이전 요청을 취소한다.
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

  if (!initialLoadDone && loading && members.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="회원 관리" description="가입된 전체 회원 목록을 조회하고 권한을 관리합니다." />
        <LoadingState message="회원 목록을 불러오는 중입니다..." />
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

        {/* 최초 로드를 포함해 조회가 실패하면 MemberFilters는 유지하고 표+Pagination 자리를
            인라인 ErrorState로 대체한다(§M2: 전체 페이지 언마운트 금지). Pagination도 이 분기
            아래에 있어 에러 중에는 함께 숨는다. */}
        {error ? (
          <ErrorState
            title="목록을 새로 불러오지 못했습니다"
            message={error.message || '알 수 없는 오류가 발생했습니다.'}
            onRetry={handleRetry}
          />
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
