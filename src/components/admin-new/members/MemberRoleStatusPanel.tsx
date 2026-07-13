'use client';

import React, { useState } from 'react';
import type { User } from '@/types';
import { updateUserStatus } from '@/lib/storage';
import FormSection from '@/components/admin-new/common/FormSection';
import FormField from '@/components/admin-new/common/FormField';
import SaveBar from '@/components/admin-new/common/SaveBar';

interface MemberRoleStatusPanelProps {
  member: User;
  onUpdate: () => void;
}

export default function MemberRoleStatusPanel({ member, onUpdate }: MemberRoleStatusPanelProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState(member.status);
  const [rejectReason, setRejectReason] = useState(member.rejectReason || '');

  // Only allow updating from pending -> active or rejected
  const isPending = member.status === 'pending';
  const isAdmin = member.role === 'admin';
  const canUpdate = isPending && !isAdmin;

  const isDirty = status !== member.status || rejectReason !== (member.rejectReason || '');

  const handleSave = async () => {
    if (!status || status === 'pending') return;
    try {
      setIsSaving(true);
      const result = await updateUserStatus(member.id, status as 'active' | 'rejected', status === 'rejected' ? rejectReason : undefined);
      if (result.error) {
        throw new Error(result.error);
      }
      onUpdate();
    } catch (error: any) {
      alert(`상태 변경에 실패했습니다: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <FormSection
        title="승인 및 상태 관리"
        description="B2B, 파트너, 보험 심사 권한 요청을 승인하거나 반려합니다."
      >
        <div className="space-y-6">
          <FormField label="계정 상태">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              disabled={!canUpdate}
              className="w-full md:w-1/2 border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34] disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="pending">승인 대기</option>
              <option value="active">활성 (승인)</option>
              <option value="inactive">비활성 (정지)</option>
              <option value="rejected">반려</option>
            </select>
            {!canUpdate && (
              <p className="mt-2 text-xs text-gray-500">
                {isAdmin ? '최고 관리자의 상태는 변경할 수 없습니다.' : '승인 대기 중인 상태에서만 변경할 수 있습니다.'}
              </p>
            )}
          </FormField>

          {status === 'rejected' && (
            <FormField label="반려 사유">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                disabled={!canUpdate}
                placeholder="반려 사유를 입력하세요. 사용자에게 안내됩니다."
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34] disabled:bg-gray-100 disabled:text-gray-500"
              />
            </FormField>
          )}
        </div>
      </FormSection>

      {canUpdate && (
        <SaveBar
          isDirty={isDirty}
          isSaving={isSaving}
          onSave={handleSave}
          onCancel={() => {
            setStatus(member.status);
            setRejectReason(member.rejectReason || '');
          }}
        />
      )}
    </>
  );
}
