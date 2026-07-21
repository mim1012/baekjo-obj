'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Copy, Check, ExternalLink, PackageCheck } from 'lucide-react';
import type { Order, Shipment, Brand, BrandShippingPolicy } from '@/types';
import { getOrderShipments, confirmOrderShipment } from '@/lib/storage';
import { buildTrackingUrl, CARRIER_LABELS, isCarrierCode } from '@/lib/carriers';
import { DEFAULT_COMMERCE_POLICY } from '@/data/company';
import { formatPrice } from '@/lib/format';
import { TIMELINE_STEPS, timelineFill } from '@/lib/shipments/timeline';
import type { OrderBundle } from '@/lib/shipments/timeline';

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  /** 조회 대상 번들. brandId=null 이면 레거시(주문 단위) 조회. */
  bundle: OrderBundle | null;
  /** 마이페이지가 콘센트(getPublicBrands)로 이미 읽어둔 공개 브랜드 목록. 배송정책 폴백용. */
  brands: Brand[];
}

/** 브랜드 배송정책 없이도 화면이 비지 않게 기본 상거래 정책으로 폴백해 표기 문자열을 만든다. */
function resolvePolicy(shipping: BrandShippingPolicy | undefined) {
  const fee = shipping?.shippingFee;
  const threshold = shipping?.freeShippingThreshold;
  const shippingFeeLabel =
    shipping?.shippingFeeLabel ??
    (fee === undefined
      ? DEFAULT_COMMERCE_POLICY.shippingLabel
      : fee === 0
        ? '무료배송'
        : threshold === undefined
          ? `${formatPrice(fee)}`
          : `${formatPrice(fee)} (${formatPrice(threshold)} 이상 구매 시 무료배송)`);

  return {
    shippingFeeLabel,
    dispatchEstimate: shipping?.dispatchEstimate ?? DEFAULT_COMMERCE_POLICY.deliveryEstimate,
    extraFeeNotice: shipping?.extraFeeNotice,
    returnPolicy: shipping?.returnPolicy ?? shipping?.asNotice ?? DEFAULT_COMMERCE_POLICY.returnNotice,
    returnExclusions: shipping?.returnExclusions,
    supportContact: shipping?.supportContact,
    supportHours: shipping?.supportHours,
  };
}

export default function TrackingModal({ isOpen, onClose, order, bundle, brands }: TrackingModalProps) {
  const [shipments, setShipments] = useState<Shipment[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const orderId = order.id;
  const brandId = bundle?.brandId ?? null;

  const loadShipments = useCallback(() => {
    // brandId가 없어도(레거시) 다른 번들에 송장이 있을 수 있어 항상 조회한다. 게스트·실패는 [].
    getOrderShipments(orderId).then(setShipments);
  }, [orderId]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShipments(null);
    setConfirmError(null);
    setCopied(false);
    loadShipments();
    // 열릴 때 닫기 버튼으로 포커스를 옮겨 키보드 사용자가 모달 안에서 시작하게 한다.
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = 'unset';
      window.clearTimeout(focusTimer);
    };
  }, [isOpen, loadShipments]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 이 번들의 송장. 브랜드 번들이면 brandId로 찾고, 레거시(null)면 주문 단위 carrier/trackingNumber로 대체한다.
  const shipment = brandId ? shipments?.find((s) => s.brandId === brandId) ?? null : null;

  const carrier = shipment?.carrier ?? (brandId ? undefined : order.carrier);
  const trackingNumber = shipment?.trackingNumber ?? (brandId ? undefined : order.trackingNumber);
  const deliveryStatus = shipment?.deliveryStatus ?? (brandId ? undefined : order.deliveryStatus);

  const fill = timelineFill(deliveryStatus);
  const carrierLabel = carrier && isCarrierCode(carrier) ? CARRIER_LABELS[carrier] : null;
  const trackingUrl = buildTrackingUrl(carrier, trackingNumber);

  const brand = brandId ? brands.find((b) => b.id === brandId) ?? null : null;
  const policy = resolvePolicy(brand?.shipping);
  const bundleTitle = brand?.name ?? (brandId ? '배송 정보' : '주문 배송');

  const isConfirmed = shipment?.deliveryStatus === '구매확정';
  const canConfirm = Boolean(brandId) && shipment?.deliveryStatus === '배송완료';
  // 송장 조회는 끝났는데 브랜드 번들에 송장 행이 없으면 판매자가 아직 준비 중이다.
  const awaitingShipment = Boolean(brandId) && shipments !== null && shipment === null;

  const handleCopy = async () => {
    if (!trackingNumber) return;
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const handleConfirm = async () => {
    if (!brandId || confirming) return;
    setConfirming(true);
    setConfirmError(null);
    try {
      await confirmOrderShipment(orderId, brandId);
      loadShipments(); // 낙관적 갱신 대신 서버 상태를 다시 읽어 '구매확정'으로 반영한다.
    } catch (e) {
      setConfirmError(
        e instanceof Error && e.message === 'not-deliverable'
          ? '아직 배송이 완료되지 않아 구매확정을 할 수 없어요.'
          : '구매확정에 실패했어요. 잠시 후 다시 시도해주세요.',
      );
    } finally {
      setConfirming(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tracking-modal-title"
          className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
        >
          <div className="flex items-center justify-between border-b border-[#EBE6DC] px-6 py-4">
            <div className="flex flex-col">
              <h2 id="tracking-modal-title" className="text-lg font-bold text-[#18231F]">
                배송조회
              </h2>
              <span className="mt-0.5 text-xs text-[#68716C]">{bundleTitle}</span>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              aria-label="닫기"
              className="rounded-full p-2 text-[#68716C] hover:bg-[#F8F6F0]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {/* 진행 타임라인 5단계 */}
            <ol className="mb-8 flex items-start justify-between">
              {TIMELINE_STEPS.map((step, i) => {
                const done = fill[i];
                const isCurrent = done && !fill[i + 1];
                return (
                  <li key={step} className="flex flex-1 flex-col items-center">
                    <div className="flex w-full items-center">
                      <span
                        className={`h-0.5 flex-1 ${i === 0 ? 'bg-transparent' : done ? 'bg-[#18231F]' : 'bg-[#E5E0D5]'}`}
                      />
                      <span
                        aria-current={isCurrent ? 'step' : undefined}
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${
                          done ? 'bg-[#18231F]' : 'border border-[#DED8CC] bg-white'
                        } ${isCurrent ? 'ring-4 ring-[#18231F]/10' : ''}`}
                      />
                      <span
                        className={`h-0.5 flex-1 ${i === TIMELINE_STEPS.length - 1 ? 'bg-transparent' : fill[i + 1] ? 'bg-[#18231F]' : 'bg-[#E5E0D5]'}`}
                      />
                    </div>
                    <span
                      className={`mt-2 text-center text-[11px] leading-tight ${
                        done ? 'font-semibold text-[#18231F]' : 'text-[#A29E93]'
                      }`}
                    >
                      {step}
                    </span>
                  </li>
                );
              })}
            </ol>

            {awaitingShipment && (
              <p className="mb-6 rounded-xl bg-[#F8F6F0] px-4 py-3 text-sm text-[#68716C]">
                판매자가 상품을 준비 중입니다. 송장이 등록되면 이곳에서 배송 현황을 확인할 수 있어요.
              </p>
            )}

            {/* 택배사 + 운송장번호 */}
            {trackingNumber ? (
              <div className="mb-6 rounded-xl border border-[#EBE6DC] bg-[#FBF9F4] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-xs text-[#68716C]">{carrierLabel ?? '택배사'}</span>
                    <span className="mt-0.5 font-mono text-sm font-semibold text-[#18231F]">
                      {trackingNumber}
                    </span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#DED8CC] bg-white px-3 py-2 text-xs font-semibold text-[#18231F] hover:bg-[#F8F6F0]"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? '복사됨' : '복사'}
                  </button>
                </div>
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#18231F] hover:underline"
                  >
                    택배사에서 배송조회
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ) : (
              !awaitingShipment && (
                <p className="mb-6 rounded-xl bg-[#F8F6F0] px-4 py-3 text-sm text-[#68716C]">
                  아직 등록된 운송장 정보가 없어요.
                </p>
              )
            )}

            {/* 브랜드 배송정책 */}
            <div className="rounded-xl border border-[#EBE6DC] p-4">
              <h3 className="mb-3 text-sm font-bold text-[#18231F]">배송·교환/반품 안내</h3>
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex gap-3">
                  <dt className="w-16 shrink-0 text-[#68716C]">배송비</dt>
                  <dd className="text-[#18231F]">{policy.shippingFeeLabel}</dd>
                </div>
                {policy.extraFeeNotice && (
                  <div className="flex gap-3">
                    <dt className="w-16 shrink-0 text-[#68716C]">추가비</dt>
                    <dd className="text-[#18231F]">{policy.extraFeeNotice}</dd>
                  </div>
                )}
                <div className="flex gap-3">
                  <dt className="w-16 shrink-0 text-[#68716C]">출고</dt>
                  <dd className="text-[#18231F]">{policy.dispatchEstimate}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-16 shrink-0 text-[#68716C]">교환/반품</dt>
                  <dd className="text-[#18231F]">{policy.returnPolicy}</dd>
                </div>
                {policy.returnExclusions && (
                  <div className="flex gap-3">
                    <dt className="w-16 shrink-0 text-[#68716C]">제한</dt>
                    <dd className="text-[#18231F]">{policy.returnExclusions}</dd>
                  </div>
                )}
                {policy.supportContact && (
                  <div className="flex gap-3">
                    <dt className="w-16 shrink-0 text-[#68716C]">문의</dt>
                    <dd className="text-[#18231F]">
                      {policy.supportContact}
                      {policy.supportHours ? ` (${policy.supportHours})` : ''}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* 구매확정 — 배송완료 상태의 브랜드 번들에서만 활성. 레거시(주문 단위)엔 노출하지 않는다. */}
          <div className="border-t border-[#EBE6DC] px-6 py-4">
            {confirmError && (
              <p role="alert" aria-live="polite" className="mb-3 text-sm text-[#8A5A3B]">
                {confirmError}
              </p>
            )}
            {isConfirmed ? (
              <div className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#F2EEE5] py-3.5 text-sm font-semibold text-[#18231F]">
                <PackageCheck className="h-4 w-4" />
                구매확정 완료
              </div>
            ) : brandId ? (
              <button
                onClick={handleConfirm}
                disabled={!canConfirm || confirming}
                className="w-full rounded-lg bg-[#14211C] py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {confirming ? '처리 중…' : '구매확정'}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="w-full rounded-lg border border-[#DED8CC] py-3.5 text-sm font-semibold text-[#18231F] transition-colors hover:bg-[#F8F6F0]"
              >
                확인
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
