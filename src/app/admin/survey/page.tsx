'use client';

import { surveyQuestions, surveyResultRules } from '@/data/survey';

export default function AdminSurveyPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">맞춤 진단 관리</h1>
        <button className="bg-[#2F3B34] text-white px-4 py-2 text-sm font-semibold rounded-sm">문항 추가</button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">설문 문항 관리</h2>
          <div className="space-y-4">
            {surveyQuestions.map(q => (
              <div key={q.id} className="border border-gray-100 bg-gray-50 p-4 rounded-sm">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{q.title}</h3>
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">{q.type === 'single' ? '단일 선택' : '다중 선택'}</span>
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
        </div>

        <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">결과 매핑 룰</h2>
            <button className="border border-gray-300 text-gray-600 px-3 py-1.5 text-xs font-semibold rounded-sm">룰 추가</button>
          </div>
          <div className="space-y-4">
            {surveyResultRules.map(r => (
              <div key={r.id} className="border border-gray-100 bg-gray-50 p-4 rounded-sm">
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <span className="text-xs font-semibold text-[#2F3B34] uppercase tracking-wider block mb-1">Condition</span>
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
        </div>
      </div>
    </div>
  );
}
