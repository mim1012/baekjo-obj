'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User as UserIcon, Building2, FileText, CheckCircle2 } from 'lucide-react';
import { getAdminMembers } from '@/lib/storage';
import { useMounted } from '@/lib/useMounted';
import { formatDate } from '@/lib/format';
import type { User } from '@/types';
import PageHeader from '@/components/admin-new/common/PageHeader';
import LoadingState from '@/components/admin-new/common/LoadingState';
import ErrorState from '@/components/admin-new/common/ErrorState';
import FormSection from '@/components/admin-new/common/FormSection';
import MemberRoleStatusPanel from './MemberRoleStatusPanel';
import StatusBadge from '@/components/admin-new/common/StatusBadge';
import MemberSignupDataSummary from './MemberSignupDataSummary';

interface MemberDetailPageProps {
  id: string;
}

export default function MemberDetailPage({ id }: MemberDetailPageProps) {
  const router = useRouter();
  const mounted = useMounted();
  const [member, setMember] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMember = useCallback(async () => {
    try {
      const res = await getAdminMembers();
      if (res.error) throw new Error(res.error);
      const found = res.users?.find((u) => u.id === id);
      if (!found) throw new Error('회원 정보를 찾을 수 없습니다.');
      setMember(found);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      await loadMember();
    })();
  }, [loadMember]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    loadMember();
  }, [loadMember]);

  if (!mounted) return null;

  if (loading && !member) {
    return <LoadingState message="회원 상세 정보를 불러오는 중입니다..." />;
  }

  if (error || !member) {
    return (
      <ErrorState
        title="회원을 불러오지 못했습니다"
        message={error?.message || '회원 정보가 존재하지 않습니다.'}
        onRetry={handleRetry}
      />
    );
  }

  const roleLabels: Record<string, string> = {
    user: '일반 회원',
    admin: '최고 관리자',
    b2b: 'B2B/도매',
    insurance: '보험/심사',
    partner: '파트너/입점',
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active': return <StatusBadge status="success" label="활성 (승인완료)" />;
      case 'pending': return <StatusBadge status="warning" label="승인 대기" />;
      case 'inactive': return <StatusBadge status="neutral" label="비활성 (정지)" />;
      case 'rejected': return <StatusBadge status="error" label="반려" />;
      default: return <StatusBadge status="success" label="활성" />;
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => router.push('/admin/members')}
          className="p-2 -ml-2 text-gray-500 hover:text-gray-900 transition-colors"
          title="목록으로 돌아가기"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader 
          title={`회원 상세: ${member.name}`}
          description={`가입일: ${formatDate(member.createdAt)}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <FormSection
            title={<div className="flex items-center gap-2"><UserIcon className="w-5 h-5" /> 기본 정보</div>}
            description="회원의 가입 기본 정보입니다."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-[14px]">
              <div className="border-b border-gray-100 pb-3">
                <span className="block text-gray-500 mb-1">이름</span>
                <span className="font-medium text-[#17201B]">{member.name}</span>
              </div>
              <div className="border-b border-gray-100 pb-3">
                <span className="block text-gray-500 mb-1">연락처</span>
                <span className="font-medium text-[#17201B]">{member.phone}</span>
              </div>
              <div className="border-b border-gray-100 pb-3">
                <span className="block text-gray-500 mb-1">이메일 (ID)</span>
                <span className="font-medium text-[#17201B]">{member.email}</span>
                {member.emailVerified && (
                  <span className="ml-2 inline-flex items-center text-xs text-[#2F7A4F] font-medium">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> 인증됨
                  </span>
                )}
              </div>
              <div className="border-b border-gray-100 pb-3">
                <span className="block text-gray-500 mb-1">가입 수단</span>
                <span className="font-medium text-[#17201B] uppercase">{member.provider || 'email'}</span>
              </div>
            </div>
          </FormSection>

          {(member.role === 'b2b' || member.role === 'partner') && (
            <FormSection
              title={<div className="flex items-center gap-2"><Building2 className="w-5 h-5" /> 파트너/B2B 정보</div>}
              description="사업자 및 파트너 신청 정보입니다."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-[14px]">
                <div className="border-b border-gray-100 pb-3">
                  <span className="block text-gray-500 mb-1">회사/브랜드명</span>
                  <span className="font-medium text-[#17201B]">{member.companyName || '-'}</span>
                </div>
                <div className="border-b border-gray-100 pb-3">
                  <span className="block text-gray-500 mb-1">사업자등록번호</span>
                  <span className="font-medium text-[#17201B]">{member.businessNumber || '-'}</span>
                </div>
              </div>

              {member.signupData && Object.keys(member.signupData).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-[13px] font-medium text-gray-500 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> 제출된 서류 및 추가 정보
                  </h4>
                  <div className="bg-gray-50 rounded-md p-4 text-[13px]">
                    <MemberSignupDataSummary data={member.signupData} />
                  </div>
                </div>
              )}
            </FormSection>
          )}

          {member.role === 'user' && (member.petType || member.breed || member.mainConcern) && (
            <FormSection
              title={<div className="flex items-center gap-2"><UserIcon className="w-5 h-5" /> 반려동물 정보</div>}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-8 text-[14px]">
                <div className="border-b border-gray-100 pb-3">
                  <span className="block text-gray-500 mb-1">동물 종류</span>
                  <span className="font-medium text-[#17201B]">{member.petType || '-'}</span>
                </div>
                <div className="border-b border-gray-100 pb-3">
                  <span className="block text-gray-500 mb-1">품종</span>
                  <span className="font-medium text-[#17201B]">{member.breed || '-'}</span>
                </div>
                <div className="border-b border-gray-100 pb-3">
                  <span className="block text-gray-500 mb-1">주요 고민</span>
                  <span className="font-medium text-[#17201B]">{member.mainConcern || '-'}</span>
                </div>
              </div>
            </FormSection>
          )}
        </div>

        <div className="space-y-6">
          <FormSection
            title="현재 권한 및 상태"
          >
            <div className="space-y-3 text-[14px]">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-500">계정 권한</span>
                <span className="font-medium text-[#17201B]">{roleLabels[member.role] || member.role}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-500">현재 상태</span>
                {getStatusBadge(member.status)}
              </div>
              
              {member.status === 'rejected' && member.rejectReason && (
                <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-md text-xs border border-red-100">
                  <div className="font-semibold mb-1">반려 사유:</div>
                  {member.rejectReason}
                </div>
              )}
            </div>
          </FormSection>

          <MemberRoleStatusPanel member={member} onUpdate={loadMember} />
        </div>
      </div>
    </div>
  );
}
