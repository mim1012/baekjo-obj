'use client';

import React, { useState } from 'react';
import type { User } from '@/types';
import { updateUserStatus } from '@/lib/storage';
import { allowedMemberStatusTargets } from '@/lib/members/statusTransitions';
import FormSection from '@/components/admin-new/common/FormSection';
import FormField from '@/components/admin-new/common/FormField';
import SaveBar from '@/components/admin-new/common/SaveBar';

interface MemberRoleStatusPanelProps {
  member: User;
  onUpdate: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  pending: '승인 대기',
  active: '활성 (승인)',
  inactive: '비활성 (정지)',
  rejected: '반려',
  withdrawn: '탈퇴',
};

export default function MemberRoleStatusPanel({ member, onUpdate }: MemberRoleStatusPanelProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState(member.status);
  const [rejectReason, setRejectReason] = useState(member.rejectReason || '');

  const isAdmin = member.role === 'admin';
  const currentStatus = member.status ?? 'pending';
  const allowedTargets = isAdmin ? [] : allowedMemberStatusTargets(currentStatus);
  const canUpdate = allowedTargets.length > 0;

  const isDirty = status !== member.status || rejectReason !== (member.rejectReason || '');

  const handleSave = async () => {
    if (!status || !allowedTargets.includes(status as 'active' | 'inactive' | 'rejected')) return;

    // 권한(활성 상태)에 직접 영향을 주는 작업이라 오조작 방지 확인창을 거친다(§ 정지/재활성 액션 필수).
    const confirmMessage =
      status === 'inactive'
        ? `${member.name}님을 정지 처리합니다. 이 회원은 즉시 로그인·주문 등 활동이 차단됩니다. 계속할까요?`
        : status === 'active'
          ? `${member.name}님을 활성화합니다. 계속할까요?`
          : `${member.name}님을 반려 처리합니다. 계속할까요?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      setIsSaving(true);
      const result = await updateUserStatus(
        member.id,
        status as 'active' | 'inactive' | 'rejected',
        status === 'rejected' ? rejectReason : undefined,
      );
      if (result.error) {
        throw new Error(result.error);
      }
      onUpdate();
    } catch (error) {
      alert(`상태 변경에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
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
              onChange={(e) => setStatus(e.target.value as User['status'])}
              disabled={!canUpdate}
              className="w-full md:w-1/2 border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34] disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value={currentStatus}>{STATUS_LABEL[currentStatus] ?? currentStatus}</option>
              {allowedTargets.map((target) => (
                <option key={target} value={target}>
                  {STATUS_LABEL[target]}
                </option>
              ))}
            </select>
            {!canUpdate && (
              <p className="mt-2 text-xs text-gray-500">
                {isAdmin
                  ? '최고 관리자의 상태는 변경할 수 없습니다.'
                  : currentStatus === 'withdrawn'
                    ? '탈퇴한 회원의 상태는 변경할 수 없습니다.'
                    : currentStatus === 'rejected'
                      ? '반려된 회원의 상태는 변경할 수 없습니다.'
                      : '변경 가능한 상태가 없습니다.'}
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
