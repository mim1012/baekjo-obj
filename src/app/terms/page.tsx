import StaticLegalDocument from '@/components/legal/StaticLegalDocument';
import { TERMS_CONTENT } from '@/data/legalContent';

export const metadata = {
  title: '이용약관 | 백조오브제',
  description: '백조오브제 전자상거래 이용약관입니다.',
};

export default function TermsPage() {
  return <StaticLegalDocument document={TERMS_CONTENT} showCompany />;
}
