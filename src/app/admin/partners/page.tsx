'use client';

import { useState } from 'react';
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
    name: '천사 펫 장례식장',
    type: 'funeral',
    contactPerson: '이실장',
    phone: '031-111-2222',
    address: '경기도 광주시',
    cooperationType: '위로 키트 제공',
    providedKits: [],
    status: '상담중',
    isContracted: false,
    isDelivered: false,
  }
];

export default function AdminPartnersPage() {
  const [partners] = useState<Partner[]>(mockPartners);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">B2B 파트너십 문의 관리</h1>
      </div>

      <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-3 font-medium">업체명</th>
              <th className="px-6 py-3 font-medium">유형</th>
              <th className="px-6 py-3 font-medium">담당자/연락처</th>
              <th className="px-6 py-3 font-medium">제휴 내용</th>
              <th className="px-6 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {partners.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                <td className="px-6 py-4 text-gray-500">
                  <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">{p.type === 'hospital' ? '동물병원' : p.type === 'funeral' ? '장례식장' : '기타'}</span>
                </td>
                <td className="px-6 py-4 text-gray-500">{p.contactPerson}<br/><span className="text-xs">{p.phone}</span></td>
                <td className="px-6 py-4 text-gray-900">{p.cooperationType}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${p.status === '운영중' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
