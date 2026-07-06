'use client';

import { useState } from 'react';
import { CareKit } from '@/types';

const mockKits: CareKit[] = [
  { id: 'k1', name: '병원 회복 케어 키트', type: 'hospital', target: '내원 보호자', location: '제휴 동물병원', items: ['영양 캔', '유산균', '가이드북'], purpose: '치료 후 회복 지원', stock: 150, isVisible: true },
  { id: 'k2', name: '시니어 활력 키트', type: 'vitality', target: '시니어 강아지', location: '온라인 신청', items: ['관절 영양제 샘플', '부드러운 간식'], purpose: '노령견 활력 증진', stock: 50, isVisible: true },
];

export default function AdminKitsPage() {
  const [kits] = useState<CareKit[]>(mockKits);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">케어 키트 관리</h1>
        <button className="bg-[#2F3B34] text-white px-4 py-2 text-sm font-semibold rounded-sm">키트 등록</button>
      </div>

      <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-3 font-medium">키트명</th>
              <th className="px-6 py-3 font-medium">유형</th>
              <th className="px-6 py-3 font-medium">배포처</th>
              <th className="px-6 py-3 font-medium">재고 현황</th>
              <th className="px-6 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {kits.map(kit => (
              <tr key={kit.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{kit.name}</td>
                <td className="px-6 py-4 text-gray-500">
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">{kit.type}</span>
                </td>
                <td className="px-6 py-4 text-gray-500">{kit.location}</td>
                <td className="px-6 py-4 text-gray-900">{kit.stock}개</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${kit.isVisible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {kit.isVisible ? '노출중' : '숨김'}
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
