'use client';

import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/format';
import { X } from 'lucide-react';
import Pagination from '@/components/admin/Pagination';
import { AdminPageHeader } from '@/components/admin/AdminUi';

interface SurveyResult {
  id: string;
  user: string;
  petType: string;
  age: string;
  concern: string;
  date: string;
  resultDirection: string;
  customerMessage?: string;
}

const mockResults: SurveyResult[] = [
  { id: 'sr1', user: '?�원 A', petType: '강아지', age: '?�니??, concern: '관??�?, date: '2024-05-10T10:00:00Z', resultDirection: '?�개�?관�?, customerMessage: '관???�양?��? ?�께 꾸�????�책??권장?�니??' },
  { id: 'sr2', user: '?�원 B', petType: '고양??, age: '?�덜??, concern: '구강/치아', date: '2024-05-09T14:30:00Z', resultDirection: '치석 ?�방 루틴' },
];

export default function AdminSurveyResultsPage() {
  const [results, setResults] = useState(mockResults);
  const [editingResult, setEditingResult] = useState<SurveyResult | null>(null);
  const [isAddingResult, setIsAddingResult] = useState(false);
  const [newResult, setNewResult] = useState<Partial<SurveyResult>>({});
  
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  
  const totalPages = Math.max(1, Math.ceil(results.length / ITEMS_PER_PAGE));
  const paginatedResults = results.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingResult(null);
        setIsAddingResult(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDelete = (id: string) => {
    if (window.confirm('?�말�???��?�시겠습?�까?')) {
      setResults(results.filter(r => r.id !== id));
    }
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="진단 참여 ?�역"
        description="?�원�?맞춤 진단 결과�??�인?�고 고객?�게 ?�달??관�?코멘?��? ?�성?�니??"
        actions={<button type="button" onClick={() => { setNewResult({}); setIsAddingResult(true); }} className="min-h-11 bg-[#17211D] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#202521]">결과 ?�기 ?�록</button>}
      />

      <div className="overflow-hidden border border-[#E7E0D5] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm whitespace-nowrap">
            <thead className="bg-[#FAF8F3] text-[#6F766F]">
              <tr>
                <th className="px-6 py-3 font-medium">참여?�시</th>
                <th className="px-6 py-3 font-medium">참여??/th>
                <th className="px-6 py-3 font-medium">?�물/?�령</th>
                <th className="px-6 py-3 font-medium">주요 고�?</th>
                <th className="px-6 py-3 font-medium">?�출 결과(방향)</th>
                <th className="px-6 py-3 font-medium text-right">관�?/th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E0D5]">
              {paginatedResults.map(r => (
                <tr key={r.id} className="transition-colors hover:bg-white">
                  <td className="px-6 py-4 text-[#6F766F]">{formatDate(r.date)}</td>
                  <td className="px-6 py-4 font-semibold text-[#17211D]">{r.user}</td>
                  <td className="px-6 py-4 text-[#59615B]">{r.petType} / {r.age}</td>
                  <td className="px-6 py-4 text-[#17211D]">{r.concern}</td>
                  <td className="px-6 py-4 text-[#59615B]">{r.resultDirection}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button onClick={() => setEditingResult(r)} className="text-[#2F3B34] hover:underline font-medium text-xs px-2 py-1.5 rounded-md mr-2">?�세/?�정</button>
                    <button onClick={() => handleDelete(r.id)} className="px-2 py-1.5 text-xs font-semibold text-[#9E3939] hover:bg-[#F7ECEA]">??��</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {results.length === 0 && (
          <div className="py-10 text-center text-gray-500">
            진단 참여 ?�역???�습?�다.
          </div>
        )}
        
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={results.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ?�정 모달 */}
      {editingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-[#F8F7F2] shadow-xl relative max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-[#2F3B34] text-white flex justify-between items-center p-5 shrink-0">
              <h2 className="text-lg font-semibold">진단 ?�역 ?�세 / 결과 ?�성</h2>
              <button onClick={() => setEditingResult(null)} className="p-1 hover:bg-white/20 rounded">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-xs font-medium text-[#59615B]">
                  참여??
                  <input className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-gray-50" value={editingResult.user} disabled />
                </label>
                <label className="block text-xs font-medium text-[#59615B]">
                  참여?�시
                  <input className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-gray-50" value={formatDate(editingResult.date)} disabled />
                </label>
                <label className="block text-xs font-medium text-[#59615B]">
                  반려?�물 종류 / ?�령
                  <input className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-gray-50" value={`${editingResult.petType} / ${editingResult.age}`} disabled />
                </label>
                <label className="block text-xs font-medium text-[#59615B]">
                  주요 고�?
                  <input className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-gray-50" value={editingResult.concern} disabled />
                </label>
              </div>
              <label className="block text-xs font-medium text-[#59615B] pt-2">
                ?�출 결과 (방향??
                <input 
                  className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white focus:border-[#2F3B34]" 
                  value={editingResult.resultDirection} 
                  onChange={(e) => setEditingResult({...editingResult, resultDirection: e.target.value})} 
                />
              </label>
              <label className="block text-xs font-medium text-[#59615B] pt-2">
                고객 ?�송??결과 코멘??(?�택)
                <textarea 
                  className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white focus:border-[#2F3B34] min-h-[100px]" 
                  placeholder="고객?�게 ?�길 맞춤??진단 결과???�드백을 ?�어주세??"
                  value={editingResult.customerMessage || ''} 
                  onChange={(e) => setEditingResult({...editingResult, customerMessage: e.target.value})} 
                />
              </label>
            </div>
            <div className="border-t border-[#D1D0C8] bg-white p-5 flex justify-end gap-3 shrink-0">
              <button onClick={() => setEditingResult(null)} className="min-h-11 border border-[#D1D0C8] px-5 text-sm font-semibold text-[#59615B] hover:bg-[#F8F7F2]">취소</button>
              <button onClick={() => {
                setResults(results.map(r => r.id === editingResult.id ? editingResult : r));
                setEditingResult(null);
              }} className="min-h-11 bg-[#2F3B34] px-8 text-sm font-semibold text-white hover:bg-[#1f2823]">결과 ?�??/button>
            </div>
          </div>
        </div>
      )}

      {/* ?�록 모달 */}
      {isAddingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-[#F8F7F2] shadow-xl relative max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-[#2F3B34] text-white flex justify-between items-center p-5 shrink-0">
              <h2 className="text-lg font-semibold">진단 ?�역 ?�기 ?�록</h2>
              <button onClick={() => setIsAddingResult(false)} className="p-1 hover:bg-white/20 rounded">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-xs font-medium text-[#59615B]">
                  참여??
                  <input className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white" value={newResult.user || ''} onChange={(e) => setNewResult({...newResult, user: e.target.value})} />
                </label>
                <label className="block text-xs font-medium text-[#59615B]">
                  반려?�물 종류 (?? 강아지)
                  <input className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white" value={newResult.petType || ''} onChange={(e) => setNewResult({...newResult, petType: e.target.value})} />
                </label>
                <label className="block text-xs font-medium text-[#59615B]">
                  ?�령?� (?? ?�니??
                  <input className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white" value={newResult.age || ''} onChange={(e) => setNewResult({...newResult, age: e.target.value})} />
                </label>
                <label className="block text-xs font-medium text-[#59615B]">
                  주요 고�?
                  <input className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white" value={newResult.concern || ''} onChange={(e) => setNewResult({...newResult, concern: e.target.value})} />
                </label>
              </div>
              <label className="block text-xs font-medium text-[#59615B] pt-2">
                ?�출 결과 (방향??
                <input className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white" value={newResult.resultDirection || ''} onChange={(e) => setNewResult({...newResult, resultDirection: e.target.value})} />
              </label>
              <label className="block text-xs font-medium text-[#59615B] pt-2">
                고객 ?�송??결과 코멘??(?�택)
                <textarea className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white min-h-[100px]" value={newResult.customerMessage || ''} onChange={(e) => setNewResult({...newResult, customerMessage: e.target.value})} />
              </label>
            </div>
            <div className="border-t border-[#D1D0C8] bg-white p-5 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsAddingResult(false)} className="min-h-11 border border-[#D1D0C8] px-5 text-sm font-semibold text-[#59615B] hover:bg-[#F8F7F2]">취소</button>
              <button onClick={() => {
                const resultToAdd: SurveyResult = {
                  id: `sr${Date.now()}`,
                  user: newResult.user || '?�명',
                  petType: newResult.petType || '-',
                  age: newResult.age || '-',
                  concern: newResult.concern || '-',
                  date: new Date().toISOString(),
                  resultDirection: newResult.resultDirection || '-',
                  customerMessage: newResult.customerMessage
                };
                setResults([resultToAdd, ...results]);
                setIsAddingResult(false);
              }} className="min-h-11 bg-[#2F3B34] px-8 text-sm font-semibold text-white hover:bg-[#1f2823]">?�록</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
