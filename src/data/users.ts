import { User } from '@/types';

export const users: User[] = [
  {
    id: 'u1',
    name: '관리자',
    email: 'admin@baekjo.com',
    phone: '010-0000-0000',
    role: 'admin',
    createdAt: '2023-11-01T00:00:00Z'
  },
  {
    id: 'u2',
    name: '김민수',
    email: 'minsu@example.com',
    phone: '010-1234-5678',
    petType: 'dog',
    breed: '말티즈',
    mainConcern: 'tear',
    role: 'user',
    status: 'active',
    createdAt: '2023-12-10T15:30:00Z'
  },
  {
    id: 'u3',
    name: '최고관리',
    email: 'b2b@company.com',
    phone: '010-9999-8888',
    companyName: '(주)백조협력사',
    businessNumber: '123-45-67890',
    role: 'b2b',
    status: 'pending',
    createdAt: '2023-12-15T10:00:00Z'
  },
  {
    id: 'u4',
    name: '보험담당자',
    email: 'insure@petcare.com',
    phone: '010-1111-2222',
    companyName: '안심펫보험',
    businessNumber: '987-65-43210',
    role: 'insurance',
    status: 'pending',
    createdAt: '2023-12-16T14:20:00Z'
  }
];
