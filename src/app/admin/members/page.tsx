'use client';

import { useState, useEffect } from 'react';
import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { getUsers, updateUserStatus } from '@/lib/storage';
import { getOrders } from '@/lib/storage';
import { getInsuranceApplications } from '@/lib/storage';
import { formatDate } from '@/lib/format';
import { User } from '@/types';

type MemberTab = 'user' | 'partner' | 'b2b' | 'insurance';

export default function AdminMembersPage() {
  const [mounted, setMounted] = useState(false);
  const [memberList, setMemberList] = useState<User[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [insuranceList, setInsuranceList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<MemberTab>('user');

  useEffect(() => {
    setMemberList(getUsers());
    setOrdersList(getOrders());
    setInsuranceList(getInsuranceApplications());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleApprove = (id: string) => {
    if (window.confirm('해당 회원의 가입을 승인하시겠습니까?')) {
      updateUserStatus(id, 'active');
      setMemberList(getUsers());
    }
  };

  const handleReject = (id: string) => {
    const reason = window.prompt('해당 회원의 가입을 반려하시겠습니까?\n반려 사유를 입력해주세요.');
    if (reason !== null) {
      updateUserStatus(id, 'rejected', reason);
      setMemberList(getUsers());
    }
  };

  const filteredMembers = memberList.filter(u => {
    if (activeTab === 'user') return u.role === 'user' || u.role === 'admin';
    return u.role === activeTab;
  });

  const getStatusText = (user: User) => {
    if (user.status === 'inactive') return '휴면';
    if (user.status === 'pending') return '승인대기';
    if (user.status === 'rejected') return user.rejectReason ? `반려됨 (${user.rejectReason})` : '반려됨';
    return '활성';
  };

  let rows: any[] = [];
  let columns: any[] = [];

  if (activeTab === 'user') {
    columns = [
      { key: 'name', label: '회원명' },
      { key: 'email', label: '이메일' },
      { key: 'phone', label: '연락처' },
      { key: 'pet', label: '반려동물' },
      { key: 'orders', label: '주문' },
      { key: 'insurance', label: '보험 신청' },
      { key: 'status', label: '상태' },
      { key: 'joinedAt', label: '가입일' },
    ];
    rows = filteredMembers.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      pet: `${user.petType ?? '-'} / ${user.breed ?? '-'}`,
      orders: ordersList.filter((order) => order.phone === user.phone).length,
      insurance: insuranceList.filter((application) => application.phone === user.phone).length,
      status: getStatusText(user),
      joinedAt: formatDate(user.createdAt),
      _rawStatus: user.status,
    }));
  } else if (activeTab === 'b2b') {
    columns = [
      { key: 'companyName', label: '회사명' },
      { key: 'businessNumber', label: '사업자번호' },
      { key: 'name', label: '담당자명' },
      { key: 'email', label: '이메일' },
      { key: 'phone', label: '연락처' },
      { key: 'status', label: '상태' },
      { key: 'joinedAt', label: '가입일' },
    ];
    rows = filteredMembers.map(user => ({
      id: user.id,
      companyName: user.companyName ?? '-',
      businessNumber: user.businessNumber ?? '-',
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: getStatusText(user),
      joinedAt: formatDate(user.createdAt),
      _rawStatus: user.status,
      _attachedFiles: user.attachedFiles,
      _detailData: user.b2bData,
    }));
  } else if (activeTab === 'partner') {
    columns = [
      { key: 'companyName', label: '브랜드/법인명' },
      { key: 'businessNumber', label: '사업자번호' },
      { key: 'name', label: '담당자명' },
      { key: 'email', label: '이메일' },
      { key: 'phone', label: '연락처' },
      { key: 'status', label: '상태' },
      { key: 'joinedAt', label: '가입일' },
    ];
    rows = filteredMembers.map(user => ({
      id: user.id,
      companyName: user.companyName ?? '-',
      businessNumber: user.businessNumber ?? '-',
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: getStatusText(user),
      joinedAt: formatDate(user.createdAt),
      _rawStatus: user.status,
      _attachedFiles: user.attachedFiles,
      _detailData: user.partnerData,
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
    rows = filteredMembers.map(user => ({
      id: user.id,
      insuranceCompany: user.insuranceCompany ?? '-',
      insuranceRegNumber: user.insuranceRegNumber ?? '-',
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: getStatusText(user),
      joinedAt: formatDate(user.createdAt),
      _rawStatus: user.status,
      _attachedFiles: user.attachedFiles,
      _detailData: user.insuranceData,
      _rejectReason: user.rejectReason,
    }));
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-[#D1D0C8] mb-6">
        {[
          { id: 'user', label: '일반 회원' },
          { id: 'partner', label: '입점 업체' },
          { id: 'b2b', label: 'B2B 업체' },
          { id: 'insurance', label: '보험사' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as MemberTab)}
            className={`px-6 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-[#2F3B34] text-[#2F3B34]'
                : 'text-[#8B928C] hover:text-[#59615B]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AdminResourcePage
        title={activeTab === 'user' ? '일반 회원 관리' : activeTab === 'partner' ? '입점 업체 관리' : activeTab === 'b2b' ? 'B2B 업체 관리' : '보험사 관리'}
        description={activeTab === 'user' ? '일반 회원의 주문, 보험 분석 등의 활동을 관리합니다.' : '승인 대기 중인 업체를 확인하고 승인/반려 처리를 진행하세요.'}
        actionLabel={activeTab === 'user' ? '회원 등록' : '업체 등록'}
        searchPlaceholder={activeTab === 'user' ? "이름, 이메일, 연락처 검색" : "회사명, 담당자명 검색"}
        filters={activeTab === 'user' ? ['전체 회원', '활성', '휴면'] : ['전체 업체', '승인대기', '활성', '반려됨']}
        columns={columns}
        rows={rows}
        customActions={(row) => {
          const isPending = row._rawStatus === 'pending';
          return (
            <span className="mr-4 inline-flex items-center gap-2">
              {isPending && (
                <>
                  <button onClick={() => handleApprove(row.id as string)} className="px-2 py-1 text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100">승인</button>
                  <button onClick={() => handleReject(row.id as string)} className="px-2 py-1 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100">반려</button>
                </>
              )}
            </span>
          );
        }}
        renderExpandedRow={(row) => {
          if (activeTab === 'user') return null;
          
          let hasInfo = false;
          const details: Record<string, string> = {};
          if (row._detailData) {
            for (const [key, val] of Object.entries(row._detailData)) {
              if (key !== 'password' && key !== 'passwordConfirm' && key !== 'attachedFiles' && val !== '' && val !== false) {
                details[key] = String(val);
                hasInfo = true;
              }
            }
          }
          
          const files = Array.isArray(row._attachedFiles) ? row._attachedFiles as string[] : [];
          if (files.length > 0) hasInfo = true;
          
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
                    {files.map((f, i) => (
                      <li key={i} className="flex items-center text-sm">
                        <span className="text-blue-600 underline cursor-pointer">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
