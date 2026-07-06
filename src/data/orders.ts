import { Order } from '@/types';

export const orders: Order[] = [
  {
    id: 'ORD-20231220-0001',
    customerName: '김민수',
    phone: '010-1234-5678',
    address: '서울특별시 강남구 테헤란로 123, 101동 202호',
    items: [
      {
        productId: 'p1',
        productName: '백조오브제 저알러지 가수분해 연어 사료 1.5kg',
        optionName: '2개 세트 (3kg) - 5% 추가 할인',
        quantity: 1,
        price: 25000,
      }
    ],
    totalPrice: 25000,
    deliveryFee: 3000,
    paymentMethod: '신용카드',
    orderStatus: '배송완료',
    paymentStatus: '결제완료',
    deliveryStatus: '배송완료',
    trackingNumber: 'CJ1234567890',
    createdAt: '2023-12-20T14:30:00Z'
  },
  {
    id: 'ORD-20240102-0042',
    customerName: '이지은',
    phone: '010-9876-5432',
    address: '경기도 성남시 분당구 판교역로 456, 카카오빌딩 15층',
    items: [
      {
        productId: 'p3',
        productName: '포마이펫 조인트 릴리프 영양제 60정',
        optionName: '1개월분 (60정)',
        quantity: 2,
        price: 39000,
      },
      {
        productId: 'p11',
        productName: '바잇미 닭가슴살 동결건조 트릿 150g',
        quantity: 1,
        price: 16000,
      }
    ],
    totalPrice: 94000,
    deliveryFee: 0,
    paymentMethod: '무통장입금',
    orderStatus: '배송준비',
    paymentStatus: '결제완료',
    deliveryStatus: '상품준비중',
    createdAt: '2024-01-02T10:15:00Z'
  },
  {
    id: 'ORD-20240110-0105',
    customerName: '박서준',
    phone: '010-5555-4444',
    address: '부산광역시 해운대구 마린시티2로 33, 제니스 101동 3001호',
    items: [
      {
        productId: 'p4',
        productName: '백조오브제 프리미엄 이동가방 그레이',
        quantity: 1,
        price: 98000,
      }
    ],
    totalPrice: 98000,
    deliveryFee: 0,
    paymentMethod: '간편결제',
    orderStatus: '주문접수',
    paymentStatus: '결제완료',
    deliveryStatus: '결제확인',
    createdAt: '2024-01-10T09:45:00Z'
  }
];
