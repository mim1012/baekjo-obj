'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User as UserIcon, Shield, HeartPulse, CheckCircle2 } from 'lucide-react';
import { getInsuranceApplications } from '@/lib/storage';
import { useMounted } from '@/lib/useMounted';
import { formatDate } from '@/lib/format';
import type { InsuranceApplication } from '@/types';
import PageHeader from '@/components/admin-new/common/PageHeader';
import LoadingState from '@/components/admin-new/common/LoadingState';
import ErrorState from '@/components/admin-new/common/ErrorState';
import FormSection from '@/components/admin-new/common/FormSection';
import InsuranceStatusPanel from './InsuranceStatusPanel';

interface InsuranceDetailPageProps {
  id: string;
}

export default function InsuranceDetailPage({ id }: InsuranceDetailPageProps) {
  const router = useRouter();
  const mounted = useMounted();
  const [application, setApplication] = useState<InsuranceApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadApplication = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getInsuranceApplications();
      const found = list.find((a) => a.id === id);
      if (!found) throw new Error('상담 신청 정보를 찾을 수 없습니다.');
      setApplication(found);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => {
      loadApplication();
    });
  }, [loadApplication]);

  if (!mounted) return null;

  if (loading && !application) {
    return <LoadingState message="상담 상세 정보를 불러오는 중입니다..." />;
  }

  if (error || !application) {
    return (
      <ErrorState
        title="상담 정보를 불러오지 못했습니다"
        message={error?.message || '상담 정보가 존재하지 않습니다.'}
        onRetry={loadApplication}
      />
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => router.push('/admin/insurance')}
          className="p-2 -ml-2 text-gray-500 hover:text-gray-900 transition-colors"
          title="목록으로 돌아가기"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader 
          title="펫보험 상담 상세"
          description={`신청일: ${formatDate(application.createdAt)}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <FormSection
            title={<div className="flex items-center gap-2"><UserIcon className="w-5 h-5" /> 보호자(신청자) 정보</div>}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-[14px]">
              <div className="border-b border-gray-100 pb-3">
                <span className="block text-gray-500 mb-1">이름</span>
                <span className="font-medium text-[#17201B]">{application.name}</span>
              </div>
              <div className="border-b border-gray-100 pb-3">
                <span className="block text-gray-500 mb-1">연락처</span>
                <span className="font-medium text-[#17201B]">{application.phone}</span>
              </div>
              {application.ownerName && (
                <div className="border-b border-gray-100 pb-3">
                  <span className="block text-gray-500 mb-1">실제 보호자명</span>
                  <span className="font-medium text-[#17201B]">{application.ownerName}</span>
                </div>
              )}
            </div>
          </FormSection>

          <FormSection
            title={<div className="flex items-center gap-2"><HeartPulse className="w-5 h-5" /> 반려동물 정보</div>}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-[14px]">
              <div className="border-b border-gray-100 pb-3">
                <span className="block text-gray-500 mb-1">이름</span>
                <span className="font-medium text-[#17201B]">{application.petName}</span>
              </div>
              <div className="border-b border-gray-100 pb-3">
                <span className="block text-gray-500 mb-1">나이</span>
                <span className="font-medium text-[#17201B]">{application.petAge}살</span>
              </div>
              <div className="border-b border-gray-100 pb-3">
                <span className="block text-gray-500 mb-1">종류 및 품종</span>
                <span className="font-medium text-[#17201B]">
                  {application.petType} {application.breed ? `· ${application.breed}` : ''}
                </span>
              </div>
              {application.gender && (
                <div className="border-b border-gray-100 pb-3">
                  <span className="block text-gray-500 mb-1">성별 및 중성화</span>
                  <span className="font-medium text-[#17201B]">
                    {application.gender} {application.neutered !== undefined && (application.neutered ? '(중성화 완료)' : '(중성화 안함)')}
                  </span>
                </div>
              )}
            </div>
            
            {(application.medicalHistory || application.concerns) && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {application.medicalHistory && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">과거 병력</h5>
                    <div className="bg-gray-50 p-3 rounded-md border border-gray-100 text-[13px] text-gray-700 whitespace-pre-wrap min-h-[60px]">
                      {application.medicalHistory}
                    </div>
                  </div>
                )}
                {application.concerns && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">현재 주요 고민</h5>
                    <div className="bg-gray-50 p-3 rounded-md border border-gray-100 text-[13px] text-gray-700 whitespace-pre-wrap min-h-[60px]">
                      {application.concerns}
                    </div>
                  </div>
                )}
              </div>
            )}
          </FormSection>

          <FormSection
            title={<div className="flex items-center gap-2"><Shield className="w-5 h-5" /> 보험 신청 내용</div>}
          >
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-3 text-[14px]">
                <span className="block text-gray-500 mb-1">희망 보장항목</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {application.coverageNeeds.length > 0 ? (
                    application.coverageNeeds.map((need, idx) => (
                      <span key={idx} className="bg-[#FAF8F3] text-[#A8742E] px-3 py-1 rounded-full text-xs font-medium border border-[#E7E0D5]">
                        {need}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </div>
              </div>

              {application.hasCurrentInsurance !== undefined && (
                <div className="border-b border-gray-100 pb-3 text-[14px]">
                  <span className="block text-gray-500 mb-1">기존 보험 가입 여부</span>
                  <span className="font-medium text-[#17201B]">
                    {application.hasCurrentInsurance ? `가입함 (${application.currentInsuranceName || '상품명 미상'})` : '가입하지 않음'}
                  </span>
                </div>
              )}

              {application.targetPremium && (
                <div className="border-b border-gray-100 pb-3 text-[14px]">
                  <span className="block text-gray-500 mb-1">희망 월 보험료</span>
                  <span className="font-medium text-[#17201B]">{application.targetPremium}</span>
                </div>
              )}

              <div className="pb-3 text-[14px]">
                <span className="block text-gray-500 mb-2">남기신 메시지</span>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-100 text-[13px] text-gray-700 whitespace-pre-wrap min-h-[100px]">
                  {application.message || '남기신 메시지가 없습니다.'}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 mt-4 p-4 bg-[#F7F8F6] rounded-md">
                <div className="flex items-center gap-2">
                  {application.privacyAgree ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <div className="w-4 h-4 rounded-full border border-gray-300" />}
                  <span className="text-xs text-gray-600">개인정보 수집 동의</span>
                </div>
                <div className="flex items-center gap-2">
                  {application.thirdPartyAgree ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <div className="w-4 h-4 rounded-full border border-gray-300" />}
                  <span className="text-xs text-gray-600">제3자 제공 동의</span>
                </div>
              </div>
            </div>
          </FormSection>
        </div>

        <div className="space-y-6">
          <InsuranceStatusPanel application={application} onUpdate={loadApplication} />
        </div>
      </div>
    </div>
  );
}
