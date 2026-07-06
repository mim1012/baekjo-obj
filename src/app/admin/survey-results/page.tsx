'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/format';

const mockResults = [
  { id: 'sr1', user: '회원 A', petType: '강아지', age: '시니어', concern: '관절/뼈', date: '2024-05-10T10:00:00Z', resultDirection: '슬개골 관리' },
  { id: 'sr2', user: '회원 B', petType: '고양이', age: '어덜트', concern: '구강/치아', date: '2024-05-09T14:30:00Z', resultDirection: '치석 예방 루틴' },
];

export default function AdminSurveyResultsPage() {
  const [results] = useState(mockResults);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">맞춤 진단 참여 내역</h1>
      </div>

      <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-3 font-medium">참여일시</th>
              <th className="px-6 py-3 font-medium">참여자</th>
              <th className="px-6 py-3 font-medium">동물/연령</th>
              <th className="px-6 py-3 font-medium">주요 고민</th>
              <th className="px-6 py-3 font-medium">도출 결과(방향)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {results.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-500">{formatDate(r.date)}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{r.user}</td>
                <td className="px-6 py-4 text-gray-500">{r.petType} / {r.age}</td>
                <td className="px-6 py-4 text-gray-900">{r.concern}</td>
                <td className="px-6 py-4 text-gray-500">{r.resultDirection}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {results.length === 0 && (
          <div className="py-10 text-center text-gray-500">
            진단 참여 내역이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
