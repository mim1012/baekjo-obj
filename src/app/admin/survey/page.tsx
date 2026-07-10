'use client';

import { useState, useEffect } from 'react';
import { surveyQuestions, surveyResultRules } from '@/data/survey';
import { X } from 'lucide-react';
import Pagination from '@/components/admin/Pagination';

const EMPTY_RECOMMENDATION: typeof surveyResultRules[0]['recommendation'] = {
  direction: '',
  categorySlug: '',
  brandIds: [],
  productIds: [],
  needInsuranceAnalysis: false,
  recommendKit: false,
};

export default function AdminSurveyPage() {
  const [questions, setQuestions] = useState(surveyQuestions);
  const [rules, setRules] = useState(surveyResultRules);
  const [editingQuestion, setEditingQuestion] = useState<typeof surveyQuestions[0] | null>(null);
  const [editingRule, setEditingRule] = useState<typeof surveyResultRules[0] | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Partial<typeof surveyQuestions[0]>>({ type: 'single' });
  const [newRule, setNewRule] = useState<Partial<typeof surveyResultRules[0]>>({ condition: {}, recommendation: EMPTY_RECOMMENDATION });

  const [currentQuestionsPage, setCurrentQuestionsPage] = useState(1);
  const [currentRulesPage, setCurrentRulesPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const totalQuestionsPages = Math.max(1, Math.ceil(questions.length / ITEMS_PER_PAGE));
  const paginatedQuestions = questions.slice((currentQuestionsPage - 1) * ITEMS_PER_PAGE, currentQuestionsPage * ITEMS_PER_PAGE);

  const totalRulesPages = Math.max(1, Math.ceil(rules.length / ITEMS_PER_PAGE));
  const paginatedRules = rules.slice((currentRulesPage - 1) * ITEMS_PER_PAGE, currentRulesPage * ITEMS_PER_PAGE);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingQuestion(null);
        setEditingRule(null);
        setIsAddingQuestion(false);
        setIsAddingRule(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDeleteQuestion = (id: string) => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const handleDeleteRule = (id: string) => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      setRules(rules.filter(r => r.id !== id));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">맞춤 진단 관리</h1>
        <button onClick={() => { setNewQuestion({ type: 'single' }); setIsAddingQuestion(true); }} className="bg-[#2F3B34] text-white px-4 py-2 text-sm font-semibold rounded-sm hover:bg-[#2F3B34]/90">문항 추가</button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">설문 문항 관리</h2>
          <div className="space-y-4">
            {paginatedQuestions.map(q => (
              <div key={q.id} className="border border-gray-100 bg-gray-50 p-4 rounded-sm">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{q.title}</h3>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">{q.type === 'single' ? '단일 선택' : '다중 선택'}</span>
                    <button onClick={() => setEditingQuestion(q)} className="text-xs text-[#2F3B34] hover:underline">수정</button>
                    <button onClick={() => handleDeleteQuestion(q.id)} className="text-xs text-red-600 hover:underline">삭제</button>
                  </div>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  {q.options.map(o => (
                    <div key={o.id} className="flex gap-2">
                      <span className="text-gray-400">-</span> {o.label} <span className="text-gray-400 text-xs">({o.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Pagination 
              currentPage={currentQuestionsPage}
              totalPages={totalQuestionsPages}
              totalItems={questions.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentQuestionsPage}
            />
          </div>
        </div>

        <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">결과 매핑 룰</h2>
            <button onClick={() => { setNewRule({ condition: {}, recommendation: EMPTY_RECOMMENDATION }); setIsAddingRule(true); }} className="border border-gray-300 text-gray-600 px-3 py-1.5 text-xs font-semibold rounded-sm hover:bg-gray-50">룰 추가</button>
          </div>
          <div className="space-y-4">
            {paginatedRules.map(r => (
              <div key={r.id} className="border border-gray-100 bg-gray-50 p-4 rounded-sm">
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-[#2F3B34] uppercase tracking-wider block">Condition</span>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingRule(r)} className="text-xs text-[#2F3B34] hover:underline">수정</button>
                      <button onClick={() => handleDeleteRule(r.id)} className="text-xs text-red-600 hover:underline">삭제</button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-800">
                    {r.condition.concern && <span className="mr-3">고민: <strong>{r.condition.concern}</strong></span>}
                    {r.condition.ageGroup && <span>연령: <strong>{r.condition.ageGroup}</strong></span>}
                    {!r.condition.concern && !r.condition.ageGroup && <span>(조건 없음)</span>}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#2F3B34] uppercase tracking-wider block mb-1">Recommendation</span>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div><span className="text-gray-400">방향:</span> {r.recommendation.direction}</div>
                    <div><span className="text-gray-400">브랜드:</span> {r.recommendation.brandIds.join(', ')}</div>
                    <div><span className="text-gray-400">상품:</span> {r.recommendation.productIds.join(', ')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Pagination 
              currentPage={currentRulesPage}
              totalPages={totalRulesPages}
              totalItems={rules.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentRulesPage}
            />
          </div>
        </div>
      </div>

      {/* 문항 수정 모달 */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-[#F8F7F2] shadow-xl relative max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-[#2F3B34] text-white flex justify-between items-center p-5 shrink-0">
              <h2 className="text-lg font-semibold">진단 문항 수정</h2>
              <button onClick={() => setEditingQuestion(null)} className="p-1 hover:bg-white/20 rounded">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <label className="block text-xs font-medium text-[#59615B]">
                질문 내용
                <input 
                  className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white focus:border-[#2F3B34]" 
                  value={editingQuestion.title} 
                  onChange={(e) => setEditingQuestion({...editingQuestion, title: e.target.value})} 
                />
              </label>
              <label className="block text-xs font-medium text-[#59615B]">
                질문 타입 (단일 선택 / 다중 선택)
                <select 
                  className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white focus:border-[#2F3B34]" 
                  value={editingQuestion.type}
                  onChange={(e) => setEditingQuestion({...editingQuestion, type: e.target.value as 'single' | 'multiple'})} 
                >
                  <option value="single">단일 선택</option>
                  <option value="multiple">다중 선택</option>
                </select>
              </label>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="block text-xs font-medium text-[#59615B]">선택지 관리</span>
                  <button type="button" onClick={() => setEditingQuestion({...editingQuestion, options: [...(editingQuestion.options || []), { id: `o${Date.now()}`, label: '새 선택지', value: '값' }]})} className="text-xs border px-2 py-1 hover:bg-gray-50">+ 선택지 추가</button>
                </div>
                <div className="space-y-2">
                  {editingQuestion.options?.map((opt, i) => (
                    <div key={opt.id} className="flex gap-2 items-center">
                      <input className="border px-2 py-1 text-sm flex-1" placeholder="라벨 (예: 활발해요)" value={opt.label} onChange={(e) => {
                        const newOptions = [...(editingQuestion.options || [])];
                        newOptions[i] = { ...opt, label: e.target.value };
                        setEditingQuestion({...editingQuestion, options: newOptions});
                      }} />
                      <input className="border px-2 py-1 text-sm flex-1" placeholder="값 (예: active)" value={opt.value} onChange={(e) => {
                        const newOptions = [...(editingQuestion.options || [])];
                        newOptions[i] = { ...opt, value: e.target.value };
                        setEditingQuestion({...editingQuestion, options: newOptions});
                      }} />
                      <button onClick={() => setEditingQuestion({...editingQuestion, options: editingQuestion.options?.filter(o => o.id !== opt.id)})} className="text-red-500 hover:text-red-700 text-xs px-2">삭제</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-[#D1D0C8] bg-white p-5 flex justify-end gap-3 shrink-0">
              <button onClick={() => setEditingQuestion(null)} className="min-h-11 border border-[#D1D0C8] px-5 text-sm font-semibold text-[#59615B] hover:bg-[#F8F7F2]">취소</button>
              <button onClick={() => {
                setQuestions(questions.map(q => q.id === editingQuestion.id ? editingQuestion : q));
                setEditingQuestion(null);
              }} className="min-h-11 bg-[#2F3B34] px-8 text-sm font-semibold text-white hover:bg-[#1f2823]">수정 저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 룰 수정 모달 */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-[#F8F7F2] shadow-xl relative max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-[#2F3B34] text-white flex justify-between items-center p-5 shrink-0">
              <h2 className="text-lg font-semibold">매핑 룰 수정</h2>
              <button onClick={() => setEditingRule(null)} className="p-1 hover:bg-white/20 rounded">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-xs font-medium text-[#59615B]">
                  조건: 주요 고민
                  <input
                    className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white"
                    value={editingRule.condition.concern || ''}
                    onChange={(e) => setEditingRule({...editingRule, condition: {...editingRule.condition, concern: e.target.value}})} 
                  />
                </label>
                <label className="block text-xs font-medium text-[#59615B]">
                  조건: 연령대
                  <input 
                    className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white" 
                    value={editingRule.condition.ageGroup || ''} 
                    onChange={(e) => setEditingRule({...editingRule, condition: {...editingRule.condition, ageGroup: e.target.value}})} 
                  />
                </label>
              </div>
              <label className="block text-xs font-medium text-[#59615B]">
                결과: 방향성 텍스트
                <input 
                  className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white" 
                  value={editingRule.recommendation.direction} 
                  onChange={(e) => setEditingRule({...editingRule, recommendation: {...editingRule.recommendation, direction: e.target.value}})} 
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-xs font-medium text-[#59615B]">
                  결과: 추천 브랜드 ID (쉼표 구분)
                  <input
                    className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white"
                    value={editingRule.recommendation.brandIds.join(', ')}
                    onChange={(e) => setEditingRule({...editingRule, recommendation: {...editingRule.recommendation, brandIds: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}})} 
                  />
                </label>
                <label className="block text-xs font-medium text-[#59615B]">
                  결과: 추천 상품 ID (쉼표 구분)
                  <input 
                    className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white" 
                    value={editingRule.recommendation.productIds.join(', ')} 
                    onChange={(e) => setEditingRule({...editingRule, recommendation: {...editingRule.recommendation, productIds: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}})} 
                  />
                </label>
              </div>
            </div>
            <div className="border-t border-[#D1D0C8] bg-white p-5 flex justify-end gap-3 shrink-0">
              <button onClick={() => setEditingRule(null)} className="min-h-11 border border-[#D1D0C8] px-5 text-sm font-semibold text-[#59615B] hover:bg-[#F8F7F2]">취소</button>
              <button onClick={() => {
                setRules(rules.map(r => r.id === editingRule.id ? editingRule : r));
                setEditingRule(null);
              }} className="min-h-11 bg-[#2F3B34] px-8 text-sm font-semibold text-white hover:bg-[#1f2823]">수정 저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 문항 추가 모달 */}
      {isAddingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-[#F8F7F2] shadow-xl relative max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-[#2F3B34] text-white flex justify-between items-center p-5 shrink-0">
              <h2 className="text-lg font-semibold">진단 문항 추가</h2>
              <button onClick={() => setIsAddingQuestion(false)} className="p-1 hover:bg-white/20 rounded">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <label className="block text-xs font-medium text-[#59615B]">
                질문 내용
                <input 
                  className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white focus:border-[#2F3B34]" 
                  value={newQuestion.title || ''} 
                  onChange={(e) => setNewQuestion({...newQuestion, title: e.target.value})} 
                />
              </label>
              <label className="block text-xs font-medium text-[#59615B]">
                질문 타입 (단일 선택 / 다중 선택)
                <select 
                  className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white focus:border-[#2F3B34]" 
                  value={newQuestion.type || 'single'}
                  onChange={(e) => setNewQuestion({...newQuestion, type: e.target.value as 'single' | 'multiple'})} 
                >
                  <option value="single">단일 선택</option>
                  <option value="multiple">다중 선택</option>
                </select>
              </label>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="block text-xs font-medium text-[#59615B]">선택지 관리</span>
                  <button type="button" onClick={() => setNewQuestion({...newQuestion, options: [...(newQuestion.options || []), { id: `o${Date.now()}`, label: '새 선택지', value: '값' }]})} className="text-xs border px-2 py-1 hover:bg-gray-50">+ 선택지 추가</button>
                </div>
                <div className="space-y-2">
                  {newQuestion.options?.map((opt, i) => (
                    <div key={opt.id} className="flex gap-2 items-center">
                      <input className="border px-2 py-1 text-sm flex-1" placeholder="라벨 (예: 활발해요)" value={opt.label} onChange={(e) => {
                        const newOptions = [...(newQuestion.options || [])];
                        newOptions[i] = { ...opt, label: e.target.value };
                        setNewQuestion({...newQuestion, options: newOptions});
                      }} />
                      <input className="border px-2 py-1 text-sm flex-1" placeholder="값 (예: active)" value={opt.value} onChange={(e) => {
                        const newOptions = [...(newQuestion.options || [])];
                        newOptions[i] = { ...opt, value: e.target.value };
                        setNewQuestion({...newQuestion, options: newOptions});
                      }} />
                      <button onClick={() => setNewQuestion({...newQuestion, options: newQuestion.options?.filter(o => o.id !== opt.id)})} className="text-red-500 hover:text-red-700 text-xs px-2">삭제</button>
                    </div>
                  ))}
                  {(!newQuestion.options || newQuestion.options.length === 0) && <div className="text-xs text-gray-400">등록된 선택지가 없습니다.</div>}
                </div>
              </div>
            </div>
            <div className="border-t border-[#D1D0C8] bg-white p-5 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsAddingQuestion(false)} className="min-h-11 border border-[#D1D0C8] px-5 text-sm font-semibold text-[#59615B] hover:bg-[#F8F7F2]">취소</button>
              <button onClick={() => {
                const questionToAdd = {
                  id: `q${Date.now()}`,
                  title: newQuestion.title || '새로운 질문',
                  type: (newQuestion.type || 'single') as 'single' | 'multiple',
                  options: newQuestion.options || []
                };
                setQuestions([...questions, questionToAdd]);
                setIsAddingQuestion(false);
              }} className="min-h-11 bg-[#2F3B34] px-8 text-sm font-semibold text-white hover:bg-[#1f2823]">등록</button>
            </div>
          </div>
        </div>
      )}

      {/* 룰 추가 모달 */}
      {isAddingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-[#F8F7F2] shadow-xl relative max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-[#2F3B34] text-white flex justify-between items-center p-5 shrink-0">
              <h2 className="text-lg font-semibold">매핑 룰 추가</h2>
              <button onClick={() => setIsAddingRule(false)} className="p-1 hover:bg-white/20 rounded">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-xs font-medium text-[#59615B]">
                  조건: 주요 고민
                  <input
                    className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white"
                    value={newRule.condition?.concern || ''}
                    onChange={(e) => setNewRule({...newRule, condition: {...newRule.condition, concern: e.target.value}})} 
                  />
                </label>
                <label className="block text-xs font-medium text-[#59615B]">
                  조건: 연령대
                  <input 
                    className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white" 
                    value={newRule.condition?.ageGroup || ''} 
                    onChange={(e) => setNewRule({...newRule, condition: {...newRule.condition, ageGroup: e.target.value}})} 
                  />
                </label>
              </div>
              <label className="block text-xs font-medium text-[#59615B]">
                결과: 방향성 텍스트
                <input 
                  className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white" 
                  value={newRule.recommendation?.direction || ''} 
                  onChange={(e) => setNewRule({...newRule, recommendation: {...(newRule.recommendation ?? EMPTY_RECOMMENDATION), direction: e.target.value}})}
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-xs font-medium text-[#59615B]">
                  결과: 추천 브랜드 ID (쉼표 구분)
                  <input
                    className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white"
                    value={newRule.recommendation?.brandIds?.join(', ') || ''}
                    onChange={(e) => setNewRule({...newRule, recommendation: {...(newRule.recommendation ?? EMPTY_RECOMMENDATION), brandIds: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}})}
                  />
                </label>
                <label className="block text-xs font-medium text-[#59615B]">
                  결과: 추천 상품 ID (쉼표 구분)
                  <input 
                    className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white" 
                    value={newRule.recommendation?.productIds?.join(', ') || ''} 
                    onChange={(e) => setNewRule({...newRule, recommendation: {...(newRule.recommendation ?? EMPTY_RECOMMENDATION), productIds: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}})}
                  />
                </label>
              </div>
            </div>
            <div className="border-t border-[#D1D0C8] bg-white p-5 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsAddingRule(false)} className="min-h-11 border border-[#D1D0C8] px-5 text-sm font-semibold text-[#59615B] hover:bg-[#F8F7F2]">취소</button>
              <button onClick={() => {
                const ruleToAdd = {
                  id: `r${Date.now()}`,
                  condition: {
                    concern: newRule.condition?.concern || undefined,
                    ageGroup: newRule.condition?.ageGroup || undefined,
                  },
                  recommendation: {
                    ...EMPTY_RECOMMENDATION,
                    ...newRule.recommendation,
                  }
                };
                setRules([...rules, ruleToAdd]);
                setIsAddingRule(false);
              }} className="min-h-11 bg-[#2F3B34] px-8 text-sm font-semibold text-white hover:bg-[#1f2823]">등록</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
