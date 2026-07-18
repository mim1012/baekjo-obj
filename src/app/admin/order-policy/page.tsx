'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminUi';
import { getAdminOrderPolicyConfig, saveOrderPolicyConfig } from '@/lib/storage';
import {
  ORDER_POLICY_TTL_MIN_HOURS,
  ORDER_POLICY_TTL_MAX_HOURS,
  defaultOrderPolicyConfig,
  normalizeOrderPolicyConfig,
} from '@/lib/orderPolicy/config';

export default function AdminOrderPolicyPage() {
  // draft 는 문자열로 들고 저장 시에만 숫자화한다 — number input 을 비우는 중간 상태를 허용하기 위함.
  // 로드 완료 전(loaded=false)·로드 실패(loadError) 시 저장을 막는다 — 로드 전 저장이 기본값으로
  // DB 를 덮어쓰는 레이스 방지(insurance-content 관리자 화면과 동일 방어).
  const [draft, setDraft] = useState(String(defaultOrderPolicyConfig.bankTransferTtlHours));
  // 자동취소 사용 여부 — 기본 비활성(2026-07-18 결정: 무통장 자동취소 미사용).
  const [autoCancelEnabled, setAutoCancelEnabled] = useState(
    defaultOrderPolicyConfig.bankTransferAutoCancelEnabled,
  );
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminOrderPolicyConfig()
      .then((config) => {
        if (cancelled) return;
        setLoadError(false);
        setDraft(String(config.bankTransferTtlHours));
        setAutoCancelEnabled(config.bankTransferAutoCancelEnabled);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (!loaded || loadError || saving) return;
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setFeedback({ ok: false, message: '시간을 숫자로 입력해 주세요.' });
      return;
    }
    // 서버(PUT)도 normalize 하지만, 관리자가 입력한 값과 실제 저장값이 달라지는 것을
    // 화면에서 먼저 보여주기 위해 같은 normalize 를 거친 값으로 저장·표시한다.
    const normalized = normalizeOrderPolicyConfig({
      bankTransferAutoCancelEnabled: autoCancelEnabled,
      bankTransferTtlHours: parsed,
    });
    setSaving(true);
    const { ok } = await saveOrderPolicyConfig(normalized);
    setSaving(false);
    if (ok) {
      setDraft(String(normalized.bankTransferTtlHours));
      setAutoCancelEnabled(normalized.bankTransferAutoCancelEnabled);
      setFeedback({
        ok: true,
        message: normalized.bankTransferAutoCancelEnabled
          ? `저장되었습니다. 무통장입금 입금 기한: ${normalized.bankTransferTtlHours}시간`
          : '자동취소 사용 안 함으로 저장되었습니다.',
      });
    } else {
      setFeedback({ ok: false, message: '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.' });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="주문 정책"
        description={
          loadError
            ? '설정을 불러오지 못했습니다. 저장을 막았습니다. 새로고침 후 다시 시도해 주세요.'
            : !loaded
              ? '설정 로딩 중…'
              : '무통장입금 주문의 자동취소 사용 여부와 입금 기한(재고 선점 유효시간)을 관리합니다.'
        }
      />

      <div className="max-w-2xl border border-[#E7E0D5] bg-white p-6 md:p-8">
        <h2 className="mb-2 text-lg font-semibold text-[#17211D]">무통장입금 자동취소</h2>
        <p className="mb-6 break-keep text-sm leading-7 text-[#6F766F]">
          {autoCancelEnabled ? (
            <>
              무통장입금 주문은 생성 후 이 시간 안에 입금이 확인되지 않으면 자동으로 취소되고 재고가 복원됩니다.
              변경은 저장 이후 <strong className="font-semibold text-[#17211D]">새로 생성되는 주문부터</strong> 적용되며,
              이미 생성된 주문의 만료 시각은 생성 시점 값이 유지됩니다. 허용 범위는{' '}
              {ORDER_POLICY_TTL_MIN_HOURS}~{ORDER_POLICY_TTL_MAX_HOURS}시간(30일)이고, 기본값은{' '}
              {defaultOrderPolicyConfig.bankTransferTtlHours}시간입니다.
            </>
          ) : (
            <>
              무통장 주문은 자동취소되지 않으며, 입금 확인 전까지{' '}
              <strong className="font-semibold text-[#17211D]">입금대기</strong>로 유지됩니다.
              자동취소를 켜면 저장 이후 새로 생성되는 무통장 주문부터 입금 기한이 적용됩니다.
            </>
          )}
        </p>

        <label className="mb-6 flex w-fit cursor-pointer items-center gap-2.5 text-sm text-[#17211D]">
          <input
            type="checkbox"
            checked={autoCancelEnabled}
            disabled={!loaded || loadError}
            onChange={(e) => {
              setAutoCancelEnabled(e.target.checked);
              setFeedback(null);
            }}
            className="h-4 w-4 accent-[#2F3B34] disabled:cursor-not-allowed"
          />
          자동취소 사용
        </label>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="bank-transfer-ttl" className="mb-1.5 block text-xs font-medium text-[#59615B]">
              입금 기한 (시간 단위)
            </label>
            <input
              id="bank-transfer-ttl"
              type="number"
              min={ORDER_POLICY_TTL_MIN_HOURS}
              max={ORDER_POLICY_TTL_MAX_HOURS}
              step={1}
              value={draft}
              disabled={!loaded || loadError || !autoCancelEnabled}
              onChange={(e) => {
                setDraft(e.target.value);
                setFeedback(null);
              }}
              className="w-40 border border-[#D1D0C8] rounded-sm bg-white px-3 py-2 text-sm outline-none focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34] disabled:bg-[#FAF8F3] disabled:text-[#9AA09A]"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={!loaded || loadError || saving}
            className="flex min-h-11 items-center gap-2 bg-[#17211D] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#202521] disabled:cursor-not-allowed disabled:bg-[#9AA09A]"
          >
            <Save className="h-4 w-4" />
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>

        {feedback && (
          <p
            aria-live="polite"
            className={`mt-4 text-sm ${feedback.ok ? 'text-[#2F3B34]' : 'text-[#8A4B3B]'}`}
          >
            {feedback.message}
          </p>
        )}
      </div>
    </div>
  );
}
