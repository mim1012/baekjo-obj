'use client';

import React, { useState } from 'react';
import type { InsuranceApplication, InsuranceStatus } from '@/types';
import { updateInsuranceStatus, updateInsuranceContacted, updateInsuranceMemo } from '@/lib/storage';
import FormSection from '@/components/admin-new/common/FormSection';
import FormField from '@/components/admin-new/common/FormField';
import SaveBar from '@/components/admin-new/common/SaveBar';

interface InsuranceStatusPanelProps {
  application: InsuranceApplication;
  onUpdate: () => void;
}

export default function InsuranceStatusPanel({ application, onUpdate }: InsuranceStatusPanelProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    status: application.status,
    contacted: application.contacted || false,
    memo: application.memo || '',
  });

  const isDirty = 
    formData.status !== application.status ||
    formData.contacted !== (application.contacted || false) ||
    formData.memo !== (application.memo || '');

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const promises = [];
      
      if (formData.status !== application.status) {
        promises.push(updateInsuranceStatus(application.id, formData.status));
      }
      
      if (formData.contacted !== (application.contacted || false)) {
        promises.push(updateInsuranceContacted(application.id, formData.contacted));
      }
      
      if (formData.memo !== (application.memo || '')) {
        promises.push(updateInsuranceMemo(application.id, formData.memo));
      }
      
      if (promises.length > 0) {
        await Promise.all(promises);
      }
      
      onUpdate(); // refresh data
    } catch (error) {
      alert('상담 정보 업데이트에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <FormSection
        title="상담 관리 및 메모"
        description="현재 상담 진행 상태 및 연락 여부를 업데이트합니다."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="상담 진행 상태">
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as InsuranceStatus }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34]"
            >
              <option value="신청완료">신청완료</option>
              <option value="접수">접수</option>
              <option value="분석중">분석중</option>
              <option value="상담중">상담중</option>
              <option value="분석완료">분석완료</option>
              <option value="완료">완료</option>
              <option value="보류">보류</option>
            </select>
          </FormField>

          <FormField label="고객 연락 여부">
            <div className="flex items-center h-full">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.contacted}
                  onChange={(e) => setFormData(prev => ({ ...prev, contacted: e.target.checked }))}
                  className="rounded border-gray-300 text-[#2F3B34] focus:ring-[#2F3B34]"
                />
                <span className="text-sm font-medium text-gray-700">연락 완료</span>
              </label>
            </div>
          </FormField>

          <FormField label="관리자 메모" className="md:col-span-2">
            <textarea
              value={formData.memo}
              onChange={(e) => setFormData(prev => ({ ...prev, memo: e.target.value }))}
              placeholder="상담 내용, 특이사항, 향후 계획 등을 자유롭게 기록하세요."
              rows={5}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34]"
            />
          </FormField>
        </div>
      </FormSection>

      <SaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={() => {
          setFormData({
            status: application.status,
            contacted: application.contacted || false,
            memo: application.memo || '',
          });
        }}
      />
    </>
  );
}
