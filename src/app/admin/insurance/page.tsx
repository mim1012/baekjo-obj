'use client';

import { useState } from 'react';
import { getInsuranceApplications, updateInsuranceStatus } from '@/lib/storage';
import { formatDate } from '@/lib/format';
import { InsuranceApplication } from '@/types';
import { useMounted } from '@/lib/useMounted';

export default function AdminInsurancePage() {
  const mounted = useMounted();
  const [, refreshApplications] = useState(0);

  const handleStatusChange = (id: string, newStatus: InsuranceApplication['status']) => {
    updateInsuranceStatus(id, newStatus);
    refreshApplications((version) => version + 1);
  };

  if (!mounted) return null;

  const apps = getInsuranceApplications().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">보험 분석 신청 관리</h1>
      </div>

      <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-3 font-medium">신청일시</th>
              <th className="px-6 py-3 font-medium">신청자</th>
              <th className="px-6 py-3 font-medium">반려동물</th>
              <th className="px-6 py-3 font-medium">기존보험유무</th>
              <th className="px-6 py-3 font-medium">상태</th>
              <th className="px-6 py-3 font-medium">상태변경</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {apps.map(app => (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-500">{formatDate(app.createdAt)}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{app.ownerName} ({app.phone})</td>
                <td className="px-6 py-4 text-gray-500">{app.petName} ({app.petBreed}, {app.petAge}살)</td>
                <td className="px-6 py-4 text-gray-500">
                  {app.hasCurrentInsurance ? (
                    <span className="text-blue-600 font-medium">있음 ({app.currentInsuranceName})</span>
                  ) : (
                    <span>없음</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    app.status === '신청완료' ? 'bg-orange-100 text-orange-800' :
                    app.status === '분석중' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {app.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <select 
                    value={app.status} 
                    onChange={(e) => handleStatusChange(app.id, e.target.value as InsuranceApplication['status'])}
                    className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value="신청완료">신청완료</option>
                    <option value="분석중">분석중</option>
                    <option value="분석완료">분석완료</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {apps.length === 0 && (
          <div className="py-10 text-center text-gray-500">
            보험 분석 신청 내역이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
