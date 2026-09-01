import StaticLegalDocument from '@/components/legal/StaticLegalDocument';
import { PRIVACY_CONTENT } from '@/data/legalContent';

export const metadata = {
  title: '개인정보 처리방침 | 백조오브제',
  description: '백조오브제 개인정보 처리방침입니다.',
};

export default function PrivacyPage() {
  return <StaticLegalDocument document={PRIVACY_CONTENT} showCompany={false} />;
}
