'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, X } from 'lucide-react';
import type { Brand, BrandShippingPolicy } from '@/types';
import { updateBrand, type UpdateBrandInput } from '@/lib/storage';
import {
  buildBrandDetailPayload,
  validateDisplayOrder,
  validateAuditReportForm,
  emptyAuditReportForm,
  emptyAuditReportFields,
  auditReportFillState,
  canClearAuditReport,
  type AuditReportFormState,
} from '@/lib/brands/formPayload';
import { CARRIER_CODES, CARRIER_LABELS, type CarrierCode } from '@/lib/carriers';

/** sourceUrls 서버 상한(validate.ts MAX_SOURCE_URLS)과 동일. 초과 입력을 클라에서 막는다. */
const MAX_SOURCE_URLS = 20;
const SHIPPING_MONEY_FIELDS = [
  'shippingFee',
  'freeShippingThreshold',
  'returnShippingFee',
  'exchangeShippingFee',
] as const;

import PageHeader from '@/components/admin-new/common/PageHeader';
import FormField from '@/components/admin-new/common/FormField';
import ImageUploader from '@/components/admin-new/common/ImageUploader';

interface Option {
  id: string;
  name: string;
}
interface ConcernOption {
  slug: string;
  title: string;
}

interface BrandDetailEditorProps {
  initialBrand: Brand;
  brandProducts: Option[];
  concerns: ConcernOption[];
}

const INPUT_CLASS =
  'w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B] outline-none';

/** 서버 auditReport(없을 수 있음)를 폼 상태로. 없으면 빈 폼(=플레이스홀더 상태). */
function toAuditReportForm(report: Brand['auditReport']): AuditReportFormState {
  if (!report) return emptyAuditReportForm();
  return {
    reportNo: report.reportNo ?? '',
    auditedAt: report.auditedAt ?? '',
    status: report.status ?? '',
    headline: report.headline ?? '',
    summaryTitle: report.summaryTitle ?? '',
    summary: report.summary ?? '',
    selectionReason: report.selectionReason ?? '',
    process: Array.isArray(report.process) ? [...report.process] : [],
  };
}

function optionalNumberInput(value: string): number | undefined {
  return value === '' ? undefined : Number(value);
}

function hasInvalidShippingMoney(shipping: BrandShippingPolicy): boolean {
  return SHIPPING_MONEY_FIELDS.some((field) => {
    const value = shipping[field];
    return value !== undefined && (!Number.isFinite(value) || value < 0);
  });
}

export default function BrandDetailEditor({
  initialBrand,
  brandProducts,
  concerns,
}: BrandDetailEditorProps) {
  const router = useRouter();

  // 기본 필드(모달과 동일 범위) — 상세는 전 필드 에디터라 이것도 편집한다.
  const [name, setName] = useState(initialBrand.name ?? '');
  const [logo, setLogo] = useState(initialBrand.logo ?? '');
  const [description, setDescription] = useState(initialBrand.description ?? '');
  const [philosophy, setPhilosophy] = useState(initialBrand.philosophy ?? '');
  const [auditGrade, setAuditGrade] = useState<Brand['auditGrade']>(initialBrand.auditGrade ?? 'A+');
  const [officialUrl, setOfficialUrl] = useState(initialBrand.officialUrl ?? '');
  const [isRecommended, setIsRecommended] = useState(initialBrand.isRecommended ?? false);
  const [isVisible, setIsVisible] = useState(initialBrand.isVisible !== false);
  const [isNew, setIsNew] = useState(initialBrand.isNew ?? false);
  const [displayOrder, setDisplayOrder] = useState<number | undefined>(initialBrand.displayOrder);

  // 대형 필드(S5에서 봉인 → 상세에서 개방).
  const [auditReport, setAuditReport] = useState<AuditReportFormState>(() =>
    toAuditReportForm(initialBrand.auditReport),
  );
  const [shipping, setShipping] = useState<BrandShippingPolicy>(() => ({ ...initialBrand.shipping }));
  const [representativeProductIds, setRepresentativeProductIds] = useState<string[]>(
    initialBrand.representativeProductIds ?? [],
  );
  const [relatedConcernSlugs, setRelatedConcernSlugs] = useState<string[]>(
    initialBrand.relatedConcernSlugs ?? [],
  );
  const [auditPoints, setAuditPoints] = useState<string[]>(initialBrand.auditPoints ?? []);
  const [sourceUrls, setSourceUrls] = useState<string[]>(initialBrand.sourceUrls ?? []);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);

  // 저장 실패 시 에러 배너로 스크롤·포커스 — 대형 폼(pb-24)에서 맨 위 배너가 뷰포트 밖이라
  // 사용자가 실패를 놓치는 문제 해소. 모든 setError 경로에 자동 적용된다.
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
      errorRef.current.focus();
    }
  }, [error]);

  // 감사 보고서 채움 상태 — 부분 입력 시 어느 필드가 비었는지 per-field 로 표시한다.
  const auditFill = auditReportFillState(auditReport);
  const emptyReportFields =
    auditFill === 'partial'
      ? new Set<keyof AuditReportFormState>(emptyAuditReportFields(auditReport))
      : new Set<keyof AuditReportFormState>();
  const fieldError = (key: keyof AuditReportFormState): string | undefined =>
    emptyReportFields.has(key) ? '이 항목을 채워주세요(전부 채우거나 전부 비우기).' : undefined;

  const setReportField = (field: keyof AuditReportFormState, value: string) => {
    setAuditReport((prev) => ({ ...prev, [field]: value }));
  };

  const setShippingField = <K extends keyof BrandShippingPolicy>(
    field: K,
    value: BrandShippingPolicy[K],
  ) => {
    setShipping((prev) => ({ ...prev, [field]: value }));
  };

  const toggleId = (list: string[], id: string): string[] =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return setError('브랜드명을 입력해주세요.');
    if (!description.trim()) return setError('브랜드 소개를 입력해주세요.');

    const orderError = validateDisplayOrder(displayOrder);
    if (orderError) return setError(orderError);

    if (hasInvalidShippingMoney(shipping)) {
      return setError('배송비·교환/반품비·무료배송 기준은 0원 이상의 숫자로 입력해주세요.');
    }

    // auditReport 는 "전부 채우거나 전부 비우거나"만 유효(서버 validate 가 8필드 전부 요구).
    // 부분 입력이면 여기서 사람 말로 막아 서버 400 을 예방한다.
    const reportError = validateAuditReportForm(auditReport);
    if (reportError) return setError(reportError);

    // 계약 한계(§4): 이미 있는 보고서를 이 화면에서 비워도 서버가 실제로 지우지 못한다
    // (validate 가 auditReport:null 을 거부 + undefined 는 JSON 에서 드롭돼 기존 값 보존).
    // 안내문의 "전부 비우면 플레이스홀더" 약속이 거짓이 되므로 그 시도만 차단한다.
    // 완전 해법(validate 가 null 수용)은 별도 contract PR.
    if (!canClearAuditReport(!!initialBrand.auditReport, auditReportFillState(auditReport))) {
      return setError(
        '기존 감사 보고서는 이 화면에서 비울 수 없습니다(지우기 기능 준비 중). 내용을 수정하거나 그대로 두세요.',
      );
    }

    setIsSaving(true);
    setError(null);

    try {
      // 전 필드 명시 화이트리스트(암묵 스프레드 금지). auditReport 전무 시 undefined → 플레이스백.
      const payload = buildBrandDetailPayload({
        name,
        logo,
        description,
        philosophy,
        auditGrade,
        officialUrl,
        isRecommended,
        isVisible,
        isNew,
        displayOrder,
        auditReport,
        representativeProductIds,
        relatedConcernSlugs,
        auditPoints,
        sourceUrls,
        shipping,
      });

      const { error: updateError } = await updateBrand(
        initialBrand.id,
        payload as UpdateBrandInput,
      );
      if (updateError) throw new Error(updateError);

      router.push('/admin/brands');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title={`${initialBrand.name} · 상세 편집`}
        description="감사 보고서·대표상품·연관 고민 등 전 필드를 편집합니다. 빠른 편집은 목록의 수정 아이콘(모달)을 이용하세요."
      >
        <button
          type="button"
          onClick={() => router.push('/admin/brands')}
          className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded text-[13px] font-medium hover:bg-gray-50"
        >
          <ArrowLeft size={16} />
          목록으로
        </button>
      </PageHeader>

      {error && (
        <div
          ref={errorRef}
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
          className="p-3 bg-red-50 text-red-600 rounded border border-red-200 text-[13px] font-medium outline-none"
        >
          {error}
        </div>
      )}

      <form id="brand-detail-form" onSubmit={handleSubmit} className="space-y-8">
        {/* ── 기본 정보 ── */}
        <section className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
          <h2 className="text-[15px] font-semibold text-[#17201B] mb-4">기본 정보</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1">
              <FormField label="브랜드 로고">
                <ImageUploader
                  value={logo || ''}
                  onChange={(url) => setLogo(url)}
                  domain="brand"
                  usage="logo"
                  entityId={initialBrand.id}
                  aspectRatio="1/1"
                  height="160px"
                />
              </FormField>
            </div>

            <div className="col-span-2 space-y-4">
              <FormField label="브랜드명" required htmlFor="bd-name">
                <input
                  id="bd-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="예: 지위픽"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="검증 등급" htmlFor="bd-grade">
                  <select
                    id="bd-grade"
                    value={auditGrade ?? 'A+'}
                    onChange={(e) => setAuditGrade(e.target.value as Brand['auditGrade'])}
                    className={INPUT_CLASS}
                  >
                    <option value="A+">A+ 등급</option>
                    <option value="A">A 등급</option>
                    <option value="B+">B+ 등급</option>
                    <option value="B">B 등급</option>
                  </select>
                </FormField>

                <FormField label="공식몰 URL" htmlFor="bd-official">
                  <input
                    id="bd-official"
                    type="url"
                    value={officialUrl}
                    onChange={(e) => setOfficialUrl(e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="https://"
                  />
                </FormField>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <FormField label="한 줄 소개" required htmlFor="bd-desc">
              <textarea
                id="bd-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${INPUT_CLASS} h-20 resize-none`}
                placeholder="브랜드관에 표시할 간단한 소개"
              />
            </FormField>

            <FormField label="브랜드 철학 및 스토리" htmlFor="bd-philosophy">
              <textarea
                id="bd-philosophy"
                value={philosophy}
                onChange={(e) => setPhilosophy(e.target.value)}
                className={`${INPUT_CLASS} h-32 resize-none`}
                placeholder="상세한 브랜드 스토리와 철학을 입력하세요."
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ToggleCard
                label="브랜드관 추천 노출"
                hint="추천 영역에 노출"
                checked={isRecommended}
                onChange={setIsRecommended}
              />
              <ToggleCard
                label="브랜드관 노출"
                hint="해제 시 숨김"
                checked={isVisible}
                onChange={setIsVisible}
              />
              <ToggleCard
                label="신규 브랜드 뱃지"
                hint="'새로 만난 브랜드' 필터"
                checked={isNew}
                onChange={setIsNew}
              />
            </div>

            <FormField label="진열 순서" htmlFor="bd-order">
              <input
                id="bd-order"
                type="number"
                value={displayOrder ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setDisplayOrder(v === '' ? undefined : Number(v));
                }}
                min={0}
                step={1}
                className={INPUT_CLASS}
                placeholder="낮을수록 먼저 노출 (미입력 시 뒤로)"
              />
            </FormField>
          </div>
        </section>

        {/* ── 배송/출고/교환 정책 ── */}
        <section className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
          <h2 className="text-[15px] font-semibold text-[#17201B] mb-1">배송/출고/교환 정책</h2>
          <p className="text-[13px] text-gray-500 mb-4">
            브랜드 기본 배송 정책입니다. 빈 텍스트 항목은 저장 시 자동 제거됩니다.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="기본 택배사" htmlFor="ship-carrier">
              <select
                id="ship-carrier"
                value={shipping.defaultCarrier ?? ''}
                onChange={(e) =>
                  setShippingField(
                    'defaultCarrier',
                    e.target.value === '' ? undefined : (e.target.value as CarrierCode),
                  )
                }
                className={INPUT_CLASS}
              >
                <option value="">선택 안 함</option>
                {CARRIER_CODES.map((carrier) => (
                  <option key={carrier} value={carrier}>
                    {CARRIER_LABELS[carrier]}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="출고 예정" htmlFor="ship-dispatch">
              <input
                id="ship-dispatch"
                type="text"
                value={shipping.dispatchEstimate ?? ''}
                onChange={(e) => setShippingField('dispatchEstimate', e.target.value)}
                className={INPUT_CLASS}
                placeholder="예: 결제 후 1~2영업일"
              />
            </FormField>

            <FormField label="배송비" htmlFor="ship-fee">
              <input
                id="ship-fee"
                type="number"
                min={0}
                step={1}
                value={shipping.shippingFee ?? ''}
                onChange={(e) => setShippingField('shippingFee', optionalNumberInput(e.target.value))}
                className={INPUT_CLASS}
                placeholder="예: 3000"
              />
            </FormField>

            <FormField label="무료배송 기준" htmlFor="ship-free-threshold">
              <input
                id="ship-free-threshold"
                type="number"
                min={0}
                step={1}
                value={shipping.freeShippingThreshold ?? ''}
                onChange={(e) =>
                  setShippingField('freeShippingThreshold', optionalNumberInput(e.target.value))
                }
                className={INPUT_CLASS}
                placeholder="예: 50000"
              />
            </FormField>

            <FormField label="반품 배송비" htmlFor="ship-return-fee">
              <input
                id="ship-return-fee"
                type="number"
                min={0}
                step={1}
                value={shipping.returnShippingFee ?? ''}
                onChange={(e) =>
                  setShippingField('returnShippingFee', optionalNumberInput(e.target.value))
                }
                className={INPUT_CLASS}
                placeholder="예: 3000"
              />
            </FormField>

            <FormField label="교환 배송비" htmlFor="ship-exchange-fee">
              <input
                id="ship-exchange-fee"
                type="number"
                min={0}
                step={1}
                value={shipping.exchangeShippingFee ?? ''}
                onChange={(e) =>
                  setShippingField('exchangeShippingFee', optionalNumberInput(e.target.value))
                }
                className={INPUT_CLASS}
                placeholder="예: 6000"
              />
            </FormField>
          </div>

          <div className="mt-4 space-y-4">
            <FormField label="반품/교환 주소" htmlFor="ship-return-address">
              <textarea
                id="ship-return-address"
                value={shipping.returnAddress ?? ''}
                onChange={(e) => setShippingField('returnAddress', e.target.value)}
                className={`${INPUT_CLASS} h-20 resize-none`}
                placeholder="반품·교환 수령 주소"
              />
            </FormField>

            <FormField label="A/S 안내" htmlFor="ship-as-notice">
              <textarea
                id="ship-as-notice"
                value={shipping.asNotice ?? ''}
                onChange={(e) => setShippingField('asNotice', e.target.value)}
                className={`${INPUT_CLASS} h-24 resize-none`}
                placeholder="제품 하자·A/S 접수 기준과 안내 문구"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="고객지원 연락처" htmlFor="ship-support-contact">
                <input
                  id="ship-support-contact"
                  type="text"
                  value={shipping.supportContact ?? ''}
                  onChange={(e) => setShippingField('supportContact', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="예: 010-0000-0000 / help@example.com"
                />
              </FormField>

              <FormField label="고객지원 시간" htmlFor="ship-support-hours">
                <input
                  id="ship-support-hours"
                  type="text"
                  value={shipping.supportHours ?? ''}
                  onChange={(e) => setShippingField('supportHours', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="예: 평일 10:00~17:00"
                />
              </FormField>
            </div>
          </div>
        </section>
        {/* ── 감사 보고서 ── */}
        <section className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
          <h2 className="text-[15px] font-semibold text-[#17201B] mb-1">감사 보고서</h2>
          <p className="text-[13px] text-gray-500 mb-4">
            8개 항목(단계 포함)을 <strong>모두 채우거나 모두 비워</strong> 주세요. 일부만 입력하면
            저장되지 않습니다.{' '}
            {initialBrand.auditReport ? (
              <>
                이미 등록된 보고서라 <strong>비우기는 이 화면에서 지원되지 않습니다</strong>(준비 중).
                내용을 수정하거나 그대로 두세요.
              </>
            ) : (
              <>전부 비우면 공개 상세에 &lsquo;확인 중&rsquo; 플레이스홀더가 표시됩니다.</>
            )}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="보고서 번호" htmlFor="ar-reportNo" error={fieldError('reportNo')}>
              <input id="ar-reportNo" type="text" value={auditReport.reportNo}
                onChange={(e) => setReportField('reportNo', e.target.value)} className={INPUT_CLASS} placeholder="예: BOA-2026-001" />
            </FormField>
            <FormField label="감사 일자" htmlFor="ar-auditedAt" error={fieldError('auditedAt')}>
              <input id="ar-auditedAt" type="text" value={auditReport.auditedAt}
                onChange={(e) => setReportField('auditedAt', e.target.value)} className={INPUT_CLASS} placeholder="예: 2026-01-15" />
            </FormField>
            <FormField label="상태" htmlFor="ar-status" error={fieldError('status')}>
              <input id="ar-status" type="text" value={auditReport.status}
                onChange={(e) => setReportField('status', e.target.value)} className={INPUT_CLASS} placeholder="예: 검증 완료" />
            </FormField>
            <FormField label="헤드라인" htmlFor="ar-headline" error={fieldError('headline')}>
              <input id="ar-headline" type="text" value={auditReport.headline}
                onChange={(e) => setReportField('headline', e.target.value)} className={INPUT_CLASS} placeholder="한 줄 요약 제목" />
            </FormField>
          </div>
          <div className="mt-4 space-y-4">
            <FormField label="요약 제목" htmlFor="ar-summaryTitle" error={fieldError('summaryTitle')}>
              <input id="ar-summaryTitle" type="text" value={auditReport.summaryTitle}
                onChange={(e) => setReportField('summaryTitle', e.target.value)} className={INPUT_CLASS} />
            </FormField>
            <FormField label="요약 본문" htmlFor="ar-summary" error={fieldError('summary')}>
              <textarea id="ar-summary" value={auditReport.summary}
                onChange={(e) => setReportField('summary', e.target.value)} className={`${INPUT_CLASS} h-24 resize-none`} />
            </FormField>
            <FormField label="선정 이유" htmlFor="ar-selectionReason" error={fieldError('selectionReason')}>
              <textarea id="ar-selectionReason" value={auditReport.selectionReason}
                onChange={(e) => setReportField('selectionReason', e.target.value)} className={`${INPUT_CLASS} h-24 resize-none`} />
            </FormField>
            <FormField label="검증 과정(단계)" error={fieldError('process')}>
              <ArrayEditor
                items={auditReport.process}
                onChange={(next) => setAuditReport((prev) => ({ ...prev, process: next }))}
                placeholder="예: 성분 분석 → 현장 실사 → 최종 승인"
                addLabel="단계 추가"
                itemLabel="검증 과정 단계"
              />
            </FormField>
          </div>
        </section>

        {/* ── 대표상품 ── */}
        <section className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
          <h2 className="text-[15px] font-semibold text-[#17201B] mb-1">대표상품</h2>
          <p className="text-[13px] text-gray-500 mb-4">이 브랜드 상품 중 대표로 노출할 항목을 선택합니다.</p>
          {brandProducts.length === 0 ? (
            <p className="text-[13px] text-gray-400">이 브랜드에 등록된 상품이 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {brandProducts.map((p) => {
                const active = representativeProductIds.includes(p.id);
                return (
                  <ChipToggle
                    key={p.id}
                    label={p.name}
                    active={active}
                    onClick={() => setRepresentativeProductIds((prev) => toggleId(prev, p.id))}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* ── 연관 고민 ── */}
        <section className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
          <h2 className="text-[15px] font-semibold text-[#17201B] mb-1">연관 고민</h2>
          <p className="text-[13px] text-gray-500 mb-4">이 브랜드와 연결할 반려동물 고민을 선택합니다.</p>
          <div className="flex flex-wrap gap-2">
            {concerns.map((c) => {
              const active = relatedConcernSlugs.includes(c.slug);
              return (
                <ChipToggle
                  key={c.slug}
                  label={c.title}
                  active={active}
                  onClick={() => setRelatedConcernSlugs((prev) => toggleId(prev, c.slug))}
                />
              );
            })}
          </div>
        </section>

        {/* ── 검증 포인트 · 근거 출처 ── */}
        <section className="bg-white border border-gray-200 rounded-md shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-[15px] font-semibold text-[#17201B] mb-1">검증 포인트</h2>
            <p className="text-[13px] text-gray-500 mb-4">브랜드 검증에서 강조할 항목(빈 항목은 저장 시 자동 제거).</p>
            <ArrayEditor
              items={auditPoints}
              onChange={setAuditPoints}
              placeholder="예: 무방부제 원료 사용"
              addLabel="포인트 추가"
              itemLabel="검증 포인트"
            />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-[#17201B] mb-1">근거 출처 URL</h2>
            <p className="text-[13px] text-gray-500 mb-4">검증 근거가 되는 링크(최대 {MAX_SOURCE_URLS}개, 빈 항목은 자동 제거).</p>
            <ArrayEditor
              items={sourceUrls}
              onChange={setSourceUrls}
              placeholder="https://"
              addLabel="출처 추가"
              itemLabel="근거 출처"
              maxItems={MAX_SOURCE_URLS}
            />
          </div>
        </section>
      </form>

      <div className="sticky bottom-0 z-10 -mb-24 flex justify-end gap-3 border-t border-gray-200 bg-[#F9F8F3] py-4">
        <button
          type="button"
          onClick={() => router.push('/admin/brands')}
          disabled={isSaving}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-[13px] font-medium rounded hover:bg-white disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="submit"
          form="brand-detail-form"
          disabled={isSaving}
          className="px-6 py-2 bg-[#17201B] text-white text-[13px] font-medium rounded hover:bg-[#2F3B34] disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving && <Loader2 size={14} className="animate-spin" />}
          저장
        </button>
      </div>
    </div>
  );
}

/* ── 소형 하위 컴포넌트(어스톤 스타일 유지) ── */

function ToggleCard({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 text-[#17201B] border-gray-300 rounded focus:ring-[#17201B]"
      />
      <div>
        <span className="text-[13px] font-medium text-[#17201B] block">{label}</span>
        <span className="text-[12px] text-gray-500">{hint}</span>
      </div>
    </label>
  );
}

function ChipToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
        active
          ? 'bg-[#17201B] text-white border-[#17201B]'
          : 'bg-white text-gray-600 border-gray-300 hover:border-[#17201B]'
      }`}
    >
      {label}
    </button>
  );
}

function ArrayEditor({
  items,
  onChange,
  placeholder,
  addLabel,
  itemLabel,
  maxItems,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel: string;
  /** 스크린리더용 항목 라벨. `${itemLabel} N` 으로 각 input 의 aria-label 이 된다. */
  itemLabel?: string;
  /** 클라 상한(서버와 동일값). 도달 시 추가 버튼 disabled. */
  maxItems?: number;
}) {
  const update = (idx: number, value: string) => {
    onChange(items.map((item, i) => (i === idx ? value : item)));
  };
  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };
  const add = () => onChange([...items, '']);

  const atMax = maxItems !== undefined && items.length >= maxItems;
  // 마지막 항목이 빈 문자열이면 추가 연타로 빈 행이 쌓이므로 막는다(LOW).
  const lastEmpty = items.length > 0 && items[items.length - 1].trim() === '';
  const addDisabled = atMax || lastEmpty;

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        // 배열 인덱스 key — 이 에디터는 append/remove만 있고 재정렬이 없어 인덱스가 안정적이다.
        <div key={idx} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => update(idx, e.target.value)}
            className={INPUT_CLASS}
            placeholder={placeholder}
            aria-label={itemLabel ? `${itemLabel} ${idx + 1}` : undefined}
          />
          <button
            type="button"
            onClick={() => remove(idx)}
            aria-label={itemLabel ? `${itemLabel} ${idx + 1} 삭제` : '항목 삭제'}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={addDisabled}
        className="flex items-center gap-1.5 text-[13px] font-medium text-[#17201B] hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
      >
        <Plus size={14} />
        {addLabel}
      </button>
      {atMax && (
        <p className="text-[12px] text-gray-400">최대 {maxItems}개까지 추가할 수 있습니다.</p>
      )}
    </div>
  );
}
