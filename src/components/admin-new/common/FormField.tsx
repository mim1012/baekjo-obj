'use client';

import React, { ReactNode } from 'react';

/**
 * 여러 관리자 폼에서 반복되는 모호한 용어의 공통 설명.
 * 화면별 설명을 직접 넘기면 그 설명을 우선하고, 없을 때만 이 안내를 보여준다.
 */
const COMMON_FIELD_HELP: Record<string, string> = {
  '스토어 카테고리': '스토어 목록의 분류와 카테고리 필터에 사용됩니다.',
  '라이프스타일 분류': '홈·추천 영역에서 상품을 묶는 기준입니다. 스토어 카테고리와는 별개입니다.',
  '판매가 (원)': '할인 전 기준 가격입니다. 고객 상품 카드와 상세 화면에 표시됩니다.',
  '할인가 (원)': '입력하면 고객에게 실제 판매할 할인 가격으로 표시됩니다. 할인하지 않으면 비워둡니다.',
  '재고 (개)': '0이 되면 품절로 처리됩니다. 실제 판매 가능한 수량을 입력합니다.',
  '배송비 (원)': '이 상품에 적용할 기본 배송비입니다. 0은 무료배송입니다.',
  '적립률 (%)': '상품 금액 중 적립할 비율입니다. 배송비는 계산에서 제외됩니다.',
  '진열 순서': '숫자가 작을수록 고객 브랜드 화면에서 먼저 보입니다.',
  '계정 상태': '활성은 정상 이용, 정지는 로그인을 제한합니다. 회원 기록 자체는 삭제하지 않습니다.',
  '상담 진행 상태': '보험 상담 신청의 현재 처리 단계를 기록합니다.',
  '고객 연락 여부': '담당자가 고객에게 실제로 연락했는지 표시합니다.',
  '관리자 메모': '고객에게 공개되지 않는 내부 업무 기록입니다.',
  '택배사': '고객 배송조회에 사용할 실제 택배사를 선택합니다.',
  '운송장 번호': '택배사가 발급한 번호를 그대로 입력합니다. 저장하면 고객 주문 화면에도 표시됩니다.',
  '택배사 · 운송장 번호': '배송중으로 바꾸기 전에 택배사와 운송장 번호를 함께 입력합니다.',
  '기본 택배사': '이 브랜드 상품에 기본으로 선택할 실제 배송 업체입니다.',
  '표시용 배송사': '고객 화면에 보여줄 배송사 문구입니다. 실제 배송조회용 택배사와 다를 수 있습니다.',
  '배송비': '이 브랜드 상품에 기본 적용할 배송비입니다.',
  '무료배송 기준': '한 주문의 상품 금액이 이 금액 이상이면 배송비를 0원으로 계산합니다.',
};

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: ReactNode;
  layout?: 'vertical' | 'horizontal';
  className?: string;
}

export default function FormField({ 
  label, 
  htmlFor, 
  required, 
  description, 
  error, 
  children,
  layout = 'vertical',
  className = ''
}: FormFieldProps) {
  const helpText = description ?? COMMON_FIELD_HELP[label];
  
  if (layout === 'horizontal') {
    return (
      <div className={`sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start border-b border-gray-100 pb-6 last:border-0 last:pb-0 ${className}`}>
        <label 
          htmlFor={htmlFor} 
          className="block text-[14px] font-medium text-[#17201B] sm:pt-2"
        >
          {label}
          {required && <span className="text-[#A65348] ml-1">*</span>}
        </label>
        <div className="mt-2 sm:mt-0 sm:col-span-2">
          {children}
          {helpText && (
            <p className="mt-2 text-pretty text-[13px] leading-5 text-gray-500">{helpText}</p>
          )}
          {error && (
            <p id={htmlFor ? `${htmlFor}-error` : undefined} className="mt-2 text-[13px] text-[#A65348] font-medium">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-6 last:mb-0 ${className}`}>
      <label 
        htmlFor={htmlFor} 
        className="block text-[14px] font-medium text-[#17201B] mb-2"
      >
        {label}
        {required && <span className="text-[#A65348] ml-1">*</span>}
      </label>
      {children}
      {helpText && (
        <p className="mt-2 text-pretty text-[13px] leading-5 text-gray-500">{helpText}</p>
      )}
      {error && (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} className="mt-2 text-[13px] text-[#A65348] font-medium">{error}</p>
      )}
    </div>
  );
}
