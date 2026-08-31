import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  FilePenLine,
  MousePointerClick,
  Save,
} from 'lucide-react';
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from '@/components/admin/AdminUi';

const QUICK_STEPS = [
  {
    icon: Eye,
    title: '1. 고객 화면부터 확인',
    description: '전체 화면 관리에서 바꾸려는 고객 화면을 검색하고 ‘고객 화면 보기’로 실제 위치를 확인합니다.',
  },
  {
    icon: MousePointerClick,
    title: '2. 관리 버튼으로 이동',
    description: '그 화면 카드에 있는 관리 버튼을 누릅니다. 메뉴 이름을 추측해서 찾을 필요가 없습니다.',
  },
  {
    icon: FilePenLine,
    title: '3. 설명을 읽고 작업',
    description: '입력칸 아래의 반영 위치와 용도를 확인한 뒤 등록·수정·순서 변경·숨김 중 필요한 작업만 합니다.',
  },
  {
    icon: Save,
    title: '4. 저장 후 다시 확인',
    description: '즉시 반영형은 저장 후, 게시형은 게시 후 고객 화면을 새로 열어 결과를 확인합니다.',
  },
];

const TASK_LINKS = [
  ['고객 화면의 문구·이미지를 바꾸고 싶어요', '전체 화면 관리', '/admin/pages', '화면 이름을 검색하면 정확한 관리 위치가 나옵니다.'],
  ['상품을 새로 등록하거나 가격·재고를 바꿔요', '상품 관리', '/admin/products', '상품 기본 정보와 상세페이지 내용을 관리합니다.'],
  ['상품 카드의 배변·생활·피부 같은 말을 바꿔요', '상품 태그', '/admin/products/tags', '상품 카드 배지와 스토어 고민 필터에 쓰는 단어입니다.'],
  ['상품의 베스트·추천·스토어 노출을 바꿔요', '상품 진열', '/admin/products/display', '이 세 가지 설정은 상품 수정이나 목록이 아니라 이 화면 한 곳에서만 바꿉니다.'],
  ['기존 브랜드의 내용이나 노출을 바꿔요', '브랜드', '/admin/brands', '목록에서 해당 브랜드의 ‘전체 수정’을 누르면 모든 내용을 한 화면에서 바꿀 수 있습니다.'],
  ['고민별 설명 글과 관련 상품을 바꿔요', '고민·케어 가이드', '/admin/concerns', '상품 카드 태그와 다른 콘텐츠입니다.'],
  ['홈 배너·바로가기·홈 문구를 바꿔요', '홈 화면', '/admin/settings', '임시저장 뒤 게시해야 고객에게 보이는 항목이 있습니다.'],
  ['주문 상태나 운송장을 처리해요', '주문·배송', '/admin/orders', '고객 주문 기록이므로 임의 삭제하지 않고 상태로 처리합니다.'],
  ['회원이나 입점업체 승인을 처리해요', '회원·승인', '/admin/members', '계정을 지우는 대신 승인·정지 같은 상태를 바꿉니다.'],
  ['상품 문의에 답변해요', '상품 문의 답변', '/admin/inquiries', '답변 저장 시 상품 상세와 고객 마이페이지에 반영됩니다.'],
  ['배송비·무료배송 기준을 바꿔요', '브랜드', '/admin/brands', '브랜드의 ‘전체 수정’ 안 배송 정책에서 바꾸며, 저장 뒤 장바구니에서 확인합니다.'],
  ['무통장 주문 자동취소 시간을 바꿔요', '무통장 자동취소', '/admin/order-policy', '자동취소 사용 여부와 입금대기 시간을 바꾸는 운영 설정입니다.'],
] as const;

const TERMS = [
  ['등록', '새 항목을 하나 만듭니다. 등록 버튼에 적힌 고객 화면에 새 내용이 추가됩니다.'],
  ['수정', '이미 있는 항목의 내용만 바꿉니다. 수정 창의 ‘반영 위치’를 먼저 확인합니다.'],
  ['순서', '고객 화면에서 보이는 위아래 위치를 바꿉니다. 내용 자체는 바뀌지 않습니다.'],
  ['노출 / 숨김', '삭제하지 않고 고객 화면에서 보이게 하거나 감춥니다. 다시 켤 가능성이 있으면 숨김을 사용합니다.'],
  ['삭제', '항목을 관리자와 연결된 고객 화면에서 제거합니다. 되돌릴 수 없으므로 다시 쓸 내용은 숨김을 선택합니다.'],
  ['임시저장', '관리자에만 저장된 상태입니다. 고객 화면은 아직 바뀌지 않습니다.'],
  ['게시', '임시저장한 최신 내용을 고객 화면에 공개합니다.'],
  ['즉시 반영', '저장 버튼을 누르는 순간 연결된 고객 화면에 적용됩니다.'],
] as const;

export default function AdminGuidePage() {
  return (
    <div className="space-y-8 pb-16">
      <AdminPageHeader
        eyebrow="FIRST EMPLOYEE GUIDE"
        title="관리자 사용 안내"
        description="처음 온 직원이 한 번 교육받은 뒤 혼자 운영할 수 있도록 만든 화면입니다. 작업은 항상 현재 고객 홈페이지 화면에서 시작하고, 홈페이지 자체의 디자인이나 내용을 임의로 다시 만들지 않습니다."
        actions={
          <Link href="/admin/pages" className="btn-primary min-h-11 gap-2 px-4">
            전체 화면 관리에서 시작 <ArrowRight className="size-4" />
          </Link>
        }
      />

      <div className="border border-[#C7D5C9] bg-[#EEF4EE] px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#2F7A4F]" />
          <div>
            <p className="text-balance text-sm font-bold text-[#24432F]">교육 결론: 아래 4단계를 한 번 실습하면 일상 운영을 시작할 수 있습니다.</p>
            <p className="mt-1 text-pretty text-xs leading-5 text-[#506057]">첫 교육에서는 상품 1개 수정, 태그 1개 등록, 화면 문구 1개 임시저장·게시, 테스트 항목 1개 숨김을 직접 해보면 됩니다.</p>
          </div>
        </div>
      </div>

      <AdminPanel title="모든 작업의 공통 순서" description="메뉴를 외우지 말고 이 순서만 지킵니다.">
        <div className="grid gap-px bg-[#E7E0D5] md:grid-cols-2 xl:grid-cols-4">
          {QUICK_STEPS.map(({ icon: Icon, title, description }) => (
            <article key={title} className="bg-white p-5 sm:p-6">
              <Icon className="size-5 text-[#A8742E]" />
              <h2 className="mt-4 text-balance text-sm font-bold text-[#17211D]">{title}</h2>
              <p className="mt-2 text-pretty text-xs leading-5 text-[#6F766F]">{description}</p>
            </article>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel title="하려는 일로 메뉴 찾기" description="왼쪽 메뉴 이름이 익숙하지 않아도 이 표에서 바로 이동할 수 있습니다.">
        <div className="divide-y divide-[#E7E0D5]">
          {TASK_LINKS.map(([task, menu, href, explanation]) => (
            <div key={task} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_auto] sm:items-center sm:px-6">
              <div>
                <p className="text-pretty text-sm font-semibold text-[#17211D]">{task}</p>
                <p className="mt-1 text-pretty text-xs leading-5 text-[#6F766F]">{explanation}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8A918B]">이동할 메뉴</span>
                <AdminStatusBadge tone="neutral">{menu}</AdminStatusBadge>
              </div>
              <Link href={href} className="btn-secondary min-h-10 gap-2 px-3 text-xs">
                열기 <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </AdminPanel>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPanel title="버튼과 상태의 정확한 뜻" description="어디에 반영되는지는 각 관리 화면 상단과 입력칸 아래에도 표시됩니다.">
          <dl className="divide-y divide-[#E7E0D5]">
            {TERMS.map(([term, meaning]) => (
              <div key={term} className="grid gap-1 px-5 py-4 sm:grid-cols-[100px_1fr] sm:gap-4 sm:px-6">
                <dt className="text-sm font-bold text-[#17211D]">{term}</dt>
                <dd className="text-pretty text-xs leading-5 text-[#6F766F]">{meaning}</dd>
              </div>
            ))}
          </dl>
        </AdminPanel>

        <div className="space-y-6">
          <AdminPanel title="헷갈리기 쉬운 상품 용어" description="이 두 가지는 서로 다른 곳에 사용됩니다.">
            <div className="divide-y divide-[#E7E0D5]">
              <div className="px-5 py-4 sm:px-6">
                <p className="text-sm font-bold text-[#17211D]">상품 카드 고민 태그</p>
                <p className="mt-1 text-pretty text-xs leading-5 text-[#6F766F]">배변·생활·피부처럼 상품 카드 가격 아래에 보이는 짧은 말입니다. ‘상품 태그’ 메뉴에서 단어를 만들고 상품에서 선택합니다.</p>
              </div>
              <div className="px-5 py-4 sm:px-6">
                <p className="text-sm font-bold text-[#17211D]">고민·케어 가이드</p>
                <p className="mt-1 text-pretty text-xs leading-5 text-[#6F766F]">고민 목록·상세 화면의 설명 글, 확인 증상, 질문과 답변, 관련 상품을 뜻합니다.</p>
              </div>
            </div>
          </AdminPanel>

          <div className="border border-[#E0C9A5] bg-[#F8F1E5] px-5 py-5 sm:px-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#A8742E]" />
              <div>
                <h2 className="text-balance text-sm font-bold text-[#6D4B1F]">삭제보다 숨김을 먼저 생각합니다</h2>
                <p className="mt-2 text-pretty text-xs leading-5 text-[#775F3D]">상품·브랜드·콘텐츠는 다시 사용할 수 있으면 숨김으로 처리합니다. 주문·회원·고객 문의는 운영 기록이므로 임의 삭제하지 않고 상태 변경이나 답변으로 처리합니다.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AdminPanel title="첫 교육 완료 확인" description="아래 다섯 가지를 혼자 설명하고 직접 할 수 있으면 인수인계가 끝난 상태입니다.">
        <ul className="grid gap-px bg-[#E7E0D5] sm:grid-cols-2 xl:grid-cols-5">
          {[
            '전체 화면 관리에서 원하는 고객 화면 찾기',
            '상품 1개를 수정하고 반영 화면 확인하기',
            '상품 태그와 케어 가이드 차이 설명하기',
            '임시저장과 게시, 즉시 반영 차이 설명하기',
            '삭제 대신 숨김을 써야 하는 경우 판단하기',
          ].map((item) => (
            <li key={item} className="flex gap-3 bg-white p-5 text-pretty text-xs font-semibold leading-5 text-[#4F5751]">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#2F7A4F]" /> {item}
            </li>
          ))}
        </ul>
      </AdminPanel>
    </div>
  );
}
