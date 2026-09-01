'use client';

import { useState, useEffect } from 'react';
import { getAdminBrands, getAdminProducts, getAdminSurveyConfig, saveSurveyConfig } from '@/lib/storage';
import type { SurveyQuestion, SurveyResultRule } from '@/types';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import Pagination from '@/components/admin/Pagination';
import { AdminPageHeader } from '@/components/admin/AdminUi';
import AdminIdMultiPicker, { type AdminIdPickerOption } from '@/components/admin/AdminIdMultiPicker';
import { buildBrandOptions, buildProductOptions } from '@/components/admin/adminPickerOptions';
import { joinIdList, parseIdList } from '@/components/admin/idListValue';
import {
  defaultSurveyResultContent,
  isValidSurveyConfig,
  type SurveyResultContent,
} from '@/lib/survey/config';

const EMPTY_RECOMMENDATION: SurveyResultRule['recommendation'] = {
  direction: '',
  categorySlug: '',
  brandIds: [],
  productIds: [],
  needInsuranceAnalysis: false,
  recommendKit: false,
};

const EMPTY_RULE: SurveyResultRule = {
  id: '',
  condition: {},
  recommendation: EMPTY_RECOMMENDATION,
};

function newSurveyOption(): SurveyQuestion['options'][number] {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { id: `o-${token}`, label: '새 선택지', value: `answer-${token}` };
}

function newQuestionDraft(): Partial<SurveyQuestion> {
  return { title: '', type: 'single', options: [newSurveyOption()] };
}

function questionDraftError(question: Partial<SurveyQuestion>): string | null {
  if (!question.title?.trim()) return '질문 내용을 입력해주세요.';
  if (!question.options?.length) return '답변 선택지는 최소 1개가 필요합니다.';
  if (question.options.some((option) => !option.label.trim())) return '모든 답변 선택지의 내용을 입력해주세요.';
  return null;
}

function ruleDraftError(rule: SurveyResultRule): string | null {
  if (!rule.recommendation.direction.trim()) return '고객에게 보여줄 결과 방향을 입력해주세요.';
  return null;
}

function ruleConditionBinding(
  rule: Pick<SurveyResultRule, 'condition'>,
): { questionId: string; optionValue: string } {
  const current = rule.condition.answers?.[0];
  if (current) return current;
  if (rule.condition.concern) return { questionId: 'q3', optionValue: rule.condition.concern };
  if (rule.condition.ageGroup) return { questionId: 'q2', optionValue: rule.condition.ageGroup };
  return { questionId: '', optionValue: '' };
}

function withRuleCondition(
  rule: SurveyResultRule,
  questionId: string,
  optionValue: string,
): SurveyResultRule {
  return {
    ...rule,
    condition: {
      answers: questionId && optionValue ? [{ questionId, optionValue }] : [],
    },
  };
}

function conditionLabel(rule: SurveyResultRule, questions: SurveyQuestion[]): string {
  const { questionId, optionValue } = ruleConditionBinding(rule);
  if (!questionId || !optionValue) return '모든 결과가 맞지 않을 때 사용하는 기본 결과';
  const question = questions.find((item) => item.id === questionId);
  const option = question?.options.find((item) => item.value === optionValue);
  return `${question?.title ?? '삭제된 질문'} → ${option?.label ?? '삭제된 답변'}`;
}

function moveAt<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function SelectionOrderButtons({
  label,
  index,
  total,
  onMove,
}: {
  label: string;
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={index === 0}
        aria-label={`${label || `${index + 1}번째 선택지`} 위로 이동`}
        title="고객 화면에서 한 칸 위로 이동"
        className="inline-flex size-10 items-center justify-center border border-[#D1D0C8] bg-white text-[#59615B] hover:bg-[#F3EEE6] disabled:cursor-not-allowed disabled:opacity-25"
      >
        <ArrowUp className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={index === total - 1}
        aria-label={`${label || `${index + 1}번째 선택지`} 아래로 이동`}
        title="고객 화면에서 한 칸 아래로 이동"
        className="inline-flex size-10 items-center justify-center border border-[#D1D0C8] bg-white text-[#59615B] hover:bg-[#F3EEE6] disabled:cursor-not-allowed disabled:opacity-25"
      >
        <ArrowDown className="size-4" />
      </button>
    </div>
  );
}

export default function AdminSurveyPage() {
  // 화면은 로컬 드래프트(questions/rules)만 편집한다. 편집 단위로 자동 저장하지 않고(=드리프트 원인)
  // "설정 저장" 버튼으로 드래프트 전체를 한 번에 PUT /api/admin/survey 로 올린다.
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [rules, setRules] = useState<SurveyResultRule[]>([]);
  const [resultContent, setResultContent] = useState<SurveyResultContent>(defaultSurveyResultContent);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<SurveyQuestion | null>(null);
  const [editingRule, setEditingRule] = useState<SurveyResultRule | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Partial<SurveyQuestion>>(newQuestionDraft);
  const [newRule, setNewRule] = useState<SurveyResultRule>(EMPTY_RULE);
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
    getAdminSurveyConfig()
      .then((config) => {
        if (cancelled) return;
        setQuestions(config.questions);
        setRules(config.rules);
        setResultContent(config.resultContent);
        setLoadError(false);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = () => {
    // 로드 완료 전엔 저장을 막는다 — 렌더 게이트(아래 `if (loading) return`)가 저장 버튼 자체를
    // 이미 가려서 실사용 경로로는 못 타지만, 서버 검증(isSurveyConfig)에만 기대지 않고 일관된
    // 방어를 남긴다(전수조사 A-3, 다른 3개 화면과 동일 패턴).
    if (loading) return;
    if (!isValidSurveyConfig({ questions, rules, resultContent })) {
      alert('저장할 수 없습니다. 모든 질문에 질문 내용과 1개 이상의 답을 입력하고, 모든 결과에 안내 문구를 입력했는지 확인해주세요. 삭제된 질문·답을 가리키는 결과 규칙도 없어야 합니다.');
      return;
    }
    setSaving(true);
    saveSurveyConfig({ questions, rules, resultContent }).then(({ ok }) => {
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
    if (questions.length === 1) {
      alert('진단 질문은 최소 1개가 필요합니다. 다른 질문을 먼저 등록해주세요.');
      return;
    }
    const linkedRules = rules.filter((rule) => ruleConditionBinding(rule).questionId === id);
    if (linkedRules.length > 0) {
      alert(`이 질문을 사용하는 결과 규칙이 ${linkedRules.length}개 있습니다. 결과 규칙의 조건을 먼저 바꿔주세요.`);
      return;
    }
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const handleDeleteRule = (id: string) => {
    if (rules.length === 1) {
      alert('진단 결과는 최소 1개가 필요합니다. 다른 결과 규칙을 먼저 등록해주세요.');
      return;
    }
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      setRules(rules.filter(r => r.id !== id));
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-sm text-[#6F766F]">진단 설정을 불러오는 중…</div>;
  }
  if (loadError) {
    return <div role="alert" className="border border-[#DFC8C4] bg-[#F7ECEA] p-6 text-sm leading-6 text-[#8B3E38]">진단 설정을 불러오지 못해 편집과 저장을 막았습니다. 새로고침 후 다시 시도해주세요.</div>;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="맞춤 진단 설계"
        description="진단 문항과 추천 규칙을 함께 구성합니다. 편집한 내용은 검토 후 한 번에 저장됩니다."
        actions={<><button onClick={() => { setNewQuestion(newQuestionDraft()); setIsAddingQuestion(true); }} className="min-h-11 border border-[#E7E0D5] bg-white px-5 text-sm font-semibold text-[#17211D] hover:bg-[#F3EEE6]">문항 추가</button><button onClick={handleSave} disabled={saving} className="min-h-11 bg-[#17211D] px-5 text-sm font-semibold text-white hover:bg-[#202521] disabled:opacity-50">{saving ? '저장 중…' : '설정 저장'}</button></>}
      />

      <section className="border border-[#E7E0D5] bg-white p-6">
        <h2 className="text-lg font-semibold text-[#17211D]">진단 결과 화면 공통 문구</h2>
        <p className="mt-2 text-sm leading-6 text-[#6F766F]">고객 화면 /diagnosis/result의 큰 제목·탭·추천 영역·연계 안내에 그대로 표시됩니다. 줄바꿈이 필요한 문구는 Enter를 사용하세요.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {([
            ['heroEyebrow', '결과 화면 작은 제목'],
            ['heroTitle', '결과 화면 큰 제목'],
            ['brandTabLabel', '추천 브랜드 탭 이름'],
            ['productTabLabel', '맞춤 상품 탭 이름'],
            ['careTabLabel', '연계 케어 탭 이름'],
            ['brandSectionTitle', '추천 브랜드 영역 제목'],
            ['brandSectionDescription', '추천 브랜드 영역 설명'],
            ['productSectionTitle', '맞춤 상품 영역 제목'],
            ['productSectionDescription', '맞춤 상품 영역 설명'],
            ['insuranceTitle', '보험 안내 제목'],
            ['insuranceDescription', '보험 안내 설명'],
            ['insuranceLinkLabel', '보험 안내 버튼 이름'],
            ['kitTitle', '케어키트 안내 제목'],
            ['kitDescription', '케어키트 안내 설명'],
            ['kitLinkLabel', '케어키트 버튼 이름'],
            ['noResultMessage', '결과가 없을 때 안내'],
            ['retryLabel', '진단 다시 하기 버튼 이름'],
            ['shopLabel', '스토어 보기 버튼 이름'],
          ] as Array<[keyof SurveyResultContent, string]>).map(([key, label]) => (
            <label key={key} className={key.endsWith('Description') || key === 'heroTitle' || key === 'noResultMessage' ? 'block sm:col-span-2' : 'block'}>
              <span className="block text-xs font-semibold text-[#59615B]">{label}</span>
              {key.endsWith('Description') || key === 'heroTitle' || key === 'noResultMessage' ? (
                <textarea value={resultContent[key]} onChange={(event) => setResultContent((previous) => ({ ...previous, [key]: event.target.value }))} rows={3} className="mt-2 w-full border border-[#D1D0C8] bg-white px-3 py-2.5 text-sm leading-6" />
              ) : (
                <input value={resultContent[key]} onChange={(event) => setResultContent((previous) => ({ ...previous, [key]: event.target.value }))} className="mt-2 min-h-11 w-full border border-[#D1D0C8] bg-white px-3 text-sm" />
              )}
            </label>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border border-[#E7E0D5] bg-white p-6">
          <h2 className="mb-6 text-lg font-semibold text-[#17211D]">진단 문항</h2>
          <div className="space-y-4">
            {paginatedQuestions.map(q => {
              const index = questions.findIndex((item) => item.id === q.id);
              return (
              <div key={q.id} className="border border-[#E7E0D5] bg-[#FAF8F3] p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-[#17211D]">{q.title}</h3>
                  <div className="flex gap-2 items-center">
                    <button type="button" onClick={() => setQuestions(moveAt(questions, index, -1))} disabled={index === 0} aria-label={`${q.title} 위로 이동`} className="p-1 text-[#59615B] disabled:opacity-25"><ArrowUp className="size-4" /></button>
                    <button type="button" onClick={() => setQuestions(moveAt(questions, index, 1))} disabled={index === questions.length - 1} aria-label={`${q.title} 아래로 이동`} className="p-1 text-[#59615B] disabled:opacity-25"><ArrowDown className="size-4" /></button>
                    <span className="border border-[#E7E0D5] bg-white px-2 py-1 text-xs text-[#59615B]">{q.type === 'single' ? '단일 선택' : '다중 선택'}</span>
                    <button onClick={() => setEditingQuestion(q)} className="text-xs text-[#2F3B34] hover:underline">수정</button>
                    <button onClick={() => handleDeleteQuestion(q.id)} className="text-xs text-[#9E3939] hover:underline">삭제</button>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-[#59615B]">
                  {q.options.map(o => (
                    <div key={o.id} className="flex gap-2">
                      <span className="text-gray-400">-</span> {o.label}
                    </div>
                  ))}
                </div>
              </div>
              );
            })}
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
            <button onClick={() => { setNewRule({ ...EMPTY_RULE, condition: {}, recommendation: { ...EMPTY_RECOMMENDATION } }); setIsAddingRule(true); }} className="border border-[#E7E0D5] bg-white px-3 py-2 text-xs font-semibold text-[#59615B] hover:bg-[#F3EEE6]">규칙 추가</button>
          </div>
          <div className="space-y-4">
            {paginatedRules.map(r => {
              const index = rules.findIndex((item) => item.id === r.id);
              return (
              <div key={r.id} className="border border-[#E7E0D5] bg-[#FAF8F3] p-4">
                <div className="mb-3 border-b border-[#E7E0D5] pb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-[#2F3B34] block">이 결과가 나오는 조건</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setRules(moveAt(rules, index, -1))} disabled={index === 0} aria-label="결과 규칙 위로 이동" className="p-1 text-[#59615B] disabled:opacity-25"><ArrowUp className="size-4" /></button>
                      <button type="button" onClick={() => setRules(moveAt(rules, index, 1))} disabled={index === rules.length - 1} aria-label="결과 규칙 아래로 이동" className="p-1 text-[#59615B] disabled:opacity-25"><ArrowDown className="size-4" /></button>
                      <button onClick={() => setEditingRule(r)} className="text-xs text-[#2F3B34] hover:underline">수정</button>
                      <button onClick={() => handleDeleteRule(r.id)} className="text-xs text-[#9E3939] hover:underline">삭제</button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-800">
                    {conditionLabel(r, questions)}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#2F3B34] block mb-1">고객에게 보여줄 결과</span>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div><span className="text-gray-400">방향:</span> {r.recommendation.direction}</div>
                    <div><span className="text-gray-400">브랜드:</span> {r.recommendation.brandIds.map((id) => brandOptions.find((option) => option.id === id)?.label ?? id).join(', ') || '없음'}</div>
                    <div><span className="text-gray-400">상품:</span> {r.recommendation.productIds.map((id) => productOptions.find((option) => option.id === id)?.label ?? id).join(', ') || '없음'}</div>
                    <div><span className="text-gray-400">연계 안내:</span> {[r.recommendation.needInsuranceAnalysis && '보험 분석', r.recommendation.recommendKit && '케어키트'].filter(Boolean).join(', ') || '없음'}</div>
                  </div>
                </div>
              </div>
              );
            })}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingQuestion(null)}>
          <div
            className="w-full max-w-2xl bg-[#F8F7F2] shadow-xl relative max-h-[90dvh] overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="진단 문항 수정"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#2F3B34] text-white flex justify-between items-center p-5 shrink-0">
              <h2 className="text-lg font-semibold">진단 문항 수정</h2>
              <button onClick={() => setEditingQuestion(null)} className="inline-flex min-h-11 items-center justify-center p-1 hover:bg-white/20 rounded">
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
                  <div>
                    <span className="block text-xs font-medium text-[#59615B]">선택지 관리</span>
                    <span className="mt-1 block text-[11px] leading-5 text-[#8A918B]">위·아래 버튼으로 정한 순서가 고객 진단 화면에 그대로 표시됩니다.</span>
                  </div>
                  <button type="button" onClick={() => setEditingQuestion({...editingQuestion, options: [...(editingQuestion.options || []), newSurveyOption()]})} className="inline-flex min-h-11 items-center border px-3 text-xs hover:bg-gray-50">+ 선택지 추가</button>
                </div>
                <div className="space-y-2">
                  {editingQuestion.options?.map((opt, i) => (
                    <div key={opt.id} className="flex items-center gap-2 border border-[#E7E0D5] bg-white p-2">
                      <span className="inline-flex size-7 shrink-0 items-center justify-center bg-[#F3EEE6] text-xs font-bold text-[#59615B]">{i + 1}</span>
                      <input className="min-h-10 flex-1 border px-2 py-1 text-sm" placeholder="고객에게 보일 답변" value={opt.label} onChange={(e) => {
                        const newOptions = [...(editingQuestion.options || [])];
                        newOptions[i] = { ...opt, label: e.target.value };
                        setEditingQuestion({...editingQuestion, options: newOptions});
                      }} />
                      <SelectionOrderButtons
                        label={opt.label}
                        index={i}
                        total={editingQuestion.options.length}
                        onMove={(direction) => setEditingQuestion({
                          ...editingQuestion,
                          options: moveAt(editingQuestion.options, i, direction),
                        })}
                      />
                      <button type="button" onClick={() => {
                        const linked = rules.some((rule) => {
                          const binding = ruleConditionBinding(rule);
                          return binding.questionId === editingQuestion.id && binding.optionValue === opt.value;
                        });
                        if (linked) {
                          alert('이 답변을 사용하는 결과 규칙이 있습니다. 결과 규칙의 조건을 먼저 바꿔주세요.');
                          return;
                        }
                        if (editingQuestion.options.length === 1) {
                          alert('답변 선택지는 최소 1개가 필요합니다.');
                          return;
                        }
                        setEditingQuestion({...editingQuestion, options: editingQuestion.options.filter(o => o.id !== opt.id)});
                      }} className="inline-flex min-h-10 shrink-0 items-center px-2 text-xs text-red-500 hover:text-red-700">삭제</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-[#D1D0C8] bg-white p-5 flex justify-end gap-3 shrink-0">
              <button onClick={() => setEditingQuestion(null)} className="min-h-11 border border-[#D1D0C8] px-5 text-sm font-semibold text-[#59615B] hover:bg-[#F8F7F2]">취소</button>
              <button onClick={() => {
                const message = questionDraftError(editingQuestion);
                if (message) {
                  alert(message);
                  return;
                }
                setQuestions(questions.map(q => q.id === editingQuestion.id ? editingQuestion : q));
                setEditingQuestion(null);
              }} className="min-h-11 bg-[#2F3B34] px-8 text-sm font-semibold text-white hover:bg-[#1f2823]">수정 저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 룰 수정 모달 */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingRule(null)}>
          <div
            className="w-full max-w-2xl bg-[#F8F7F2] shadow-xl relative max-h-[90dvh] overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="매핑 룰 수정"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#2F3B34] text-white flex justify-between items-center p-5 shrink-0">
              <h2 className="text-lg font-semibold">매핑 룰 수정</h2>
              <button onClick={() => setEditingRule(null)} className="inline-flex min-h-11 items-center justify-center p-1 hover:bg-white/20 rounded">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <RuleConditionEditor rule={editingRule} questions={questions} onChange={setEditingRule} />
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
              <RuleCareOptions rule={editingRule} onChange={setEditingRule} />
            </div>
            <div className="border-t border-[#D1D0C8] bg-white p-5 flex justify-end gap-3 shrink-0">
              <button onClick={() => setEditingRule(null)} className="min-h-11 border border-[#D1D0C8] px-5 text-sm font-semibold text-[#59615B] hover:bg-[#F8F7F2]">취소</button>
              <button onClick={() => {
                const message = ruleDraftError(editingRule);
                if (message) {
                  alert(message);
                  return;
                }
                setRules(rules.map(r => r.id === editingRule.id ? editingRule : r));
                setEditingRule(null);
              }} className="min-h-11 bg-[#2F3B34] px-8 text-sm font-semibold text-white hover:bg-[#1f2823]">수정 저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 문항 추가 모달 */}
      {isAddingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsAddingQuestion(false)}>
          <div
            className="w-full max-w-2xl bg-[#F8F7F2] shadow-xl relative max-h-[90dvh] overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="진단 문항 추가"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#2F3B34] text-white flex justify-between items-center p-5 shrink-0">
              <h2 className="text-lg font-semibold">진단 문항 추가</h2>
              <button onClick={() => setIsAddingQuestion(false)} className="inline-flex min-h-11 items-center justify-center p-1 hover:bg-white/20 rounded">
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
                  <div>
                    <span className="block text-xs font-medium text-[#59615B]">선택지 관리</span>
                    <span className="mt-1 block text-[11px] leading-5 text-[#8A918B]">위·아래 버튼으로 정한 순서가 고객 진단 화면에 그대로 표시됩니다.</span>
                  </div>
                  <button type="button" onClick={() => setNewQuestion({...newQuestion, options: [...(newQuestion.options || []), newSurveyOption()]})} className="inline-flex min-h-11 items-center border px-3 text-xs hover:bg-gray-50">+ 선택지 추가</button>
                </div>
                <div className="space-y-2">
                  {newQuestion.options?.map((opt, i) => (
                    <div key={opt.id} className="flex items-center gap-2 border border-[#E7E0D5] bg-white p-2">
                      <span className="inline-flex size-7 shrink-0 items-center justify-center bg-[#F3EEE6] text-xs font-bold text-[#59615B]">{i + 1}</span>
                      <input className="min-h-10 flex-1 border px-2 py-1 text-sm" placeholder="고객에게 보일 답변" value={opt.label} onChange={(e) => {
                        const newOptions = [...(newQuestion.options || [])];
                        newOptions[i] = { ...opt, label: e.target.value };
                        setNewQuestion({...newQuestion, options: newOptions});
                      }} />
                      <SelectionOrderButtons
                        label={opt.label}
                        index={i}
                        total={newQuestion.options?.length ?? 0}
                        onMove={(direction) => setNewQuestion({
                          ...newQuestion,
                          options: moveAt(newQuestion.options ?? [], i, direction),
                        })}
                      />
                      <button type="button" onClick={() => setNewQuestion({...newQuestion, options: newQuestion.options?.filter(o => o.id !== opt.id)})} className="inline-flex min-h-10 shrink-0 items-center px-2 text-xs text-red-500 hover:text-red-700">삭제</button>
                    </div>
                  ))}
                  {(!newQuestion.options || newQuestion.options.length === 0) && <div className="text-xs text-gray-400">등록된 선택지가 없습니다.</div>}
                </div>
              </div>
            </div>
            <div className="border-t border-[#D1D0C8] bg-white p-5 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsAddingQuestion(false)} className="min-h-11 border border-[#D1D0C8] px-5 text-sm font-semibold text-[#59615B] hover:bg-[#F8F7F2]">취소</button>
              <button onClick={() => {
                const message = questionDraftError(newQuestion);
                if (message) {
                  alert(message);
                  return;
                }
                const questionToAdd = {
                  id: `q${Date.now()}`,
                  title: newQuestion.title!.trim(),
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsAddingRule(false)}>
          <div
            className="w-full max-w-2xl bg-[#F8F7F2] shadow-xl relative max-h-[90dvh] overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="매핑 룰 추가"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#2F3B34] text-white flex justify-between items-center p-5 shrink-0">
              <h2 className="text-lg font-semibold">매핑 룰 추가</h2>
              <button onClick={() => setIsAddingRule(false)} className="inline-flex min-h-11 items-center justify-center p-1 hover:bg-white/20 rounded">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <RuleConditionEditor rule={newRule} questions={questions} onChange={setNewRule} />
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
              <RuleCareOptions rule={newRule} onChange={setNewRule} />
            </div>
            <div className="border-t border-[#D1D0C8] bg-white p-5 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsAddingRule(false)} className="min-h-11 border border-[#D1D0C8] px-5 text-sm font-semibold text-[#59615B] hover:bg-[#F8F7F2]">취소</button>
              <button onClick={() => {
                const message = ruleDraftError(newRule);
                if (message) {
                  alert(message);
                  return;
                }
                const ruleToAdd: SurveyResultRule = {
                  id: `r${Date.now()}`,
                  condition: newRule.condition,
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

function RuleConditionEditor({
  rule,
  questions,
  onChange,
}: {
  rule: SurveyResultRule;
  questions: SurveyQuestion[];
  onChange: (rule: SurveyResultRule) => void;
}) {
  const binding = ruleConditionBinding(rule);
  const selectedQuestion = questions.find((question) => question.id === binding.questionId);

  return (
    <div className="rounded border border-[#D8D6CE] bg-white p-4">
      <p className="mb-3 text-xs font-semibold text-[#2F3B34]">이 결과가 나오는 조건</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-xs font-medium text-[#59615B]">
          고객이 답한 질문
          <select
            className="mt-2 w-full border border-[#D1D0C8] bg-white px-3 py-2.5 text-sm"
            value={binding.questionId}
            onChange={(event) => {
              const question = questions.find((item) => item.id === event.target.value);
              onChange(withRuleCondition(rule, event.target.value, question?.options[0]?.value ?? ''));
            }}
          >
            <option value="">조건 없음(기본 결과)</option>
            {questions.map((question) => (
              <option key={question.id} value={question.id}>{question.title}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-[#59615B]">
          이 답을 골랐을 때
          <select
            className="mt-2 w-full border border-[#D1D0C8] bg-white px-3 py-2.5 text-sm disabled:bg-gray-100"
            value={binding.optionValue}
            disabled={!selectedQuestion}
            onChange={(event) => onChange(withRuleCondition(rule, binding.questionId, event.target.value))}
          >
            {!selectedQuestion && <option value="">먼저 질문을 선택하세요</option>}
            {selectedQuestion?.options.map((option) => (
              <option key={option.id} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
      {!binding.questionId && (
        <p className="mt-3 text-[12px] leading-5 text-[#8A5A23]">조건 없음은 다른 규칙이 맞지 않을 때 보여줄 기본 결과입니다. 목록의 마지막에 두세요.</p>
      )}
    </div>
  );
}

function RuleCareOptions({
  rule,
  onChange,
}: {
  rule: SurveyResultRule;
  onChange: (rule: SurveyResultRule) => void;
}) {
  const setRecommendation = (patch: Partial<SurveyResultRule['recommendation']>) =>
    onChange({ ...rule, recommendation: { ...rule.recommendation, ...patch } });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="flex items-start gap-3 border border-[#D1D0C8] bg-white p-3 text-sm text-[#2F3B34]">
        <input type="checkbox" checked={rule.recommendation.needInsuranceAnalysis} onChange={(event) => setRecommendation({ needInsuranceAnalysis: event.target.checked })} className="mt-0.5 size-4" />
        <span><strong className="block">보험 분석 안내 표시</strong><span className="mt-1 block text-xs text-[#6F766F]">결과의 ‘연계 케어’에 보험 안내 카드를 표시합니다.</span></span>
      </label>
      <label className="flex items-start gap-3 border border-[#D1D0C8] bg-white p-3 text-sm text-[#2F3B34]">
        <input type="checkbox" checked={rule.recommendation.recommendKit} onChange={(event) => setRecommendation({ recommendKit: event.target.checked })} className="mt-0.5 size-4" />
        <span><strong className="block">케어키트 안내 표시</strong><span className="mt-1 block text-xs text-[#6F766F]">결과의 ‘연계 케어’에 케어키트 카드를 표시합니다.</span></span>
      </label>
    </div>
  );
}
