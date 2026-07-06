import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { users } from '@/data/users';
import { orders } from '@/data/orders';
import { insuranceApplications } from '@/data/insuranceApplications';
import { formatDate } from '@/lib/format';

export default function AdminMembersPage() {
  const rows = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    pet: `${user.petType ?? '-'} / ${user.breed ?? '-'}`,
    orders: orders.filter((order) => order.phone === user.phone).length,
    insurance: insuranceApplications.filter((application) => application.phone === user.phone).length,
    status: user.status === 'inactive' ? '휴면' : '활성',
    joinedAt: formatDate(user.createdAt),
  }));

  return (
    <AdminResourcePage
      title="회원 관리"
      description="회원 상태와 주문, 보험 분석, 문의 이력을 한 화면에서 확인합니다."
      actionLabel="회원 등록"
      searchPlaceholder="이름, 이메일, 연락처 검색"
      filters={['전체 회원', '활성 회원', '휴면 회원']}
      columns={[
        { key: 'name', label: '회원명' },
        { key: 'email', label: '이메일' },
        { key: 'phone', label: '연락처' },
        { key: 'pet', label: '반려동물' },
        { key: 'orders', label: '주문' },
        { key: 'insurance', label: '보험 신청' },
        { key: 'status', label: '상태' },
        { key: 'joinedAt', label: '가입일' },
      ]}
      rows={rows}
      createFields={['이름', '이메일', '연락처', '회원 상태', '반려동물 종류', '품종', '주요 고민']}
    />
  );
}
