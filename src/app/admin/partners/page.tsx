import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { Partner } from '@/types';

const mockPartners: Partner[] = [
  {
    id: 'pt1',
    name: '서울 동물 메디컬센터',
    type: 'hospital',
    contactPerson: '김원장',
    phone: '02-1234-5678',
    address: '서울시 강남구',
    cooperationType: '병원 케어 키트 비치',
    providedKits: ['k1'],
    status: '운영중',
    isContracted: true,
    isDelivered: true,
  },
  {
    id: 'pt2',
    name: '펫프렌들리 호텔 마리나',
    type: 'etc',
    contactPerson: '이매니저',
    phone: '032-987-6543',
    address: '인천시 중구',
    cooperationType: '투숙객 웰컴 키트',
    providedKits: ['k1'],
    status: '상담중',
    isContracted: false,
    isDelivered: false,
  },
];

export default function AdminPartnersPage() {
  return (
    <AdminResourcePage
      title="B2B 제휴 관리"
      description="제휴 병원, 호텔 등 B2B 파트너십을 관리하고 키트 제공 현황을 파악합니다."
      actionLabel="제휴처 등록"
      searchPlaceholder="제휴처명, 담당자 검색"
      filters={['전체 유형', '동물병원', '호텔/리조트', '활성', '대기중']}
      columns={[
        { key: 'name', label: '제휴처명' },
        { key: 'type', label: '분류' },
        { key: 'cooperationType', label: '제휴 형태' },
        { key: 'contact', label: '담당자/연락처' },
        { key: 'status', label: '상태' },
      ]}
      rows={mockPartners.map((partner) => ({
        id: partner.id,
        name: partner.name,
        type: partner.type === 'hospital' ? '동물병원' : '호텔',
        cooperationType: partner.cooperationType,
        contact: `${partner.contactPerson} (${partner.phone})`,
        status: partner.status === '운영중' ? '활성' : partner.status === '상담중' ? '대기' : '종료',
      }))}
      createFields={['제휴처명', '분류', '제휴 형태', '담당자', '연락처', '주소', '제공 키트', '상태']}
    />
  );
}
