'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { getAdminMembers, updateUserStatus } from '@/lib/storage';
import { formatDate } from '@/lib/format';
import type { User } from '@/types';

const PROVIDER_LABELS: Record<NonNullable<User['provider']>, string> = {
  kakao: '카카오',
  naver: '네이버',
  email: '이메일',
};

type MemberTab = 'user' | 'partner' | 'b2b' | 'insurance';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; showLoginLink: boolean }
  | { status: 'success'; users: User[] };

const TAB_LABELS: Record<MemberTab, string> = {
  user: '일반 회원',
  partner: '입점 업체',
  b2b: 'B2B 업체',
  insurance: '보험사',
};

function getStatusText(user: User) {
  if (user.status === 'inactive') return '휴면';
  if (user.status === 'pending') return '승인대기';
  if (user.status === 'rejected') return user.rejectReason ? `반려됨 (${user.rejectReason})` : '반려됨';
  return '활성';
}

export default function AdminMembersPage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [activeTab, setActiveTab] = useState<MemberTab>('user');

  const loadMembers = useCallback(() => {
    return getAdminMembers().then((result) => {
      if (result.error === 'unauthorized' || result.error === 'forbidden') {
        setState({ status: 'error', message: '관리자 로그인이 필요합니다.', showLoginLink: true });
        return;
      }
      if (result.error) {
        setState({ status: 'error', message: '목록을 불러오지 못했습니다.', showLoginLink: false });
        return;
      }
      setState({ status: 'success', users: result.users ?? [] });
    });
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleApprove = async (id: string) => {
    if (!window.confirm('해당 회원의 가입을 승인하시겠습니까?')) return;
    const result = await updateUserStatus(id, 'active');
    if (result.error) {
      alert('승인 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    await loadMembers();
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('해당 회원의 가입을 반려하시겠습니까?\n반려 사유를 입력해주세요.');
    if (reason === null) return;
    const result = await updateUserStatus(id, 'rejected', reason);
    if (result.error) {
      alert('반려 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    await loadMembers();
  };

  if (state.status === 'loading') {
    return <p className="p-12 text-center text-sm text-[#7B827C]">회원 목록 불러오는 중…</p>;
  }

  if (state.status === 'error') {
    return (
      <div className="p-12 text-center text-sm text-[#7B827C]">
        <p>{state.message}</p>
        {state.showLoginLink && (
          <Link href="/login" className="mt-3 inline-block font-semibold text-[#2F3B34] hover:underline">
            로그인하러 가기
          </Link>
        )}
      </div>
    );
  }

  const filteredMembers = state.users.filter((user) => {
    if (activeTab === 'user') return user.role === 'user' || user.role === 'admin';
    return user.role === activeTab;
  });

  let rows: Array<Record<string, string | number>> = [];
  let columns: Array<{ key: string; label: string }> = [];

  if (activeTab === 'user') {
    columns = [
      { key: 'name', label: '회원명' },
      { key: 'email', label: '이메일' },
      { key: 'phone', label: '연락처' },
      { key: 'provider', label: '구분' },
      { key: 'status', label: '상태' },
      { key: 'joinedAt', label: '가입일' },
    ];
    rows = filteredMembers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      provider: PROVIDER_LABELS[user.provider ?? 'email'],
      status: getStatusText(user),
      joinedAt: formatDate(user.createdAt),
      _rawStatus: user.status ?? 'active',
    }));
  } else if (activeTab === 'insurance') {
    columns = [
      { key: 'insuranceCompany', label: '소속' },
      { key: 'insuranceRegNumber', label: '등록번호' },
      { key: 'name', label: '이름' },
      { key: 'email', label: '이메일' },
      { key: 'phone', label: '연락처' },
      { key: 'status', label: '상태' },
      { key: 'joinedAt', label: '신청일' },
    ];
    rows = filteredMembers.map((user) => ({
      id: user.id,
      insuranceCompany: (user.signupData?.insuranceCompany as string | undefined) ?? '-',
      insuranceRegNumber: (user.signupData?.insuranceRegNumber as string | undefined) ?? '-',
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: getStatusText(user),
      joinedAt: formatDate(user.createdAt),
      _rawStatus: user.status ?? 'pending',
      _signupData: JSON.stringify(user.signupData ?? {}),
    }));
  } else {
    // b2b / partner
    columns = [
      { key: 'companyName', label: activeTab === 'b2b' ? '회사명' : '브랜드/법인명' },
      { key: 'businessNumber', label: '사업자번호' },
      { key: 'name', label: '담당자명' },
      { key: 'email', label: '이메일' },
      { key: 'phone', label: '연락처' },
      { key: 'status', label: '상태' },
      { key: 'joinedAt', label: '가입일' },
    ];
    rows = filteredMembers.map((user) => ({
      id: user.id,
      companyName: user.companyName ?? '-',
      businessNumber: user.businessNumber ?? '-',
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: getStatusText(user),
      joinedAt: formatDate(user.createdAt),
      _rawStatus: user.status ?? 'pending',
      _signupData: JSON.stringify(user.signupData ?? {}),
    }));
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-[#D1D0C8] mb-6">
        {(Object.keys(TAB_LABELS) as MemberTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-[#2F3B34] text-[#2F3B34]'
                : 'text-[#8B928C] hover:text-[#59615B]'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <AdminResourcePage
        key={activeTab}
        title={`${TAB_LABELS[activeTab]} 관리`}
        description={
          activeTab === 'user'
            ? '회원 상태와 가입 경로, 등급을 한 화면에서 확인합니다.'
            : '승인 대기 중인 업체를 확인하고 승인/반려 처리를 진행하세요.'
        }
        searchPlaceholder={activeTab === 'user' ? '이름, 이메일, 연락처 검색' : '회사명, 담당자명 검색'}
        filters={activeTab === 'user' ? ['전체 회원', '활성', '휴면'] : ['전체 업체', '승인대기', '활성', '반려됨']}
        columns={columns}
        rows={rows}
        customActions={(row) => {
          const isPending = row._rawStatus === 'pending';
          if (!isPending) return null;
          return (
            <span className="mr-4 inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleApprove(row.id as string)}
                className="px-2 py-1 text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100"
              >
                승인
              </button>
              <button
                type="button"
                onClick={() => handleReject(row.id as string)}
                className="px-2 py-1 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100"
              >
                반려
              </button>
            </span>
          );
        }}
        renderExpandedRow={
          activeTab === 'user'
            ? undefined
            : (row) => {
                let signupData: Record<string, unknown> = {};
                try {
                  signupData = JSON.parse((row._signupData as string) ?? '{}');
                } catch {
                  signupData = {};
                }

                const details: Record<string, string> = {};
                let files: Array<string | { category: string; name: string; path: string }> = [];
                for (const [key, val] of Object.entries(signupData)) {
                  if (key === 'password' || key === 'passwordConfirm') continue;
                  if (key === 'attachedFiles') {
                    files = Array.isArray(val)
                      ? (val as Array<string | { category: string; name: string; path: string }>)
                      : [];
                    continue;
                  }
                  if (val === '' || val === false || val == null) continue;
                  details[key] = String(val);
                }

                const hasInfo = Object.keys(details).length > 0 || files.length > 0;
                if (!hasInfo) {
                  return <div className="text-sm text-[#7B827C] py-4 text-center">저장된 상세 데이터가 없습니다.</div>;
                }

                return (
                  <div className="bg-white p-6 border border-[#E1DFD8] rounded shadow-sm">
                    <h3 className="text-sm font-bold text-[#202521] mb-4">신청 상세 내용</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                      {Object.entries(details).map(([k, v]) => (
                        <div key={k} className="flex flex-col border-b border-[#F0EEE8] pb-2">
                          <span className="text-xs text-[#7B827C] mb-1">{k}</span>
                          <span className="text-sm text-[#202521] whitespace-pre-wrap">{v}</span>
                        </div>
                      ))}
                    </div>

                    {files.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-[#E1DFD8]">
                        <h4 className="text-xs font-bold text-[#59615B] mb-3">첨부 파일</h4>
                        <ul className="space-y-2">
                          {files.map((f, i) => {
                            if (typeof f === 'string') {
                              return (
                                <li key={i} className="flex items-center text-sm text-[#202521]">
                                  {f}
                                </li>
                              );
                            }
                            return (
                              <li key={i} className="flex items-center text-sm">
                                <a
                                  href={`/api/admin/members/file?path=${encodeURIComponent(f.path)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 underline hover:text-blue-800"
                                >
                                  {f.category} — {f.name}
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              }
        }
      />
    </div>
  );
}
