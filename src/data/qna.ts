import { QnA } from '@/types';

export const qnaList: QnA[] = [
  {
    id: 'q1',
    productId: 'p1',
    productName: '백조오브제 저알러지 가수분해 연어 사료 1.5kg',
    question: '2개월 강아지도 먹어도 되나요?',
    answer: '안녕하세요. 백조오브제입니다.\n해당 사료는 전연령용으로 생후 2개월 강아지도 급여 가능합니다.\n다만 이빨이 덜 자란 상태라면 물에 살짝 불려서 주시는 것을 권장합니다.',
    status: '답변완료',
    isSecret: false,
    writerName: '김민수',
    createdAt: '2024-01-02T11:20:00Z',
    answeredAt: '2024-01-02T14:15:00Z'
  },
  {
    id: 'q2',
    productId: 'p4',
    productName: '백조오브제 프리미엄 이동가방 그레이',
    question: '비밀글입니다.',
    status: '답변대기',
    isSecret: true,
    writerName: '이지은',
    createdAt: '2024-01-10T09:30:00Z'
  }
];
