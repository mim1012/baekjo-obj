'use client';

import { useCallback, useEffect, useState } from 'react';
import { getInsuranceApplications, updateInsuranceStatus } from '@/lib/storage';
import { formatDate } from '@/lib/format';
import { InsuranceApplication } from '@/types';
import { useMounted } from '@/lib/useMounted';
import Pagination from '@/components/admin/Pagination';

export default function AdminInsurancePage() {
  const mounted = useMounted();
  // 목록은 서버(관리자)에서 비동기로. 로딩 중과 실제 0건을 구분해 빈 상태가 잠깐 노출되지 않게 한다.
  const [apps, setApps] = useState<InsuranceApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // await 후 setState 하면 react-hooks/set-state-in-effect 가 걸리므로 .then() 체인으로 처리한다.
  const loadApplications = useCallback(() => {
    return getInsuranceApplications().then((list) => {
      const sorted = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setApps(sorted);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleStatusChange = async (id: string, newStatus: InsuranceApplication['status']) => {
    try {
      await updateInsuranceStatus(id, newStatus);
    } catch {
      alert('상태 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    await loadApplications();
  };

  if (!mounted || loading) {
    return <p className="p-12 text-center text-sm text-[#7B827C]">보험 신청 목록 불러오는 중…</p>;
  }

  const totalPages = Math.max(1, Math.ceil(apps.length / ITEMS_PER_PAGE));
  const paginatedApps = apps.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">보험 분석 신청 관리</h1>
          <p className="mt-2 text-sm text-[#737A74]">고객의 보험 분석 신청 내역을 관리합니다.</p>
        </div>
        <button type="button" onClick={() => alert('신청 등록 기능은 현재 모의 상태입니다.')} className="bg-[#2F3B34] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2F3B34]/90 flex items-center gap-2">
          신청 수기 등록
        </button>
      </div>

      <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-3 font-medium">신청일시</th>
                <th className="px-6 py-3 font-medium">신청자</th>
                <th className="px-6 py-3 font-medium">반려동물</th>
                <th className="px-6 py-3 font-medium">기존보험유무</th>
                <th className="px-6 py-3 font-medium">상태</th>
                <th className="px-6 py-3 font-medium">상태변경</th>
                <th className="px-6 py-3 font-medium text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedApps.map(app => (
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
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button onClick={() => alert('상세/수정 팝업이 뜰 예정입니다.')} className="text-[#2F3B34] hover:underline font-medium text-xs px-2 py-1.5 rounded-md mr-2">수정</button>
                    <button onClick={() => { if(window.confirm('정말로 삭제하시겠습니까?')) alert('삭제되었습니다.'); }} className="text-red-600 hover:underline font-medium text-xs px-2 py-1.5 rounded-md">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {apps.length === 0 && (
          <div className="py-10 text-center text-gray-500">
            보험 분석 신청 내역이 없습니다.
          </div>
        )}

        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={apps.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
