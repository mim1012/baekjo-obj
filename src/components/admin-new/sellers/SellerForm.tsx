'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { Seller } from '@/types';
import { createSeller, updateSeller } from '@/lib/storage';
import FormField from '@/components/admin-new/common/FormField';

const INPUT = 'w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B]';

type SellerDraft = Omit<Seller, 'id' | 'createdAt' | 'updatedAt' | 'freeShippingThreshold' | 'shippingFee'> & {
  freeShippingThreshold: number | null;
  shippingFee: number;
};

const EMPTY: SellerDraft = {
  displayName: '',
  legalName: '',
  representativeName: '',
  businessRegistrationNumber: '',
  mailOrderRegistrationNumber: '',
  businessAddress: '',
  phone: '',
  email: '',
  returnAddress: '',
  shippingFee: 3000,
  freeShippingThreshold: 50000,
  dispatchEstimate: '',
  returnPolicy: '',
  status: 'draft',
};

export default function SellerForm({ seller, onClose, onSaved }: {
  seller?: Seller | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<SellerDraft>(() => seller ? {
    displayName: seller.displayName,
    legalName: seller.legalName,
    representativeName: seller.representativeName,
    businessRegistrationNumber: seller.businessRegistrationNumber,
    mailOrderRegistrationNumber: seller.mailOrderRegistrationNumber ?? '',
    businessAddress: seller.businessAddress ?? '',
    phone: seller.phone ?? '',
    email: seller.email ?? '',
    returnAddress: seller.returnAddress ?? '',
    shippingFee: seller.shippingFee ?? 3000,
    freeShippingThreshold: seller.freeShippingThreshold ?? null,
    dispatchEstimate: seller.dispatchEstimate ?? '',
    returnPolicy: seller.returnPolicy ?? '',
    status: seller.status,
  } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const set = <K extends keyof SellerDraft>(key: K, value: SellerDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    // 필수는 사업자등록번호·브랜드&상호명(표시명+상호명)·대표자 4개뿐이다. 나머지는 선택이며
    // 미입력 시 공개 화면에서 해당 항목만 숨긴다.
    const required = [draft.displayName, draft.legalName, draft.representativeName,
      draft.businessRegistrationNumber];
    if (required.some((value) => !value.trim())) {
      setError('필수 사업자 정보(표시명, 상호명, 대표자, 사업자등록번호)를 모두 입력해주세요.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (seller) await updateSeller(seller.id, draft);
      else await createSeller(draft);
      await onSaved();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(code === 'seller-incomplete' ? '검증 완료로 바꾸려면 필수 사업자 정보를 모두 입력해야 합니다.' : '판매자 정보를 저장하지 못했습니다.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17201B]/50 p-4" onClick={onClose}>
      <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl" role="dialog" aria-modal="true" aria-label={seller ? '판매자 수정' : '판매자 등록'} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b bg-gray-50 px-6 py-4">
          <div>
            <h2 className="font-semibold text-[#17201B]">{seller ? '판매자 정보 수정' : '새 판매자 등록'}</h2>
            <p className="mt-1 text-xs text-gray-500">고객 상품 상세와 주문서에 표시될 실제 계약 상대방 정보입니다.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기"><X size={20} /></button>
        </div>
        <form id="seller-form" onSubmit={submit} className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          {error && <div role="alert" className="col-span-full rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <FormField label="고객 표시명" htmlFor="seller-display-name" required><input id="seller-display-name" className={INPUT} value={draft.displayName} onChange={(e) => set('displayName', e.target.value)} placeholder="예: 백조오브제 직영" /></FormField>
          <FormField label="상호(법인명)" htmlFor="seller-legal-name" required><input id="seller-legal-name" className={INPUT} value={draft.legalName} onChange={(e) => set('legalName', e.target.value)} /></FormField>
          <FormField label="대표자명" htmlFor="seller-representative-name" required><input id="seller-representative-name" className={INPUT} value={draft.representativeName} onChange={(e) => set('representativeName', e.target.value)} /></FormField>
          <FormField label="사업자등록번호" htmlFor="seller-registration-number" required><input id="seller-registration-number" className={INPUT} value={draft.businessRegistrationNumber} onChange={(e) => set('businessRegistrationNumber', e.target.value)} placeholder="000-00-00000" /></FormField>
          <FormField label="통신판매업 신고번호" htmlFor="seller-mail-order-number"><input id="seller-mail-order-number" className={INPUT} value={draft.mailOrderRegistrationNumber} onChange={(e) => set('mailOrderRegistrationNumber', e.target.value)} placeholder="미입력 시 공개 화면에 표시하지 않습니다" /></FormField>
          <FormField label="고객센터 연락처" htmlFor="seller-phone"><input id="seller-phone" className={INPUT} value={draft.phone} onChange={(e) => set('phone', e.target.value)} placeholder="미입력 시 공개 화면에 표시하지 않습니다" /></FormField>
          <div className="sm:col-span-2"><FormField label="사업장 주소" htmlFor="seller-address"><input id="seller-address" className={INPUT} value={draft.businessAddress} onChange={(e) => set('businessAddress', e.target.value)} placeholder="미입력 시 공개 화면에 표시하지 않습니다" /></FormField></div>
          <div className="sm:col-span-2"><FormField label="반품지 주소" htmlFor="seller-return-address"><input id="seller-return-address" className={INPUT} value={draft.returnAddress} onChange={(e) => set('returnAddress', e.target.value)} placeholder="미입력 시 사업장 주소를 사용합니다" /></FormField></div>
          <FormField label="고객센터 이메일" htmlFor="seller-email"><input id="seller-email" type="email" className={INPUT} value={draft.email} onChange={(e) => set('email', e.target.value)} /></FormField>
          <FormField label="기본 배송비" htmlFor="seller-shipping-fee"><input id="seller-shipping-fee" type="number" min="0" step="1" className={INPUT} value={draft.shippingFee} onChange={(e) => set('shippingFee', Number(e.target.value))} /></FormField>
          <FormField label="무료배송 기준" htmlFor="seller-free-shipping-threshold"><input id="seller-free-shipping-threshold" type="number" min="0" step="1" className={INPUT} value={draft.freeShippingThreshold ?? ''} onChange={(e) => set('freeShippingThreshold', e.target.value === '' ? null : Number(e.target.value))} placeholder="미입력 시 자동 무료배송 없음" /></FormField>
          <div className="sm:col-span-2"><FormField label="출고 예정" htmlFor="seller-dispatch-estimate"><input id="seller-dispatch-estimate" className={INPUT} value={draft.dispatchEstimate} onChange={(e) => set('dispatchEstimate', e.target.value)} placeholder="예: 결제 완료 후 3영업일 이내 출고 (미입력 시 공개 화면에 표시하지 않습니다)" /></FormField></div>
          <div className="sm:col-span-2"><FormField label="교환·반품 조건" htmlFor="seller-return-policy"><textarea id="seller-return-policy" className={`${INPUT} min-h-24 resize-y`} value={draft.returnPolicy} onChange={(e) => set('returnPolicy', e.target.value)} placeholder="신청기간, 비용, 제한 조건을 입력합니다 (미입력 시 공개 화면에 표시하지 않습니다)" /></FormField></div>
          <FormField label="운영 상태" htmlFor="seller-status">
            <select id="seller-status" className={INPUT} value={draft.status} onChange={(e) => set('status', e.target.value as SellerDraft['status'])}>
              <option value="draft">작성 중</option>
              <option value="verified">검증 완료</option>
              <option value="suspended">판매 중지</option>
            </select>
          </FormField>
        </form>
        <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="rounded border px-4 py-2 text-sm">취소</button>
          <button type="submit" form="seller-form" disabled={saving} className="flex items-center gap-2 rounded bg-[#17201B] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving && <Loader2 size={15} className="animate-spin" />}{seller ? '수정 저장' : '판매자 등록'}
          </button>
        </div>
      </div>
    </div>
  );
}
