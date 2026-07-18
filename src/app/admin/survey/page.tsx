'use client';

import { useState, useEffect } from 'react';
import { getAdminBrands, getAdminProducts, getSurveyConfig, saveSurveyConfig } from '@/lib/storage';
import type { SurveyQuestion, SurveyResultRule } from '@/types';
import { X } from 'lucide-react';
import Pagination from '@/components/admin/Pagination';
import { AdminPageHeader } from '@/components/admin/AdminUi';
import AdminIdMultiPicker, { type AdminIdPickerOption } from '@/components/admin/AdminIdMultiPicker';
import { buildBrandOptions, buildProductOptions } from '@/components/admin/adminPickerOptions';
import { joinIdList, parseIdList } from '@/components/admin/idListValue';

const EMPTY_RECOMMENDATION: SurveyResultRule['recommendation'] = {
  direction: '',
  categorySlug: '',
  brandIds: [],
  productIds: [],
  needInsuranceAnalysis: false,
  recommendKit: false,
};

export default function AdminSurveyPage() {
  // 화면은 로컬 드래프트(questions/rules)만 편집한다. 편집 단위로 자동 저장하지 않고(=드리프트 원인)
  // "설정 저장" 버튼으로 드래프트 전체를 한 번에 PUT /api/admin/survey 로 올린다.
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [rules, setRules] = useState<SurveyResultRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<SurveyQuestion | null>(null);
  const [editingRule, setEditingRule] = useState<SurveyResultRule | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Partial<SurveyQuestion>>({ type: 'single' });
  const [newRule, setNewRule] = useState<Partial<SurveyResultRule>>({ condition: {}, recommendation: EMPTY_RECOMMENDATION });
  // 추천 상품/브랜드 이름 기반 선택 드롭다운 옵션. 설문 config 로드와 독립적으로 불러오고,
  // 실패해도 규칙 편집은 계속 가능하다(빈 옵션 → 기존 id 는 dangling chip 으로 유지).
  const [productOptions, setProductOptions] = useState<AdminIdPickerOption[]>([]);
  const [brandOptions, setBrandOptions] = useState<AdminIdPickerOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAdminProducts(), getAdminBrands()])
      .then(([products, brands]) => {
        if (cancelled) return;
        setProductOptions(buildProductOptions(products, brands));
        setBrandOptions(buildBrandOptions(brands));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getSurveyConfig().then((config) => {
      if (cancelled) return;
      setQuestions(config.questions);
      setRules(config.rules);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = () => {
    setSaving(true);
    saveSurveyConfig({ questions, rules }).then(({ ok }) => {
      setSaving(false);
      if (ok) {
        alert('진단 설문 설정을 저장했습니다.');
      } else {
        alert('저장에 실패했습니다. 권한 또는 네트워크를 확인해주세요.');
      }
    });
  };

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

  if (loading) {
    return <div className="py-20 text-center text-sm text-[#6F766F]">진단 설정을 불러오는 중…</div>;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="맞춤 진단 설계"
        description="진단 문항과 추천 규칙을 함께 구성합니다. 편집한 내용은 검토 후 한 번에 저장됩니다."
        actions={<><button onClick={() => { setNewQuestion({ type: 'single' }); setIsAddingQuestion(true); }} className="min-h-11 border border-[#E7E0D5] bg-white px-5 text-sm font-semibold text-[#17211D] hover:bg-[#F3EEE6]">문항 추가</button><button onClick={handleSave} disabled={saving} className="min-h-11 bg-[#17211D] px-5 text-sm font-semibold text-white hover:bg-[#202521] disabled:opacity-50">{saving ? '저장 중…' : '설정 저장'}</button></>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border border-[#E7E0D5] bg-white p-6">
          <h2 className="mb-6 text-lg font-semibold text-[#17211D]">진단 문항</h2>
          <div className="space-y-4">
            {paginatedQuestions.map(q => (
              <div key={q.id} className="border border-[#E7E0D5] bg-[#FAF8F3] p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-[#17211D]">{q.title}</h3>
                  <div className="flex gap-2 items-center">
                    <span className="border border-[#E7E0D5] bg-white px-2 py-1 text-xs text-[#59615B]">{q.type === 'single' ? '단일 선택' : '다중 선택'}</span>
                    <button onClick={() => setEditingQuestion(q)} className="text-xs text-[#2F3B34] hover:underline">수정</button>
                    <button onClick={() => handleDeleteQuestion(q.id)} className="text-xs text-[#9E3939] hover:underline">삭제</button>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-[#59615B]">
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

        <div className="border border-[#E7E0D5] bg-white p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-[#17211D]">결과 추천 규칙</h2>
            <button onClick={() => { setNewRule({ condition: {}, recommendation: EMPTY_RECOMMENDATION }); setIsAddingRule(true); }} className="border border-[#E7E0D5] bg-white px-3 py-2 text-xs font-semibold text-[#59615B] hover:bg-[#F3EEE6]">규칙 추가</button>
          </div>
          <div className="space-y-4">
            {paginatedRules.map(r => (
              <div key={r.id} className="border border-[#E7E0D5] bg-[#FAF8F3] p-4">
                <div className="mb-3 border-b border-[#E7E0D5] pb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-[#2F3B34] uppercase tracking-wider block">Condition</span>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingRule(r)} className="text-xs text-[#2F3B34] hover:underline">수정</button>
                      <button onClick={() => handleDeleteRule(r.id)} className="text-xs text-[#9E3939] hover:underline">삭제</button>
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
                  결과: 추천 브랜드
                  <AdminIdMultiPicker
                    value={joinIdList(editingRule.recommendation.brandIds)}
                    onChange={(next) => setEditingRule({...editingRule, recommendation: {...editingRule.recommendation, brandIds: parseIdList(next)}})}
                    options={brandOptions}
                    ariaLabel="추천 브랜드"
                  />
                </label>
                <label className="block text-xs font-medium text-[#59615B]">
                  결과: 추천 상품
                  <AdminIdMultiPicker
                    value={joinIdList(editingRule.recommendation.productIds)}
                    onChange={(next) => setEditingRule({...editingRule, recommendation: {...editingRule.recommendation, productIds: parseIdList(next)}})}
                    options={productOptions}
                    ariaLabel="추천 상품"
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
                  결과: 추천 브랜드
                  <AdminIdMultiPicker
                    value={joinIdList(newRule.recommendation?.brandIds ?? [])}
                    onChange={(next) => setNewRule({...newRule, recommendation: {...(newRule.recommendation ?? EMPTY_RECOMMENDATION), brandIds: parseIdList(next)}})}
                    options={brandOptions}
                    ariaLabel="추천 브랜드"
                  />
                </label>
                <label className="block text-xs font-medium text-[#59615B]">
                  결과: 추천 상품
                  <AdminIdMultiPicker
                    value={joinIdList(newRule.recommendation?.productIds ?? [])}
                    onChange={(next) => setNewRule({...newRule, recommendation: {...(newRule.recommendation ?? EMPTY_RECOMMENDATION), productIds: parseIdList(next)}})}
                    options={productOptions}
                    ariaLabel="추천 상품"
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
