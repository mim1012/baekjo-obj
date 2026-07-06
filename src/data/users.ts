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
    createdAt: '2023-12-10T15:30:00Z'
  }
];
