'use client';

import { useEffect, useState } from 'react';
import type { MemberAddress } from '@/types';
import { createMyAddress, deleteMyAddress, getMyAddresses, updateMyAddress } from '@/lib/storage';

type AddressForm = Omit<MemberAddress, 'id' | 'createdAt' | 'updatedAt' | 'isDefault'>;

const EMPTY_FORM: AddressForm = {
  label: '',
  recipientName: '',
  phone: '',
  postalCode: '',
  addressLine1: '',
  addressLine2: '',
};

export default function AddressBookSection() {
  const [addresses, setAddresses] = useState<MemberAddress[]>([]);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadAddresses = async () => {
    setLoading(true);
    try {
      setAddresses(await getMyAddresses());
      setError('');
    } catch {
      setError('배송지 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getMyAddresses()
      .then((items) => {
        if (active) {
          setAddresses(items);
          setError('');
        }
      })
      .catch(() => {
        if (active) setError('배송지 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateMyAddress(editingId, form);
      } else {
        await createMyAddress({ ...form, isDefault: addresses.length === 0 });
      }
      resetForm();
      await loadAddresses();
    } catch {
      setError('배송지 저장에 실패했습니다. 입력 내용을 확인해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (address: MemberAddress) => {
    setEditingId(address.id);
    setForm({
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      postalCode: address.postalCode,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 배송지를 삭제할까요?')) return;
    try {
      await deleteMyAddress(id);
      await loadAddresses();
    } catch {
      setError('배송지 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const handleDefault = async (id: string) => {
    try {
      await updateMyAddress(id, { isDefault: true });
      await loadAddresses();
    } catch {
      setError('기본 배송지 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const updateField = (field: keyof AddressForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#18231F]">배송지 관리</h2>
        <p className="mt-2 text-sm text-[#68716C]">자주 사용하는 배송지를 저장하고 주문 시 바로 선택하세요.</p>
      </div>
      {error && <p role="alert" className="mb-4 text-sm font-semibold text-red-600">{error}</p>}
      <div className="space-y-3">
        {loading && <p className="text-sm text-[#68716C]">배송지를 불러오는 중…</p>}
        {!loading && addresses.length === 0 && <p className="rounded-2xl border border-dashed border-[#DED8CC] p-6 text-sm text-[#68716C]">등록된 배송지가 없습니다.</p>}
        {addresses.map((address) => (
          <article key={address.id} className="rounded-2xl border border-[#DED8CC] bg-[#FFFDF9] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-[#18231F]">{address.label} {address.isDefault && <span className="ml-1 text-xs text-[#A8742E]">기본</span>}</h3>
                <p className="mt-2 text-sm font-semibold text-[#18231F]">{address.recipientName} · {address.phone}</p>
                <p className="mt-1 text-sm leading-6 text-[#68716C]">[{address.postalCode}] {address.addressLine1}{address.addressLine2 ? ` ${address.addressLine2}` : ''}</p>
              </div>
              <div className="flex shrink-0 gap-2 text-xs">
                <button type="button" onClick={() => handleEdit(address)} className="underline underline-offset-4">수정</button>
                <button type="button" onClick={() => handleDelete(address.id)} className="text-[#A65348] underline underline-offset-4">삭제</button>
              </div>
            </div>
            {!address.isDefault && <button type="button" onClick={() => handleDefault(address.id)} className="mt-4 min-h-10 rounded-lg border border-[#DED8CC] px-3 text-xs font-semibold text-[#18231F]">기본 배송지로 설정</button>}
          </article>
        ))}
      </div>

      <div className="mypage-card mt-6">
        <h3 className="text-lg font-bold text-[#18231F]">{editingId ? '배송지 수정' : '배송지 추가'}</h3>
        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-2 block text-sm font-semibold">배송지 이름 *</span><input required maxLength={30} value={form.label} onChange={(event) => updateField('label', event.target.value)} placeholder="집, 회사" className="w-full rounded-lg border border-[#DED8CC] px-4 py-3 text-sm" /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">받는 사람 *</span><input required maxLength={50} value={form.recipientName} onChange={(event) => updateField('recipientName', event.target.value)} className="w-full rounded-lg border border-[#DED8CC] px-4 py-3 text-sm" autoComplete="name" /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">휴대폰 번호 *</span><input required maxLength={40} value={form.phone} onChange={(event) => updateField('phone', event.target.value)} className="w-full rounded-lg border border-[#DED8CC] px-4 py-3 text-sm" autoComplete="tel" /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">우편번호 *</span><input required maxLength={20} value={form.postalCode} onChange={(event) => updateField('postalCode', event.target.value)} className="w-full rounded-lg border border-[#DED8CC] px-4 py-3 text-sm" autoComplete="postal-code" /></label>
          <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-semibold">주소 *</span><input required maxLength={250} value={form.addressLine1} onChange={(event) => updateField('addressLine1', event.target.value)} className="w-full rounded-lg border border-[#DED8CC] px-4 py-3 text-sm" autoComplete="street-address" /></label>
          <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-semibold">상세주소</span><input maxLength={250} value={form.addressLine2 ?? ''} onChange={(event) => updateField('addressLine2', event.target.value)} className="w-full rounded-lg border border-[#DED8CC] px-4 py-3 text-sm" autoComplete="address-line2" /></label>
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={resetForm} className="rounded-lg border border-[#DED8CC] px-4 py-3 text-sm font-semibold">취소</button><button type="submit" disabled={saving} className="rounded-lg bg-[#18231F] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? '저장 중…' : editingId ? '배송지 저장' : '배송지 추가'}</button></div>
        </form>
      </div>
    </section>
  );
}
