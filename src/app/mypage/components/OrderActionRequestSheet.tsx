'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleAlert, Minus, Plus, X } from 'lucide-react';
import type { Brand, Order, Shipment } from '@/types';
import type { OrderBundle } from '@/lib/shipments/timeline';
import type { OrderActionRequestItemInput, OrderActionRequestRecord, OrderActionRequestType } from '@/lib/orders/actionRequests';
import { reservedQuantityByLine } from '@/lib/orders/actionRequests';

type OrderActionRequestSheetProps = {
  order: Order;
  bundles: OrderBundle[];
  brands: Brand[];
  shipments: Shipment[];
  requests: OrderActionRequestRecord[];
  onClose: () => void;
  onSubmit: (
    requestType: OrderActionRequestType,
    brandId: string,
    items: OrderActionRequestItemInput[],
    reason: string,
  ) => Promise<void>;
};

const REASONS = ['단순 변심', '상품 문제', '배송 문제', '기타'] as const;

function getBrandLabel(brandId: string, brands: Brand[]): string {
  return brands.find((brand) => brand.id === brandId)?.name ?? brandId;
}

function getDeliveryMessage(order: Order, shipments: Shipment[], brandId?: string): string {
  const status = shipments.find((shipment) => shipment.brandId === brandId)?.deliveryStatus ?? order.deliveryStatus;
  if (status === '배송중') return '배송 중인 주문입니다. 회수 확인 후 처리될 수 있어요.';
  if (status === '배송완료') return '배송이 완료된 주문입니다. 반품 확인 후 환불될 수 있어요.';
  return '관리자가 결제·배송 상태를 확인한 뒤 처리합니다.';
}

export default function OrderActionRequestSheet({
  order,
  bundles,
  brands,
  shipments,
  requests,
  onClose,
  onSubmit,
}: OrderActionRequestSheetProps) {
  const availableBundles = useMemo(
    () => bundles.filter((bundle): bundle is OrderBundle & { brandId: string } => Boolean(bundle.brandId)),
    [bundles],
  );
  const [brandId, setBrandId] = useState(availableBundles[0]?.brandId ?? '');
  const [requestType, setRequestType] = useState<OrderActionRequestType>('CANCEL');
  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({});
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const requestTypeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const brandRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pendingRef = useRef(pending);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pendingRef.current) {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  const currentBundle = availableBundles.find((bundle) => bundle.brandId === brandId) ?? availableBundles[0];
  const reservedByLine = reservedQuantityByLine(requests);
  const lineItems = currentBundle
    ? order.items
        .map((item, lineIndex) => ({ item, lineIndex }))
        .filter(({ item }) => item.brandId === currentBundle.brandId)
    : [];
  const selectedItems = lineItems.flatMap(({ lineIndex }) => {
    const quantity = selectedQuantities[lineIndex] ?? 0;
    return quantity > 0 ? [{ lineIndex, quantity }] : [];
  });
  const selectedCount = selectedItems.reduce((total, item) => total + item.quantity, 0);
  const selectedAmount = selectedItems.reduce(
    (total, selected) => total + (order.items[selected.lineIndex]?.price ?? 0) * selected.quantity,
    0,
  );
  const refundAvailable = order.paymentStatus === '결제완료';
  const activeRequest = currentBundle
    ? requests.find(
        (request) =>
          request.brandId === currentBundle.brandId &&
          request.requestType === requestType &&
          (request.status === 'REQUESTED' || request.status === 'APPROVED'),
      )
    : undefined;

  const changeBrand = (nextBrandId: string) => {
    setBrandId(nextBrandId);
    setSelectedQuantities({});
    setError('');
  };

  const setQuantity = (lineIndex: number, quantity: number) => {
    const source = order.items[lineIndex];
    const remaining = Math.max(0, (source?.quantity ?? 0) - (reservedByLine.get(lineIndex) ?? 0));
    setSelectedQuantities((current) => ({
      ...current,
      [lineIndex]: Math.min(remaining, Math.max(0, quantity)),
    }));
  };

  const submit = async () => {
    if (!currentBundle || selectedItems.length === 0 || !reason.trim()) return;
    setPending(true);
    setError('');
    try {
      await onSubmit(requestType, currentBundle.brandId, selectedItems, reason.trim());
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '요청에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#17201B]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-[#DED8CC] bg-[#FAF9F5] shadow-[0_-12px_40px_rgba(23,32,27,0.16)] sm:max-h-[84dvh] sm:max-w-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-action-sheet-title"
      >
        <header className="flex items-start justify-between border-b border-[#DED8CC] px-5 py-4 sm:px-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#68776C]">주문 관리</p>
            <h2 id="order-action-sheet-title" className="mt-1 text-xl font-semibold text-[#17201B]">취소·환불 요청</h2>
            <p className="mt-1 text-xs text-[#68776C]">주문번호 {order.id}</p>
          </div>
          <button type="button" data-autofocus onClick={onClose} disabled={pending} className="flex h-11 w-11 items-center justify-center rounded-full text-[#68776C] transition-colors hover:bg-[#F4F2EC] disabled:opacity-50" aria-label="취소·환불 요청 닫기">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="flex gap-3 border border-[#DED8CC] bg-[#F4F2EC] px-4 py-3 text-xs leading-5 text-[#59615B]">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#A65348]" />
            <p>{getDeliveryMessage(order, shipments, currentBundle?.brandId)}</p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-[#F4F2EC] p-1" role="radiogroup" aria-label="요청 유형">
            {(['CANCEL', 'REFUND'] as const).map((type, index, types) => {
              const disabled = type === 'REFUND' && !refundAvailable;
              const selected = requestType === type;
              return (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  disabled={disabled}
                  onClick={() => { setRequestType(type); setError(''); }}
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                    event.preventDefault();
                    const nextIndex = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (index + types.length - 1) % types.length : (index + 1) % types.length;
                    const nextType = types[nextIndex];
                    if (nextType && !(nextType === 'REFUND' && !refundAvailable)) {
                      setRequestType(nextType);
                      requestTypeRefs.current[nextIndex]?.focus();
                    }
                  }}
                  ref={(element) => { requestTypeRefs.current[index] = element; }}
                  className={`min-h-11 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${selected ? 'bg-[#2F3B34] text-white' : 'text-[#59615B] hover:bg-[#FBFAF7]'} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {type === 'CANCEL' ? '취소 요청' : '환불 요청'}
                  {disabled && <span className="ml-1 text-[10px]">결제 후 가능</span>}
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#17201B]">브랜드 선택</h3>
              <span className="text-xs text-[#68776C]">{availableBundles.length}개 브랜드</span>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="브랜드 선택">
              {availableBundles.map((bundle, index) => {
                const selected = bundle.brandId === currentBundle?.brandId;
                return (
                  <button
                    key={bundle.brandId}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => changeBrand(bundle.brandId)}
                    onKeyDown={(event) => {
                      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                      event.preventDefault();
                      const nextIndex = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (index + availableBundles.length - 1) % availableBundles.length : (index + 1) % availableBundles.length;
                      const nextBrand = availableBundles[nextIndex];
                      if (nextBrand) {
                        changeBrand(nextBrand.brandId);
                        brandRefs.current[nextIndex]?.focus();
                      }
                    }}
                    ref={(element) => { brandRefs.current[index] = element; }}
                    className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${selected ? 'border-[#2F3B34] bg-[#2F3B34] font-semibold text-white' : 'border-[#D1D0C8] bg-[#FBFAF7] text-[#59615B] hover:border-[#687069]'}`}
                  >
                    {getBrandLabel(bundle.brandId, brands)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#17201B]">상품 선택</h3>
                <p className="mt-1 text-xs text-[#68776C]">요청할 수량만 선택해 주세요.</p>
              </div>
              {activeRequest && <span className="text-xs font-semibold text-[#A65348]">이미 접수됨</span>}
            </div>
            <div className="mt-3 divide-y divide-[#EBE6DC] border-y border-[#EBE6DC]">
              {lineItems.map(({ item, lineIndex }) => {
                const remaining = Math.max(0, item.quantity - (reservedByLine.get(lineIndex) ?? 0));
                const quantity = selectedQuantities[lineIndex] ?? 0;
                return (
                  <div key={`${order.id}-${lineIndex}`} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#17201B]">{item.productName}</p>
                      <p className="mt-1 text-xs text-[#68776C]">{formatWon(item.price)} · 잔여 {remaining}개</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 rounded-full border border-[#D1D0C8] bg-white p-1">
                      <button type="button" onClick={() => setQuantity(lineIndex, quantity - 1)} disabled={quantity === 0 || Boolean(activeRequest) || remaining === 0} className="flex h-11 w-11 items-center justify-center rounded-full text-[#59615B] hover:bg-[#F4F2EC] disabled:opacity-30" aria-label={`${item.productName} 수량 줄이기`}>
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-5 text-center text-sm font-semibold text-[#17201B]">{quantity}</span>
                      <button type="button" onClick={() => setQuantity(lineIndex, quantity + 1)} disabled={quantity >= remaining || Boolean(activeRequest)} className="flex h-11 w-11 items-center justify-center rounded-full text-[#59615B] hover:bg-[#F4F2EC] disabled:opacity-30" aria-label={`${item.productName} 수량 늘리기`}>
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="order-action-reason" className="text-sm font-semibold text-[#17201B]">요청 사유</label>
            <div className="mt-3 flex flex-wrap gap-2">
              {REASONS.map((option) => (
                <button key={option} type="button" onClick={() => setReason(option)} className={`min-h-11 rounded-full border px-3 py-2 text-xs transition-colors ${reason === option ? 'border-[#2F3B34] bg-[#2F3B34] text-white' : 'border-[#D1D0C8] bg-white text-[#59615B] hover:border-[#687069]'}`}>
                  {option}
                </button>
              ))}
            </div>
            <input id="order-action-reason" value={reason} onChange={(event) => setReason(event.target.value.slice(0, 200))} placeholder="사유를 선택하거나 직접 입력해 주세요" className="mt-3 h-11 w-full border border-[#C9C8C0] bg-white px-3 text-sm text-[#17201B] outline-none transition-colors placeholder:text-[#68776C] focus:border-[#2F3B34]" />
          </div>
          {error && <p role="alert" className="mt-4 border border-[#E5B9B1] bg-[#FFF5F2] px-3 py-2 text-xs text-[#A65348]">{error}</p>}
        </div>

        <footer className="border-t border-[#DED8CC] bg-[#FAF9F5] px-5 py-4 sm:px-7">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-[#68776C]">선택 {selectedCount}개</span>
            <strong className="text-[#17201B]">예상 금액 {formatWon(selectedAmount)}</strong>
          </div>
          <button type="button" onClick={() => void submit()} disabled={pending || Boolean(activeRequest) || selectedItems.length === 0 || !reason.trim()} className="mt-3 flex h-12 w-full items-center justify-center gap-2 bg-[#2F3B34] text-sm font-semibold text-white transition-colors hover:bg-[#3C4941] disabled:cursor-not-allowed disabled:bg-[#E4E1D8] disabled:text-[#68776C]">
            {pending ? '접수 중...' : activeRequest ? '요청 접수됨' : `${requestType === 'CANCEL' ? '취소' : '환불'} 요청 접수하기`}
          </button>
        </footer>
      </section>
    </div>
  );
}

function formatWon(value: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`;
}
